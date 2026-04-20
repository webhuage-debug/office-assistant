use crate::models::{
  NodeEntrySummary, NodeImportBatchSummary, NodeImportInput, NodeListFilters, NodeOverviewStats, NodeTestRequest,
  NodeTestResultSummary, NodeTestRunDetail, NodeTestRunSummary,
};
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::Deserialize;
use std::convert::TryFrom;
use std::collections::HashSet;
use std::fs;
use std::net::{Shutdown, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use uuid::Uuid;

const DEFAULT_SOURCE_LABEL: &str = "手动导入";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeImportRowRaw {
  #[serde(alias = "name", alias = "node_name", alias = "nodeName", alias = "title")]
  node_name: Option<String>,
  #[serde(alias = "protocol", alias = "type")]
  protocol: Option<String>,
  #[serde(alias = "host", alias = "server", alias = "address")]
  host: Option<String>,
  #[serde(alias = "port")]
  port: Option<String>,
  #[serde(alias = "remark", alias = "note", alias = "remarks")]
  remark: Option<String>,
  #[serde(alias = "source_label", alias = "sourceLabel", alias = "group")]
  source_label: Option<String>,
}

#[derive(Debug, Clone)]
struct NormalizedNodeRow {
  node_name: String,
  protocol: String,
  host: String,
  port: i64,
  remark: String,
  source_label: String,
  dedupe_key: String,
}

fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

fn timestamp_slug() -> String {
  Utc::now().format("%Y%m%d-%H%M%S").to_string()
}

fn normalize_text(value: Option<String>) -> String {
  value.unwrap_or_default().trim().to_string()
}

fn normalize_source_label(value: Option<String>, fallback: &str) -> String {
  let trimmed = normalize_text(value);
  if trimmed.is_empty() {
    fallback.trim().to_string()
  } else {
    trimmed
  }
}

fn normalize_protocol(value: Option<String>) -> Result<String> {
  let protocol = normalize_text(value).to_uppercase();
  if protocol.is_empty() {
    return Err(anyhow!("节点协议不能为空。"));
  }
  Ok(protocol)
}

fn normalize_host(value: Option<String>) -> Result<String> {
  let mut host = normalize_text(value);
  if host.is_empty() {
    return Err(anyhow!("节点地址不能为空。"));
  }

  if let Some(rest) = host.strip_prefix("http://") {
    host = rest.to_string();
  } else if let Some(rest) = host.strip_prefix("https://") {
    host = rest.to_string();
  }

  if let Some((left, _)) = host.split_once('/') {
    host = left.to_string();
  }
  if let Some((left, _)) = host.split_once('?') {
    host = left.to_string();
  }

  let host = host.trim().trim_matches('/').to_string();
  if host.is_empty() {
    return Err(anyhow!("节点地址不能为空。"));
  }

  Ok(host)
}

fn parse_port(value: Option<String>) -> Result<i64> {
  let port_text = normalize_text(value);
  if port_text.is_empty() {
    return Err(anyhow!("节点端口不能为空。"));
  }

  let port = port_text
    .parse::<i64>()
    .with_context(|| format!("无法解析端口：{port_text}"))?;
  if !(1..=65535).contains(&port) {
    return Err(anyhow!("节点端口必须在 1 到 65535 之间。"));
  }

  Ok(port)
}

fn build_dedupe_key(protocol: &str, host: &str, port: i64) -> String {
  format!("{}|{}|{}", protocol.trim().to_lowercase(), host.trim().to_lowercase(), port)
}

fn normalize_row(raw: NodeImportRowRaw, fallback_source_label: &str) -> Result<NormalizedNodeRow> {
  let protocol = normalize_protocol(raw.protocol)?;
  let host = normalize_host(raw.host)?;
  let port = parse_port(raw.port)?;
  let node_name = {
    let value = normalize_text(raw.node_name);
    if value.is_empty() {
      format!("{protocol} {host}:{port}")
    } else {
      value
    }
  };
  let remark = normalize_text(raw.remark);
  let source_label = normalize_source_label(raw.source_label, fallback_source_label);
  let dedupe_key = build_dedupe_key(&protocol, &host, port);

  Ok(NormalizedNodeRow {
    node_name,
    protocol,
    host,
    port,
    remark,
    source_label,
    dedupe_key,
  })
}

fn source_type_from_path(source_path: &Path) -> Result<String> {
  let extension = source_path
    .extension()
    .and_then(|value| value.to_str())
    .map(|value| value.trim().to_lowercase())
    .unwrap_or_default();

  match extension.as_str() {
    "json" => Ok("JSON".to_string()),
    "csv" => Ok("CSV".to_string()),
    _ => Err(anyhow!("目前只支持 JSON / CSV 节点清单。")),
  }
}

fn ensure_node_dir(upload_dir: &Path) -> Result<PathBuf> {
  let node_dir = upload_dir.join("nodes");
  fs::create_dir_all(&node_dir).context("create node upload directory")?;
  Ok(node_dir)
}

fn parse_json_rows(content: &str) -> Result<Vec<NodeImportRowRaw>> {
  let trimmed = content.trim_start_matches('\u{feff}').trim();
  let value: serde_json::Value = serde_json::from_str(trimmed).context("parse node json file")?;

  if let Some(nodes) = value.get("nodes").or_else(|| value.get("items")).or_else(|| value.get("records")) {
    return serde_json::from_value::<Vec<NodeImportRowRaw>>(nodes.clone()).context("decode node json array");
  }

  if value.is_array() {
    return serde_json::from_value::<Vec<NodeImportRowRaw>>(value).context("decode node json rows");
  }

  Err(anyhow!("JSON 节点清单需要是数组，或者包含 nodes 字段。"))
}

fn parse_csv_rows(content: &str) -> Result<Vec<NodeImportRowRaw>> {
  let mut reader = csv::ReaderBuilder::new()
    .trim(csv::Trim::All)
    .from_reader(content.as_bytes());

  let mut rows = Vec::new();
  for record in reader.deserialize::<NodeImportRowRaw>() {
    rows.push(record.context("parse node csv row")?);
  }

  Ok(rows)
}

fn parse_source_rows(content: &str, source_type: &str) -> Result<Vec<NodeImportRowRaw>> {
  match source_type {
    "JSON" => parse_json_rows(content),
    "CSV" => parse_csv_rows(content),
    _ => Err(anyhow!("目前只支持 JSON / CSV 节点清单。")),
  }
}

fn normalize_rows(rows: Vec<NodeImportRowRaw>, fallback_source_label: &str) -> (Vec<NormalizedNodeRow>, i64) {
  let mut valid_rows = Vec::new();
  let mut invalid_rows = 0_i64;

  for raw in rows {
    match normalize_row(raw, fallback_source_label) {
      Ok(row) => valid_rows.push(row),
      Err(_) => invalid_rows += 1,
    }
  }

  (valid_rows, invalid_rows)
}

fn load_existing_dedupe_keys(connection: &Connection) -> Result<HashSet<String>> {
  let mut statement = connection
    .prepare("SELECT dedupe_key FROM node_entries")
    .context("prepare existing node dedupe query")?;

  let rows = statement
    .query_map([], |row| row.get::<_, String>(0))
    .context("query existing node dedupe keys")?;

  let mut keys = HashSet::new();
  for row in rows {
    keys.insert(row.context("map existing node dedupe key")?);
  }

  Ok(keys)
}

fn row_to_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeEntrySummary> {
  Ok(NodeEntrySummary {
    id: row.get("id")?,
    node_name: row.get("node_name")?,
    protocol: row.get("protocol")?,
    host: row.get("host")?,
    port: row.get("port")?,
    remark: row.get("remark")?,
    source_label: row.get("source_label")?,
    source_file_name: row.get::<_, Option<String>>("source_file_name")?.unwrap_or_default(),
    first_seen_batch_id: row.get("first_seen_batch_id")?,
    last_seen_batch_id: row.get("last_seen_batch_id")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

pub fn list_node_entries(connection: &Connection, filters: &NodeListFilters) -> Result<Vec<NodeEntrySummary>> {
  let mut query = String::from(
    r#"
    SELECT
      n.id,
      n.node_name,
      n.protocol,
      n.host,
      n.port,
      n.remark,
      n.source_label,
      b.source_file_name,
      n.first_seen_batch_id,
      n.last_seen_batch_id,
      n.created_at,
      n.updated_at
    FROM node_entries n
    LEFT JOIN node_import_batches b ON b.id = n.last_seen_batch_id
    WHERE 1 = 1
    "#,
  );

  let mut values: Vec<String> = Vec::new();

  if let Some(keyword) = filters
    .keyword
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    query.push_str(" AND (n.node_name LIKE ? OR n.host LIKE ? OR n.remark LIKE ? OR n.source_label LIKE ? OR b.source_file_name LIKE ?)");
    let value = format!("%{keyword}%");
    values.extend([value.clone(), value.clone(), value.clone(), value.clone(), value]);
  }

  if let Some(source_label) = filters
    .source_label
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    query.push_str(" AND n.source_label LIKE ?");
    values.push(format!("%{source_label}%"));
  }

  if let Some(protocol) = filters
    .protocol
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    query.push_str(" AND n.protocol LIKE ?");
    values.push(format!("%{protocol}%"));
  }

  query.push_str(" ORDER BY n.updated_at DESC, n.created_at DESC");

  let mut statement = connection.prepare(&query).context("prepare node list query")?;
  let rows = statement
    .query_map(params_from_iter(values.iter()), row_to_summary)
    .context("query node entries")?;

  let mut entries = Vec::new();
  for row in rows {
    entries.push(row.context("map node entry row")?);
  }

  Ok(entries)
}

pub fn import_node_entries(
  connection: &mut Connection,
  upload_dir: &Path,
  input: &NodeImportInput,
) -> Result<NodeImportBatchSummary> {
  let source_path = Path::new(input.source_path.trim());
  if source_path.as_os_str().is_empty() {
    return Err(anyhow!("请选择要导入的节点文件。"));
  }
  if !source_path.exists() {
    return Err(anyhow!("节点文件不存在，请检查路径是否正确。"));
  }

  let source_type = source_type_from_path(source_path)?;
  let source_file_name = source_path
    .file_name()
    .and_then(|value| value.to_str())
    .ok_or_else(|| anyhow!("无法识别节点文件名。"))?
    .to_string();
  let source_label = normalize_source_label(Some(input.source_label.clone()), DEFAULT_SOURCE_LABEL);

  let content = fs::read_to_string(source_path).context("read node import file")?;
  let raw_rows = parse_source_rows(&content, &source_type)?;
  let (valid_rows, invalid_rows) = normalize_rows(raw_rows, &source_label);
  if valid_rows.is_empty() {
    return Err(anyhow!("没有可导入的有效节点，请检查 JSON / CSV 内容。"));
  }

  let node_dir = ensure_node_dir(upload_dir)?;
  let batch_id = Uuid::new_v4().to_string();
  let copied_file_path = node_dir.join(format!("{}-{}-{}", timestamp_slug(), batch_id, source_file_name));
  fs::copy(source_path, &copied_file_path).context("copy node import file")?;

  let created_at = now_iso();
  let mut existing_keys = load_existing_dedupe_keys(connection)?;
  let mut seen_in_file = HashSet::new();
  let mut inserted_rows = 0_i64;
  let mut updated_rows = 0_i64;
  let mut duplicate_rows = 0_i64;
  let total_rows = (valid_rows.len() as i64) + invalid_rows;

  let import_result = (|| -> Result<NodeImportBatchSummary> {
    let transaction = connection.transaction().context("start node import transaction")?;

    transaction
      .execute(
        r#"
        INSERT INTO node_import_batches (
          id, source_file_name, source_file_path, copied_file_path, source_type, source_label,
          total_rows, inserted_rows, updated_rows, duplicate_rows, invalid_rows, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
          &batch_id,
          &source_file_name,
          source_path.to_string_lossy().to_string(),
          copied_file_path.to_string_lossy().to_string(),
          &source_type,
          &source_label,
          total_rows,
          0_i64,
          0_i64,
          0_i64,
          invalid_rows,
          &created_at,
          &created_at,
        ],
      )
      .context("insert node import batch")?;

    for row in valid_rows {
      if !seen_in_file.insert(row.dedupe_key.clone()) {
        duplicate_rows += 1;
        continue;
      }

      let is_update = existing_keys.contains(&row.dedupe_key);
      let node_id = if is_update {
        updated_rows += 1;
        existing_keys.insert(row.dedupe_key.clone());
        transaction
          .query_row(
            "SELECT id FROM node_entries WHERE dedupe_key = ?",
            params![row.dedupe_key.as_str()],
            |value| value.get::<_, String>(0),
          )
          .optional()
          .context("load existing node entry")?
          .unwrap_or_else(|| Uuid::new_v4().to_string())
      } else {
        inserted_rows += 1;
        let node_id = Uuid::new_v4().to_string();
        existing_keys.insert(row.dedupe_key.clone());
        node_id
      };

      transaction
        .execute(
          r#"
          INSERT INTO node_entries (
            id, node_name, protocol, host, port, remark, source_label, dedupe_key,
            first_seen_batch_id, last_seen_batch_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(dedupe_key) DO UPDATE SET
            node_name = excluded.node_name,
            protocol = excluded.protocol,
            host = excluded.host,
            port = excluded.port,
            remark = excluded.remark,
            source_label = excluded.source_label,
            last_seen_batch_id = excluded.last_seen_batch_id,
            updated_at = excluded.updated_at
          "#,
        params![
            node_id,
            row.node_name,
            row.protocol,
            row.host,
            row.port,
            row.remark,
            row.source_label,
            row.dedupe_key,
            &batch_id,
            &batch_id,
            &created_at,
            &created_at,
          ],
        )
        .context("upsert node entry")?;
    }

    transaction
      .execute(
        r#"
        UPDATE node_import_batches
        SET inserted_rows = ?, updated_rows = ?, duplicate_rows = ?, invalid_rows = ?, updated_at = ?
        WHERE id = ?
        "#,
        params![inserted_rows, updated_rows, duplicate_rows, invalid_rows, &created_at, &batch_id],
      )
      .context("update node import batch")?;

    transaction.commit().context("commit node import transaction")?;

    Ok(NodeImportBatchSummary {
      id: batch_id.clone(),
      source_file_name,
      source_file_path: source_path.to_string_lossy().to_string(),
      copied_file_path: copied_file_path.to_string_lossy().to_string(),
      source_type,
      source_label,
      total_rows,
      inserted_rows,
      updated_rows,
      duplicate_rows,
      invalid_rows,
      created_at: created_at.clone(),
      updated_at: created_at,
    })
  })();

  match import_result {
    Ok(summary) => Ok(summary),
    Err(error) => {
      let _ = fs::remove_file(&copied_file_path);
      Err(error)
    }
  }
}

pub fn delete_node_entry(connection: &mut Connection, id: &str) -> Result<()> {
  let transaction = connection.transaction().context("start node delete transaction")?;
  let affected = transaction
    .execute("DELETE FROM node_entries WHERE id = ?", params![id])
    .context("delete node entry")?;
  transaction.commit().context("commit node delete transaction")?;

  if affected == 0 {
    return Err(anyhow!("节点不存在，无法删除。"));
  }

  Ok(())
}

pub fn overview_stats(connection: &Connection) -> Result<NodeOverviewStats> {
  let stats = connection
    .query_row(
      r#"
      SELECT
        (SELECT COUNT(*) FROM node_entries) AS total_nodes,
        (SELECT COUNT(*) FROM node_import_batches) AS import_batches,
        COALESCE((SELECT COUNT(DISTINCT source_label) FROM node_entries), 0) AS source_labels,
        COALESCE((SELECT COUNT(DISTINCT protocol) FROM node_entries), 0) AS protocol_count,
        COALESCE((SELECT total_rows FROM node_import_batches ORDER BY created_at DESC, updated_at DESC LIMIT 1), 0) AS latest_batch_rows
      "#,
      [],
      |row| {
        Ok(NodeOverviewStats {
          total_nodes: row.get("total_nodes")?,
          import_batches: row.get("import_batches")?,
          source_labels: row.get("source_labels")?,
          protocol_count: row.get("protocol_count")?,
          latest_batch_rows: row.get("latest_batch_rows")?,
        })
      },
    )
    .context("query node overview stats")?;

  Ok(stats)
}

#[derive(Debug)]
struct ConnectivityTestOutcome {
  success: bool,
  latency_ms: Option<i64>,
  error_message: String,
}

fn normalize_trigger_source(value: Option<String>) -> String {
  let trigger_source = normalize_text(value);
  if trigger_source.is_empty() {
    "manual".to_string()
  } else {
    trigger_source
  }
}

fn summarize_test_scope(filters: &NodeListFilters, trigger_source: &str, target_count: i64) -> String {
  let mut parts = vec![format!("trigger={trigger_source}")];

  if let Some(keyword) = filters
    .keyword
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    parts.push(format!("keyword={keyword}"));
  }

  if let Some(source_label) = filters
    .source_label
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    parts.push(format!("sourceLabel={source_label}"));
  }

  if let Some(protocol) = filters
    .protocol
    .as_ref()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
  {
    parts.push(format!("protocol={protocol}"));
  }

  parts.push(format!("targets={target_count}"));
  parts.join(" | ")
}

fn serialize_filter_snapshot(filters: &NodeListFilters) -> Result<String> {
  serde_json::to_string(filters).context("serialize node test filter snapshot")
}

fn test_single_node(entry: &NodeEntrySummary) -> ConnectivityTestOutcome {
  let started = Instant::now();
  let timeout = Duration::from_secs(3);
  let port = match u16::try_from(entry.port) {
    Ok(port) => port,
    Err(_) => {
      return ConnectivityTestOutcome {
        success: false,
        latency_ms: None,
        error_message: "节点端口无效".to_string(),
      };
    }
  };

  let mut last_error: Option<String> = None;
  let resolved_addresses = match (entry.host.as_str(), port).to_socket_addrs() {
    Ok(addresses) => addresses,
    Err(error) => {
      return ConnectivityTestOutcome {
        success: false,
        latency_ms: None,
        error_message: format!("地址解析失败: {error}"),
      };
    }
  };

  for address in resolved_addresses {
    match TcpStream::connect_timeout(&address, timeout) {
      Ok(stream) => {
        let _ = stream.shutdown(Shutdown::Both);
        let latency_ms = started.elapsed().as_millis().min(i64::MAX as u128) as i64;
        return ConnectivityTestOutcome {
          success: true,
          latency_ms: Some(latency_ms),
          error_message: String::new(),
        };
      }
      Err(error) => {
        last_error = Some(error.to_string());
      }
    }
  }

  ConnectivityTestOutcome {
    success: false,
    latency_ms: None,
    error_message: last_error.unwrap_or_else(|| "连接失败".to_string()),
  }
}

fn row_to_test_run_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeTestRunSummary> {
  Ok(NodeTestRunSummary {
    id: row.get("id")?,
    trigger_source: row.get("trigger_source")?,
    filter_snapshot_json: row.get("filter_snapshot_json")?,
    scope_summary: row.get("scope_summary")?,
    target_count: row.get("target_count")?,
    success_count: row.get("success_count")?,
    failure_count: row.get("failure_count")?,
    duration_ms: row.get("duration_ms")?,
    status: row.get("status")?,
    error_message: row.get("error_message")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

fn row_to_test_result_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeTestResultSummary> {
  let success_value: i64 = row.get("success")?;
  Ok(NodeTestResultSummary {
    id: row.get("id")?,
    run_id: row.get("run_id")?,
    node_id: row.get("node_id")?,
    node_name: row.get("node_name")?,
    protocol: row.get("protocol")?,
    host: row.get("host")?,
    port: row.get("port")?,
    result_order: row.get("result_order")?,
    success: success_value != 0,
    latency_ms: row.get("latency_ms")?,
    error_message: row.get("error_message")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

pub fn run_node_tests(connection: &mut Connection, request: &NodeTestRequest) -> Result<NodeTestRunDetail> {
  let nodes = list_node_entries(connection, &request.filters)?;
  if nodes.is_empty() {
    return Err(anyhow!("当前筛选条件下没有可测试的节点"));
  }

  let trigger_source = normalize_trigger_source(request.trigger_source.clone());
  let filter_snapshot_json = serialize_filter_snapshot(&request.filters)?;
  let scope_summary = summarize_test_scope(&request.filters, &trigger_source, nodes.len() as i64);
  let run_id = Uuid::new_v4().to_string();
  let created_at = now_iso();
  let started = Instant::now();

  connection
    .execute(
      r#"
      INSERT INTO node_test_runs (
        id, trigger_source, filter_snapshot_json, scope_summary, target_count,
        success_count, failure_count, duration_ms, status, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
      params![
        &run_id,
        &trigger_source,
        &filter_snapshot_json,
        &scope_summary,
        nodes.len() as i64,
        0_i64,
        0_i64,
        0_i64,
        "running",
        "",
        &created_at,
        &created_at,
      ],
    )
    .context("insert node test run")?;

  let result = (|| -> Result<NodeTestRunDetail> {
    let mut results = Vec::with_capacity(nodes.len());
    let mut success_count = 0_i64;
    let mut failure_count = 0_i64;

    for (index, entry) in nodes.iter().enumerate() {
      let outcome = test_single_node(entry);
      if outcome.success {
        success_count += 1;
      } else {
        failure_count += 1;
      }

      results.push(NodeTestResultSummary {
        id: Uuid::new_v4().to_string(),
        run_id: run_id.clone(),
        node_id: entry.id.clone(),
        node_name: entry.node_name.clone(),
        protocol: entry.protocol.clone(),
        host: entry.host.clone(),
        port: entry.port,
        result_order: index as i64,
        success: outcome.success,
        latency_ms: outcome.latency_ms,
        error_message: outcome.error_message,
        created_at: created_at.clone(),
        updated_at: created_at.clone(),
      });
    }

    let duration_ms = started.elapsed().as_millis().min(i64::MAX as u128) as i64;
    let transaction = connection.transaction().context("start node test transaction")?;

    for result in &results {
      transaction
        .execute(
          r#"
          INSERT INTO node_test_results (
            id, run_id, node_id, node_name, protocol, host, port, result_order,
            success, latency_ms, error_message, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          "#,
          params![
            &result.id,
            &result.run_id,
            &result.node_id,
            &result.node_name,
            &result.protocol,
            &result.host,
            result.port,
            result.result_order,
            if result.success { 1_i64 } else { 0_i64 },
            result.latency_ms,
            &result.error_message,
            &result.created_at,
            &result.updated_at,
          ],
        )
        .context("insert node test result")?;
    }

    transaction
      .execute(
        r#"
        UPDATE node_test_runs
        SET success_count = ?, failure_count = ?, duration_ms = ?, status = ?, updated_at = ?
        WHERE id = ?
        "#,
        params![success_count, failure_count, duration_ms, "completed", &created_at, &run_id],
      )
      .context("update node test run")?;

    transaction.commit().context("commit node test transaction")?;

    Ok(NodeTestRunDetail {
      run: NodeTestRunSummary {
        id: run_id.clone(),
        trigger_source,
        filter_snapshot_json,
        scope_summary,
        target_count: nodes.len() as i64,
        success_count,
        failure_count,
        duration_ms,
        status: "completed".to_string(),
        error_message: String::new(),
        created_at: created_at.clone(),
        updated_at: created_at.clone(),
      },
      results,
    })
  })();

  match result {
    Ok(detail) => Ok(detail),
    Err(error) => {
      let failed_at = now_iso();
      let _ = connection.execute(
        r#"
        UPDATE node_test_runs
        SET status = ?, error_message = ?, updated_at = ?
        WHERE id = ?
        "#,
        params!["failed", error.to_string(), failed_at, run_id],
      );
      Err(error)
    }
  }
}

pub fn list_node_test_runs(connection: &Connection, limit: i64) -> Result<Vec<NodeTestRunSummary>> {
  let limit = if limit <= 0 { 10 } else { limit.min(100) };
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        trigger_source,
        filter_snapshot_json,
        scope_summary,
        target_count,
        success_count,
        failure_count,
        duration_ms,
        status,
        error_message,
        created_at,
        updated_at
      FROM node_test_runs
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ?
      "#,
    )
    .context("prepare node test run query")?;

  let rows = statement
    .query_map(params![limit], row_to_test_run_summary)
    .context("query node test runs")?;

  let mut runs = Vec::new();
  for row in rows {
    runs.push(row.context("map node test run row")?);
  }

  Ok(runs)
}

pub fn list_node_test_results(connection: &Connection, run_id: &str) -> Result<Vec<NodeTestResultSummary>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        run_id,
        node_id,
        node_name,
        protocol,
        host,
        port,
        result_order,
        success,
        latency_ms,
        error_message,
        created_at,
        updated_at
      FROM node_test_results
      WHERE run_id = ?
      ORDER BY result_order ASC, created_at ASC
      "#,
    )
    .context("prepare node test result query")?;

  let rows = statement
    .query_map(params![run_id], row_to_test_result_summary)
    .context("query node test results")?;

  let mut results = Vec::new();
  for row in rows {
    results.push(row.context("map node test result row")?);
  }

  Ok(results)
}
