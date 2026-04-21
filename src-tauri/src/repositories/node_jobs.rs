use crate::models::{NodeListFilters, NodeMonthlyJobRunSummary, NodeMonthlyJobSummary, NodeMonthlyJobUpsertInput, NodeReportExportInput};
use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Datelike, Local, NaiveDate, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::thread;
use std::time::Duration;
use uuid::Uuid;

use super::nodes;

fn now_iso() -> String {
  Local::now().to_rfc3339()
}

fn normalize_text(value: &str) -> String {
  value.trim().to_string()
}

fn normalize_report_month_mode(value: &str) -> Result<String> {
  match normalize_text(value).to_lowercase().as_str() {
    "current" => Ok("current".to_string()),
    "previous" => Ok("previous".to_string()),
    other => Err(anyhow!("无效的月报模式: {other}")),
  }
}

fn clamp_day(value: i64) -> i64 {
  value.clamp(1, 31)
}

fn clamp_hour(value: i64) -> i64 {
  value.clamp(0, 23)
}

fn clamp_minute(value: i64) -> i64 {
  value.clamp(0, 59)
}

fn current_month_label(now: DateTime<Local>) -> String {
  format!("{:04}-{:02}", now.year(), now.month())
}

fn previous_month_label(now: DateTime<Local>) -> String {
  let year = now.year();
  let month = now.month();
  if month == 1 {
    format!("{:04}-12", year - 1)
  } else {
    format!("{:04}-{:02}", year, month - 1)
  }
}

fn local_date_time(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> Result<DateTime<Local>> {
  let date = NaiveDate::from_ymd_opt(year, month, day).ok_or_else(|| anyhow!("无法构建调度日期"))?;
  let naive = date
    .and_hms_opt(hour, minute, 0)
    .ok_or_else(|| anyhow!("无法构建调度时间"))?;

  Local
    .from_local_datetime(&naive)
    .single()
    .or_else(|| Local.from_local_datetime(&naive).earliest())
    .ok_or_else(|| anyhow!("无法转换本地时间"))
}

fn last_day_of_month(year: i32, month: u32) -> Result<u32> {
  let (next_year, next_month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
  let first_day_next_month = NaiveDate::from_ymd_opt(next_year, next_month, 1).ok_or_else(|| anyhow!("无法计算月份"))?;
  Ok((first_day_next_month - chrono::Duration::days(1)).day())
}

fn compute_next_run_at(now: DateTime<Local>, schedule_day: i64, schedule_hour: i64, schedule_minute: i64) -> Result<String> {
  let day = clamp_day(schedule_day) as u32;
  let hour = clamp_hour(schedule_hour) as u32;
  let minute = clamp_minute(schedule_minute) as u32;

  let current_day = last_day_of_month(now.year(), now.month())?;
  let current_candidate_day = day.min(current_day);
  let this_month_candidate = local_date_time(now.year(), now.month(), current_candidate_day, hour, minute)?;
  if this_month_candidate > now {
    return Ok(this_month_candidate.to_rfc3339());
  }

  let (next_year, next_month) = if now.month() == 12 {
    (now.year() + 1, 1)
  } else {
    (now.year(), now.month() + 1)
  };
  let next_month_day = last_day_of_month(next_year, next_month)?;
  let next_candidate_day = day.min(next_month_day);
  Ok(local_date_time(next_year, next_month, next_candidate_day, hour, minute)?.to_rfc3339())
}

fn compute_report_month(now: DateTime<Local>, mode: &str) -> String {
  match mode {
    "current" => current_month_label(now),
    _ => previous_month_label(now),
  }
}

fn row_to_job_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeMonthlyJobSummary> {
  let enabled_value: i64 = row.get("enabled")?;
  Ok(NodeMonthlyJobSummary {
    id: row.get("id")?,
    job_name: row.get("job_name")?,
    enabled: enabled_value != 0,
    report_month_mode: row.get("report_month_mode")?,
    schedule_day: row.get("schedule_day")?,
    schedule_hour: row.get("schedule_hour")?,
    schedule_minute: row.get("schedule_minute")?,
    trigger_source: row.get("trigger_source")?,
    keyword: row.get("keyword")?,
    source_label: row.get("source_label")?,
    protocol: row.get("protocol")?,
    last_run_at: row.get("last_run_at")?,
    next_run_at: row.get("next_run_at")?,
    last_snapshot_id: row.get("last_snapshot_id")?,
    last_status: row.get("last_status")?,
    last_error_message: row.get("last_error_message")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

fn row_to_run_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeMonthlyJobRunSummary> {
  Ok(NodeMonthlyJobRunSummary {
    id: row.get("id")?,
    job_id: row.get("job_id")?,
    job_name: row.get("job_name")?,
    report_month: row.get("report_month")?,
    scheduled_for: row.get("scheduled_for")?,
    triggered_at: row.get("triggered_at")?,
    status: row.get("status")?,
    snapshot_id: row.get("snapshot_id")?,
    export_path: row.get("export_path")?,
    error_message: row.get("error_message")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

fn sanitize_job_name(value: &str) -> Result<String> {
  let job_name = normalize_text(value);
  if job_name.is_empty() {
    return Err(anyhow!("任务名称不能为空"));
  }
  Ok(job_name)
}

fn load_job_by_id(connection: &Connection, id: &str) -> Result<Option<NodeMonthlyJobSummary>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        job_name,
        enabled,
        report_month_mode,
        schedule_day,
        schedule_hour,
        schedule_minute,
        trigger_source,
        keyword,
        source_label,
        protocol,
        last_run_at,
        next_run_at,
        last_snapshot_id,
        last_status,
        last_error_message,
        created_at,
        updated_at
      FROM node_monthly_jobs
      WHERE id = ?
      "#,
    )
    .context("prepare node monthly job query")?;

  let row = statement
    .query_row(params![id], row_to_job_summary)
    .optional()
    .context("query node monthly job")?;

  Ok(row)
}

fn load_latest_snapshot_id_by_markdown_path(connection: &Connection, markdown_path: &str) -> Result<Option<String>> {
  let mut statement = connection
    .prepare("SELECT id FROM node_report_snapshots WHERE markdown_path = ? ORDER BY created_at DESC LIMIT 1")
    .context("prepare node report snapshot lookup")?;

  let snapshot_id = statement
    .query_row(params![markdown_path], |row| row.get::<_, String>(0))
    .optional()
    .context("query node report snapshot lookup")?;

  Ok(snapshot_id)
}

fn create_or_update_job(
  connection: &mut Connection,
  id: Option<&str>,
  input: &NodeMonthlyJobUpsertInput,
) -> Result<NodeMonthlyJobSummary> {
  let job_name = sanitize_job_name(&input.job_name)?;
  let report_month_mode = normalize_report_month_mode(&input.report_month_mode)?;
  let schedule_day = clamp_day(input.schedule_day);
  let schedule_hour = clamp_hour(input.schedule_hour);
  let schedule_minute = clamp_minute(input.schedule_minute);
  let trigger_source = normalize_text(&input.trigger_source);
  let created_at = now_iso();
  let updated_at = created_at.clone();
  let enabled = input.enabled;
  let next_run_at = if enabled {
    Some(compute_next_run_at(Local::now(), schedule_day, schedule_hour, schedule_minute)?)
  } else {
    None
  };
  let id = id.map(|value| value.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string());
  let existing = load_job_by_id(connection, &id)?;
  let last_run_at = existing.as_ref().and_then(|row| row.last_run_at.clone());
  let last_snapshot_id = existing
    .as_ref()
    .map(|row| row.last_snapshot_id.clone())
    .unwrap_or_default();
  let last_status = existing
    .as_ref()
    .map(|row| row.last_status.clone())
    .unwrap_or_else(|| "pending".to_string());
  let last_error_message = existing
    .as_ref()
    .map(|row| row.last_error_message.clone())
    .unwrap_or_default();

  connection
    .execute(
      r#"
      INSERT INTO node_monthly_jobs (
        id, job_name, enabled, report_month_mode, schedule_day, schedule_hour, schedule_minute,
        trigger_source, keyword, source_label, protocol, last_run_at, next_run_at, last_snapshot_id,
        last_status, last_error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        job_name = excluded.job_name,
        enabled = excluded.enabled,
        report_month_mode = excluded.report_month_mode,
        schedule_day = excluded.schedule_day,
        schedule_hour = excluded.schedule_hour,
        schedule_minute = excluded.schedule_minute,
        trigger_source = excluded.trigger_source,
        keyword = excluded.keyword,
        source_label = excluded.source_label,
        protocol = excluded.protocol,
        next_run_at = excluded.next_run_at,
        updated_at = excluded.updated_at
      "#,
      params![
        &id,
        &job_name,
        if enabled { 1_i64 } else { 0_i64 },
        &report_month_mode,
        schedule_day,
        schedule_hour,
        schedule_minute,
        &trigger_source,
        &normalize_text(&input.keyword),
        &normalize_text(&input.source_label),
        &normalize_text(&input.protocol),
        last_run_at,
        next_run_at,
        last_snapshot_id,
        last_status,
        last_error_message,
        &created_at,
        &updated_at,
      ],
    )
    .context("upsert node monthly job")?;

  load_job_by_id(connection, &id)?.ok_or_else(|| anyhow!("无法保存自动任务"))
}

fn update_job_execution_state(
  connection: &mut Connection,
  job_id: &str,
  last_run_at: Option<String>,
  next_run_at: Option<String>,
  last_snapshot_id: &str,
  last_status: &str,
  last_error_message: &str,
) -> Result<()> {
  let updated_at = now_iso();
  connection
    .execute(
      r#"
      UPDATE node_monthly_jobs
      SET last_run_at = ?, next_run_at = ?, last_snapshot_id = ?, last_status = ?, last_error_message = ?, updated_at = ?
      WHERE id = ?
      "#,
      params![
        last_run_at,
        next_run_at,
        last_snapshot_id,
        last_status,
        last_error_message,
        &updated_at,
        job_id,
      ],
    )
    .context("update node monthly job execution state")?;
  Ok(())
}

fn insert_job_run(
  connection: &Connection,
  job: &NodeMonthlyJobSummary,
  report_month: &str,
  scheduled_for: &str,
  triggered_at: &str,
  status: &str,
  snapshot_id: &str,
  export_path: &str,
  error_message: &str,
) -> Result<NodeMonthlyJobRunSummary> {
  let run_id = Uuid::new_v4().to_string();
  connection
    .execute(
      r#"
      INSERT INTO node_monthly_job_runs (
        id, job_id, job_name, report_month, scheduled_for, triggered_at,
        status, snapshot_id, export_path, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
      params![
        &run_id,
        &job.id,
        &job.job_name,
        report_month,
        scheduled_for,
        triggered_at,
        status,
        snapshot_id,
        export_path,
        error_message,
        triggered_at,
        triggered_at,
      ],
    )
    .context("insert node monthly job run")?;

  Ok(NodeMonthlyJobRunSummary {
    id: run_id,
    job_id: job.id.clone(),
    job_name: job.job_name.clone(),
    report_month: report_month.to_string(),
    scheduled_for: scheduled_for.to_string(),
    triggered_at: triggered_at.to_string(),
    status: status.to_string(),
    snapshot_id: snapshot_id.to_string(),
    export_path: export_path.to_string(),
    error_message: error_message.to_string(),
    created_at: triggered_at.to_string(),
    updated_at: triggered_at.to_string(),
  })
}

fn execute_job_once(
  connection: &mut Connection,
  export_dir: &Path,
  app_name: &str,
  job_id: &str,
  scheduled_for: Option<String>,
  manual_trigger: bool,
) -> Result<NodeMonthlyJobRunSummary> {
  let job = load_job_by_id(connection, job_id)?.ok_or_else(|| anyhow!("自动任务不存在"))?;
  if !job.enabled && !manual_trigger {
    return Err(anyhow!("自动任务已停用"));
  }

  let now = Local::now();
  let triggered_at = now_iso();
  let scheduled_for = scheduled_for.unwrap_or_else(|| job.next_run_at.clone().unwrap_or_else(|| triggered_at.clone()));
  let report_month = compute_report_month(now, &job.report_month_mode);
  let input = NodeReportExportInput {
    filters: NodeListFilters {
      keyword: Some(job.keyword.clone()).filter(|value| !value.is_empty()),
      source_label: Some(job.source_label.clone()).filter(|value| !value.is_empty()),
      protocol: Some(job.protocol.clone()).filter(|value| !value.is_empty()),
    },
    month: Some(report_month.clone()),
    trigger_source: Some(job.trigger_source.clone()),
  };

  match nodes::export_node_monthly_report(connection, export_dir, app_name, &input) {
    Ok(result) => {
      let markdown_path = result.paths.first().cloned().unwrap_or_else(String::new);
      let snapshot_id = load_latest_snapshot_id_by_markdown_path(connection, &markdown_path)?
        .unwrap_or_default();
      let next_run_at = if job.enabled {
        Some(compute_next_run_at(now, job.schedule_day, job.schedule_hour, job.schedule_minute)?)
      } else {
        None
      };

      update_job_execution_state(
        connection,
        &job.id,
        Some(triggered_at.clone()),
        next_run_at,
        &snapshot_id,
        "completed",
        "",
      )?;

      let run = insert_job_run(
        connection,
        &job,
        &report_month,
        &scheduled_for,
        &triggered_at,
        "completed",
        &snapshot_id,
        &result.primary_path,
        "",
      )?;
      Ok(run)
    }
    Err(error) => {
      let next_run_at = if job.enabled {
        Some(compute_next_run_at(now, job.schedule_day, job.schedule_hour, job.schedule_minute)?)
      } else {
        None
      };

      update_job_execution_state(
        connection,
        &job.id,
        Some(triggered_at.clone()),
        next_run_at,
        &job.last_snapshot_id,
        "failed",
        &error.to_string(),
      )?;

      let run = insert_job_run(
        connection,
        &job,
        &report_month,
        &scheduled_for,
        &triggered_at,
        "failed",
        "",
        "",
        &error.to_string(),
      )?;
      Err(anyhow!(run.error_message))
    }
  }
}

pub fn list_node_monthly_jobs(connection: &Connection) -> Result<Vec<NodeMonthlyJobSummary>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        job_name,
        enabled,
        report_month_mode,
        schedule_day,
        schedule_hour,
        schedule_minute,
        trigger_source,
        keyword,
        source_label,
        protocol,
        last_run_at,
        next_run_at,
        last_snapshot_id,
        last_status,
        last_error_message,
        created_at,
        updated_at
      FROM node_monthly_jobs
      ORDER BY enabled DESC, next_run_at ASC, created_at DESC
      "#,
    )
    .context("prepare node monthly job list query")?;

  let rows = statement
    .query_map([], row_to_job_summary)
    .context("query node monthly jobs")?;

  let mut jobs = Vec::new();
  for row in rows {
    jobs.push(row.context("map node monthly job row")?);
  }

  Ok(jobs)
}

pub fn list_node_monthly_job_runs(connection: &Connection, limit: i64) -> Result<Vec<NodeMonthlyJobRunSummary>> {
  let limit = if limit <= 0 { 10 } else { limit.min(100) };
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        job_id,
        job_name,
        report_month,
        scheduled_for,
        triggered_at,
        status,
        snapshot_id,
        export_path,
        error_message,
        created_at,
        updated_at
      FROM node_monthly_job_runs
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ?
      "#,
    )
    .context("prepare node monthly job run list query")?;

  let rows = statement
    .query_map(params![limit], row_to_run_summary)
    .context("query node monthly job runs")?;

  let mut runs = Vec::new();
  for row in rows {
    runs.push(row.context("map node monthly job run row")?);
  }

  Ok(runs)
}

pub fn create_node_monthly_job(
  connection: &mut Connection,
  input: &NodeMonthlyJobUpsertInput,
) -> Result<NodeMonthlyJobSummary> {
  create_or_update_job(connection, None, input)
}

pub fn update_node_monthly_job(
  connection: &mut Connection,
  id: &str,
  input: &NodeMonthlyJobUpsertInput,
) -> Result<NodeMonthlyJobSummary> {
  create_or_update_job(connection, Some(id), input)
}

pub fn delete_node_monthly_job(connection: &mut Connection, id: &str) -> Result<()> {
  let affected = connection
    .execute("DELETE FROM node_monthly_jobs WHERE id = ?", params![id])
    .context("delete node monthly job")?;
  if affected == 0 {
    return Err(anyhow!("自动任务不存在"));
  }
  Ok(())
}

pub fn run_node_monthly_job_now(
  connection: &mut Connection,
  export_dir: &Path,
  app_name: &str,
  job_id: &str,
) -> Result<NodeMonthlyJobRunSummary> {
  execute_job_once(connection, export_dir, app_name, job_id, None, true)
}

pub fn run_due_node_monthly_jobs_once(
  connection: &mut Connection,
  export_dir: &Path,
  app_name: &str,
) -> Result<Vec<NodeMonthlyJobRunSummary>> {
  let now = now_iso();
  let job_ids = {
    let mut statement = connection
      .prepare(
        r#"
        SELECT id
        FROM node_monthly_jobs
        WHERE enabled = 1
          AND next_run_at IS NOT NULL
          AND next_run_at <= ?
        ORDER BY next_run_at ASC, created_at ASC
        "#,
      )
      .context("prepare due node monthly job query")?;

    let rows = statement
      .query_map(params![now], |row| row.get::<_, String>(0))
      .context("query due node monthly jobs")?;

    let mut ids = Vec::new();
    for row in rows {
      ids.push(row.context("map due node monthly job row")?);
    }
    ids
  };

  let mut executed_runs = Vec::new();
  for job_id in job_ids {
    if let Ok(run) = execute_job_once(connection, export_dir, app_name, &job_id, None, false) {
      executed_runs.push(run);
    }
  }

  Ok(executed_runs)
}

pub fn start_node_monthly_job_scheduler(database_path: String, export_dir: String, app_name: String) {
  thread::spawn(move || loop {
    if let Ok(mut connection) = crate::db::open_connection(Path::new(&database_path)) {
      let _ = run_due_node_monthly_jobs_once(&mut connection, Path::new(&export_dir), &app_name);
    }

    thread::sleep(Duration::from_secs(60));
  });
}
