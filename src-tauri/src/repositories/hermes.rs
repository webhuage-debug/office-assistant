use crate::models::{
  HermesTaskDraftInput, HermesTaskDraftSummary, NodeReportComparisonSummary, NodeReportSnapshotSummary,
};
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

use super::nodes;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesTaskEnvelope {
  id: String,
  title: String,
  instruction: String,
  source_type: String,
  source_label: String,
  report_month: Option<String>,
  source_snapshot_id: Option<String>,
  current_snapshot: Option<NodeReportSnapshotSummary>,
  comparison: Option<NodeReportComparisonSummary>,
  generated_at: String,
}

fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

fn timestamp_slug() -> String {
  Utc::now().format("%Y%m%d-%H%M%S").to_string()
}

fn normalize_text(value: &str) -> String {
  value.trim().to_string()
}

fn normalize_source_type(value: &str) -> Result<String> {
  match normalize_text(value).as_str() {
    "latestNodeReport" => Ok("latestNodeReport".to_string()),
    "manual" => Ok("manual".to_string()),
    other => Err(anyhow!("无效的 Hermes 来源类型: {other}")),
  }
}

fn sanitize_filename(value: &str) -> String {
  let mut cleaned = String::new();
  let mut last_was_dash = false;

  for ch in value.chars() {
    let is_invalid = matches!(ch, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|');
    if is_invalid {
      if !last_was_dash {
        cleaned.push('-');
        last_was_dash = true;
      }
      continue;
    }

    if ch.is_whitespace() {
      if !last_was_dash {
        cleaned.push('-');
        last_was_dash = true;
      }
      continue;
    }

    cleaned.push(ch);
    last_was_dash = false;
  }

  let trimmed = cleaned.trim_matches(['-', '.', ' '].as_ref()).to_string();
  if trimmed.is_empty() {
    "hermes-task".to_string()
  } else {
    trimmed
  }
}

fn load_latest_node_report_context(
  connection: &Connection,
) -> Result<(NodeReportSnapshotSummary, Option<NodeReportComparisonSummary>)> {
  let latest_snapshot = nodes::list_node_report_snapshots(connection, 1)?
    .into_iter()
    .next()
    .ok_or_else(|| anyhow!("暂无可用的节点月报快照，请先导出月报"))?;
  let comparison = nodes::get_node_report_comparison(connection)?;
  Ok((latest_snapshot, comparison))
}

fn build_envelope(
  connection: &Connection,
  input: &HermesTaskDraftInput,
  task_id: &str,
  source_type: &str,
) -> Result<HermesTaskEnvelope> {
  let title = normalize_text(&input.title);
  let instruction = normalize_text(&input.instruction);
  if title.is_empty() {
    return Err(anyhow!("Hermes 任务标题不能为空"));
  }
  if instruction.is_empty() {
    return Err(anyhow!("Hermes 任务说明不能为空"));
  }

  let generated_at = now_iso();
  match source_type {
    "latestNodeReport" => {
      let (latest_snapshot, comparison) = load_latest_node_report_context(connection)?;
      Ok(HermesTaskEnvelope {
        id: task_id.to_string(),
        title,
        instruction,
        source_type: source_type.to_string(),
        source_label: format!("节点月报 {}", latest_snapshot.report_month),
        report_month: Some(latest_snapshot.report_month.clone()),
        source_snapshot_id: Some(latest_snapshot.id.clone()),
        current_snapshot: Some(latest_snapshot),
        comparison,
        generated_at,
      })
    }
    "manual" => Ok(HermesTaskEnvelope {
      id: task_id.to_string(),
      title,
      instruction,
      source_type: source_type.to_string(),
      source_label: "手动输入".to_string(),
      report_month: None,
      source_snapshot_id: None,
      current_snapshot: None,
      comparison: None,
      generated_at,
    }),
    _ => Err(anyhow!("无效的 Hermes 来源类型")),
  }
}

fn envelope_to_summary(envelope: &HermesTaskEnvelope, payload_path: &Path, payload_size_bytes: i64) -> HermesTaskDraftSummary {
  HermesTaskDraftSummary {
    id: envelope.id.clone(),
    title: envelope.title.clone(),
    instruction: envelope.instruction.clone(),
    source_type: envelope.source_type.clone(),
    source_label: envelope.source_label.clone(),
    report_month: envelope.report_month.clone().unwrap_or_default(),
    source_snapshot_id: envelope.source_snapshot_id.clone().unwrap_or_default(),
    payload_path: payload_path.to_string_lossy().to_string(),
    payload_size_bytes,
    generated_at: envelope.generated_at.clone(),
    created_at: envelope.generated_at.clone(),
    updated_at: envelope.generated_at.clone(),
  }
}

pub fn create_hermes_task_draft(
  connection: &Connection,
  inbox_dir: &Path,
  app_name: &str,
  input: &HermesTaskDraftInput,
) -> Result<HermesTaskDraftSummary> {
  fs::create_dir_all(inbox_dir).context("create hermes inbox directory")?;
  let source_type = normalize_source_type(&input.source_type)?;
  let task_id = Uuid::new_v4().to_string();
  let envelope = build_envelope(connection, input, &task_id, &source_type)?;
  let task_suffix: String = task_id.chars().filter(|ch| *ch != '-').take(8).collect();
  let file_name = format!(
    "{}-hermes-task-{}-{}-{}.json",
    sanitize_filename(app_name),
    timestamp_slug(),
    task_suffix,
    sanitize_filename(&envelope.title),
  );
  let payload_path = inbox_dir.join(file_name);
  let payload_json = serde_json::to_string_pretty(&envelope).context("serialize hermes task envelope")?;
  fs::write(&payload_path, payload_json).context("write hermes task payload")?;
  let payload_size_bytes = fs::metadata(&payload_path)
    .context("read hermes task payload metadata")?
    .len() as i64;

  Ok(envelope_to_summary(&envelope, &payload_path, payload_size_bytes))
}

pub fn list_hermes_task_drafts(inbox_dir: &Path, limit: i64) -> Result<Vec<HermesTaskDraftSummary>> {
  fs::create_dir_all(inbox_dir).context("create hermes inbox directory")?;
  let limit = if limit <= 0 { 10 } else { limit.min(100) } as usize;
  let mut drafts = Vec::new();

  for entry in fs::read_dir(inbox_dir).context("read hermes inbox directory")? {
    let entry = entry.context("read hermes draft entry")?;
    let path = entry.path();
    if !path.is_file() {
      continue;
    }

    if path.extension().and_then(|value| value.to_str()) != Some("json") {
      continue;
    }

    let content = match fs::read_to_string(&path) {
      Ok(content) => content,
      Err(_) => continue,
    };

    let envelope = match serde_json::from_str::<HermesTaskEnvelope>(&content) {
      Ok(envelope) => envelope,
      Err(_) => continue,
    };

    let payload_size_bytes = entry.metadata().map(|metadata| metadata.len() as i64).unwrap_or(0);
    drafts.push(envelope_to_summary(&envelope, &path, payload_size_bytes));
  }

  drafts.sort_by(|left, right| right.generated_at.cmp(&left.generated_at));
  drafts.truncate(limit);
  Ok(drafts)
}

pub fn delete_hermes_task_draft(inbox_dir: &Path, id: &str) -> Result<()> {
  let drafts = list_hermes_task_drafts(inbox_dir, 100)?;
  let draft = drafts
    .into_iter()
    .find(|draft| draft.id == id)
    .ok_or_else(|| anyhow!("Hermes 任务草稿不存在"))?;

  fs::remove_file(&draft.payload_path).context("delete hermes task payload")?;
  Ok(())
}
