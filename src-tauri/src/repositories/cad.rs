use crate::models::{
  CadDocumentCreateInput, CadDocumentSummary, CadLayerCount, CadParseSummary, CadPipelineStats,
};
use crate::repositories::projects;
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use dxf::Drawing;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const CAD_PENDING_STATUS: &str = "待识别";
const CAD_COMPLETED_STATUS: &str = "已完成";
const CAD_FAILED_STATUS: &str = "识别失败";

#[derive(Debug)]
struct CadDocumentBase {
  id: String,
  project_id: Option<String>,
  project_no: Option<String>,
  customer_name: Option<String>,
  original_file_name: String,
  source_type: String,
  source_path: String,
  storage_path: String,
  file_size_bytes: i64,
  status: String,
  note: String,
  created_at: String,
  updated_at: String,
}

#[derive(Debug)]
struct LatestCadJob {
  status: String,
  output_summary: Option<String>,
}

fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

fn trim_non_empty(value: &str) -> Option<String> {
  let trimmed = value.trim();
  if trimmed.is_empty() {
    None
  } else {
    Some(trimmed.to_string())
  }
}

fn source_type_from_path(source_type: &str, source_path: &Path) -> String {
  let explicit = source_type.trim();
  if !explicit.is_empty() {
    return explicit.to_uppercase();
  }

  source_path
    .extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| extension.trim().to_uppercase())
    .filter(|extension| !extension.is_empty())
    .unwrap_or_else(|| "OTHER".to_string())
}

fn extension_for_source_type(source_type: &str, source_path: &Path) -> String {
  match source_type.to_uppercase().as_str() {
    "DWG" => ".dwg".to_string(),
    "DXF" => ".dxf".to_string(),
    "PDF" => ".pdf".to_string(),
    "PNG" => ".png".to_string(),
    "JPG" | "JPEG" => ".jpg".to_string(),
    "SVG" => ".svg".to_string(),
    _ => source_path
      .extension()
      .and_then(|extension| extension.to_str())
      .map(|extension| format!(".{}", extension.trim_start_matches('.')))
      .unwrap_or_else(|| ".cad".to_string()),
  }
}

fn is_dxf_document(source_type: &str, source_path: &Path) -> bool {
  source_type.trim().eq_ignore_ascii_case("DXF")
    || source_path
      .extension()
      .and_then(|extension| extension.to_str())
      .map(|extension| extension.eq_ignore_ascii_case("dxf"))
      .unwrap_or(false)
}

fn classify_entity_kind(raw_kind: &str) -> &'static str {
  let kind = raw_kind.to_ascii_lowercase();

  if kind.contains("lwpolyline") || kind.contains("polyline") {
    "polyline"
  } else if kind.contains("mtext") || kind.contains("text") {
    "text"
  } else if kind.contains("insert") {
    "insert"
  } else if kind.contains("circle") {
    "circle"
  } else if kind.contains("line") {
    "line"
  } else {
    "other"
  }
}

fn build_parse_summary(document_id: &str, source_type: &str, drawing: &Drawing) -> CadParseSummary {
  let mut entity_count = 0_i64;
  let mut line_count = 0_i64;
  let mut circle_count = 0_i64;
  let mut polyline_count = 0_i64;
  let mut text_count = 0_i64;
  let mut insert_count = 0_i64;
  let mut other_count = 0_i64;
  let mut layer_counts: HashMap<String, i64> = HashMap::new();

  for entity in drawing.entities() {
    entity_count += 1;
    let layer_name = entity.common.layer.clone();
    *layer_counts.entry(layer_name).or_insert(0) += 1;

    match classify_entity_kind(&format!("{:?}", &entity.specific)) {
      "line" => line_count += 1,
      "circle" => circle_count += 1,
      "polyline" => polyline_count += 1,
      "text" => text_count += 1,
      "insert" => insert_count += 1,
      _ => other_count += 1,
    }
  }

  let mut top_layers: Vec<CadLayerCount> = layer_counts
    .into_iter()
    .map(|(layer_name, entity_count)| CadLayerCount { layer_name, entity_count })
    .collect();
  let layer_count = top_layers.len() as i64;
  top_layers.sort_by(|left, right| {
    right
      .entity_count
      .cmp(&left.entity_count)
      .then_with(|| left.layer_name.cmp(&right.layer_name))
  });
  top_layers.truncate(10);

  CadParseSummary {
    document_id: document_id.to_string(),
    parser_name: "dxf-crate".to_string(),
    source_type: source_type.to_string(),
    entity_count,
    layer_count,
    line_count,
    circle_count,
    polyline_count,
    text_count,
    insert_count,
    other_count,
    top_layers,
    generated_at: now_iso(),
  }
}

fn record_analysis_job(
  connection: &mut Connection,
  document_id: &str,
  status: &str,
  job_type: &str,
  input_summary: String,
  output_summary: String,
  error_message: String,
) -> Result<()> {
  let now = now_iso();
  let transaction = connection.transaction().context("start cad analysis transaction")?;

  transaction
    .execute(
      "UPDATE cad_documents SET status = ?, updated_at = ? WHERE id = ?",
      params![status, now, document_id],
    )
    .context("update cad document status")?;

  transaction
    .execute(
      r#"
      INSERT INTO cad_analysis_jobs (
        id, cad_document_id, job_type, status, input_summary, output_summary, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
      params![
        Uuid::new_v4().to_string(),
        document_id,
        job_type,
        status,
        input_summary,
        output_summary,
        error_message,
        now,
        now,
      ],
    )
    .context("insert cad analysis job")?;

  transaction.commit().context("commit cad analysis transaction")?;
  Ok(())
}

fn ensure_cad_dir(upload_dir: &Path) -> Result<PathBuf> {
  let cad_dir = upload_dir.join("cad");
  fs::create_dir_all(&cad_dir).context("create cad upload directory")?;
  Ok(cad_dir)
}

fn row_to_base(row: &rusqlite::Row<'_>) -> rusqlite::Result<CadDocumentBase> {
  Ok(CadDocumentBase {
    id: row.get("id")?,
    project_id: row.get("project_id")?,
    project_no: row.get("project_no")?,
    customer_name: row.get("customer_name")?,
    original_file_name: row.get("original_file_name")?,
    source_type: row.get("source_type")?,
    source_path: row.get("source_path")?,
    storage_path: row.get("storage_path")?,
    file_size_bytes: row.get("file_size_bytes")?,
    status: row.get("status")?,
    note: row.get("note")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

fn enrich_document(connection: &Connection, base: CadDocumentBase) -> Result<CadDocumentSummary> {
  let analysis_job_count: i64 = connection
    .query_row(
      "SELECT COUNT(*) FROM cad_analysis_jobs WHERE cad_document_id = ?",
      params![base.id.as_str()],
      |row| row.get(0),
    )
    .context("count cad analysis jobs")?;

  let latest_job = connection
    .query_row(
      r#"
      SELECT status, output_summary
      FROM cad_analysis_jobs
      WHERE cad_document_id = ?
      ORDER BY created_at DESC, updated_at DESC
      LIMIT 1
      "#,
      params![base.id.as_str()],
      |row| {
        Ok(LatestCadJob {
          status: row.get(0)?,
          output_summary: row.get(1)?,
        })
      },
    )
    .optional()
    .context("load latest cad job")?;

  let latest_parse_summary = latest_job
    .as_ref()
    .and_then(|job| job.output_summary.as_ref())
    .and_then(|summary| serde_json::from_str::<CadParseSummary>(summary).ok());
  let latest_job_status = latest_job.as_ref().map(|job| job.status.clone());

  Ok(CadDocumentSummary {
    id: base.id,
    project_id: base.project_id,
    project_no: base.project_no,
    customer_name: base.customer_name,
    original_file_name: base.original_file_name,
    source_type: base.source_type,
    source_path: base.source_path,
    storage_path: base.storage_path,
    file_size_bytes: base.file_size_bytes,
    status: base.status,
    analysis_job_count,
    latest_job_status,
    latest_parse_summary,
    note: base.note,
    created_at: base.created_at,
    updated_at: base.updated_at,
  })
}

fn get_document_base(connection: &Connection, id: &str) -> Result<Option<CadDocumentBase>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        d.id,
        d.project_id,
        p.project_no,
        p.customer_name,
        d.original_file_name,
        d.source_type,
        d.source_path,
        d.storage_path,
        d.file_size_bytes,
        d.status,
        d.note,
        d.created_at,
        d.updated_at
      FROM cad_documents d
      LEFT JOIN projects p ON p.id = d.project_id
      WHERE d.id = ?
      "#,
    )
    .context("prepare cad document detail query")?;

  match statement.query_row(params![id], row_to_base) {
    Ok(base) => Ok(Some(base)),
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
    Err(error) => Err(anyhow::Error::new(error).context("load cad document")),
  }
}

fn build_document_input_summary(base: &CadDocumentBase) -> String {
  serde_json::json!({
    "projectId": base.project_id,
    "sourcePath": base.source_path,
    "sourceType": base.source_type,
    "originalFileName": base.original_file_name,
  })
  .to_string()
}

pub fn list_cad_documents(connection: &Connection) -> Result<Vec<CadDocumentSummary>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        d.id,
        d.project_id,
        p.project_no,
        p.customer_name,
        d.original_file_name,
        d.source_type,
        d.source_path,
        d.storage_path,
        d.file_size_bytes,
        d.status,
        d.note,
        d.created_at,
        d.updated_at
      FROM cad_documents d
      LEFT JOIN projects p ON p.id = d.project_id
      ORDER BY d.updated_at DESC
      "#,
    )
    .context("prepare cad document list query")?;

  let rows = statement
    .query_map([], row_to_base)
    .context("query cad documents")?;

  let mut documents = Vec::new();
  for row in rows {
    let base = row.context("map cad document row")?;
    documents.push(enrich_document(connection, base)?);
  }

  Ok(documents)
}

pub fn create_cad_document(
  connection: &mut Connection,
  upload_dir: &Path,
  input: &CadDocumentCreateInput,
) -> Result<CadDocumentSummary> {
  let source_path = Path::new(input.source_path.trim());
  if source_path.as_os_str().is_empty() {
    return Err(anyhow!("请输入 CAD 文件路径。"));
  }
  if !source_path.exists() {
    return Err(anyhow!("CAD 文件不存在，请确认路径是否正确。"));
  }

  let project_id = trim_non_empty(input.project_id.as_deref().unwrap_or(""));
  if let Some(ref project_id) = project_id {
    if projects::get_project(connection, project_id)?.is_none() {
      return Err(anyhow!("关联项目不存在，请先创建项目再登记 CAD 文件。"));
    }
  }

  let source_type = source_type_from_path(&input.source_type, source_path);
  let original_file_name = source_path
    .file_name()
    .and_then(|file_name| file_name.to_str())
    .ok_or_else(|| anyhow!("无法识别 CAD 文件名。"))?
    .to_string();
  let file_size_bytes = fs::metadata(source_path)
    .context("read cad source metadata")?
    .len() as i64;
  let cad_dir = ensure_cad_dir(upload_dir)?;
  let document_id = Uuid::new_v4().to_string();
  let storage_path = cad_dir.join(format!("{document_id}{}", extension_for_source_type(&source_type, source_path)));
  fs::copy(source_path, &storage_path).context("copy cad source file")?;

  let now = now_iso();
  let transaction = connection.transaction().context("start cad document transaction")?;

  let transaction_result = (|| -> Result<()> {
    transaction
      .execute(
        r#"
        INSERT INTO cad_documents (
          id, project_id, original_file_name, source_type, source_path, storage_path, file_size_bytes,
          status, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
          document_id,
          project_id,
          original_file_name,
          source_type,
          source_path.to_string_lossy().to_string(),
          storage_path.to_string_lossy().to_string(),
          file_size_bytes,
          CAD_PENDING_STATUS,
          input.note.trim(),
          now,
          now,
        ],
      )
      .context("insert cad document")?;

    transaction.commit().context("commit cad document transaction")?;
    Ok(())
  })();

  if let Err(error) = transaction_result {
    let _ = fs::remove_file(&storage_path);
    return Err(error);
  }

  get_document_base(connection, &document_id)?
    .map(|base| enrich_document(connection, base))
    .transpose()?
    .ok_or_else(|| anyhow!("登记 CAD 文件失败。"))
}

pub fn parse_cad_document(connection: &mut Connection, id: &str) -> Result<CadParseSummary> {
  let base = get_document_base(connection, id)?
    .ok_or_else(|| anyhow!("CAD 文件不存在，无法解析。"))?;

  if !is_dxf_document(&base.source_type, Path::new(&base.storage_path)) {
    return Err(anyhow!("当前仅支持 DXF 文件解析。"));
  }

  let input_summary = build_document_input_summary(&base);
  match Drawing::load_file(&base.storage_path).context("load dxf file") {
    Ok(drawing) => {
      let summary = build_parse_summary(&base.id, &base.source_type, &drawing);
      let output_summary = serde_json::to_string(&summary).context("serialize cad parse summary")?;
      record_analysis_job(
        connection,
        &base.id,
        CAD_COMPLETED_STATUS,
        "dxf_parse",
        input_summary,
        output_summary,
        String::new(),
      )?;
      Ok(summary)
    }
    Err(error) => {
      let message = error.to_string();
      let _ = record_analysis_job(
        connection,
        &base.id,
        CAD_FAILED_STATUS,
        "dxf_parse",
        input_summary,
        String::new(),
        message.clone(),
      );
      Err(error).context("parse dxf file")
    }
  }
}

pub fn delete_cad_document(connection: &mut Connection, id: &str) -> Result<()> {
  let storage_path = connection
    .query_row(
      "SELECT storage_path FROM cad_documents WHERE id = ?",
      params![id],
      |row| row.get::<_, String>(0),
    )
    .optional()
    .context("load cad document for delete")?
    .ok_or_else(|| anyhow!("CAD 文件不存在，无法删除。"))?;

  let transaction = connection.transaction().context("start cad delete transaction")?;
  let affected = transaction
    .execute("DELETE FROM cad_documents WHERE id = ?", params![id])
    .context("delete cad document")?;
  transaction.commit().context("commit cad delete transaction")?;

  if affected == 0 {
    return Err(anyhow!("CAD 文件不存在，无法删除。"));
  }

  if fs::remove_file(&storage_path).is_err() {
    // 文件可能已被用户手动删除，保留数据库删除结果即可。
  }

  Ok(())
}

pub fn pipeline_stats(connection: &Connection) -> Result<CadPipelineStats> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        COUNT(*) AS total_documents,
        COALESCE(SUM(CASE WHEN status = '待识别' THEN 1 ELSE 0 END), 0) AS pending_documents,
        COALESCE(SUM(CASE WHEN status = '识别中' THEN 1 ELSE 0 END), 0) AS processing_documents,
        COALESCE(SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END), 0) AS completed_documents,
        COALESCE(SUM(CASE WHEN status = '识别失败' THEN 1 ELSE 0 END), 0) AS failed_documents,
        COALESCE(SUM(CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS linked_projects
      FROM cad_documents
      "#,
    )
    .context("prepare cad pipeline stats query")?;

  let stats = statement
    .query_row([], |row| {
      Ok(CadPipelineStats {
        total_documents: row.get("total_documents")?,
        pending_documents: row.get("pending_documents")?,
        processing_documents: row.get("processing_documents")?,
        completed_documents: row.get("completed_documents")?,
        failed_documents: row.get("failed_documents")?,
        linked_projects: row.get("linked_projects")?,
      })
    })
    .context("query cad pipeline stats")?;

  Ok(stats)
}
