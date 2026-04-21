use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

pub fn bootstrap_database(database_path: &str) -> Result<()> {
  let connection = open_connection(Path::new(database_path))?;
  ensure_schema(&connection)?;
  Ok(())
}

pub fn open_connection(path: &Path) -> Result<Connection> {
  let connection = Connection::open(path).context("open sqlite database")?;
  connection
    .pragma_update(None, "foreign_keys", "ON")
    .context("enable foreign keys")?;
  Ok(connection)
}

pub fn ensure_schema(connection: &Connection) -> Result<()> {
  connection
    .execute_batch(
      r#"
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        project_no TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        room_count INTEGER NOT NULL DEFAULT 0,
        plan_type TEXT NOT NULL,
        follow_stage TEXT NOT NULL DEFAULT '跟进中',
        contract_amount_cents INTEGER NOT NULL DEFAULT 0,
        remark TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT '',
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        subtotal_cents INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cad_documents (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        original_file_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_path TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT '待识别',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS cad_analysis_jobs (
        id TEXT PRIMARY KEY,
        cad_document_id TEXT NOT NULL,
        job_type TEXT NOT NULL DEFAULT 'recognition',
        status TEXT NOT NULL DEFAULT '待识别',
        input_summary TEXT NOT NULL DEFAULT '',
        output_summary TEXT NOT NULL DEFAULT '',
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(cad_document_id) REFERENCES cad_documents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS node_import_batches (
        id TEXT PRIMARY KEY,
        source_file_name TEXT NOT NULL,
        source_file_path TEXT NOT NULL,
        copied_file_path TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_label TEXT NOT NULL DEFAULT '',
        total_rows INTEGER NOT NULL DEFAULT 0,
        inserted_rows INTEGER NOT NULL DEFAULT 0,
        updated_rows INTEGER NOT NULL DEFAULT 0,
        duplicate_rows INTEGER NOT NULL DEFAULT 0,
        invalid_rows INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS node_entries (
        id TEXT PRIMARY KEY,
        node_name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 0,
        remark TEXT NOT NULL DEFAULT '',
        source_label TEXT NOT NULL DEFAULT '',
        dedupe_key TEXT NOT NULL UNIQUE,
        first_seen_batch_id TEXT NOT NULL,
        last_seen_batch_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(first_seen_batch_id) REFERENCES node_import_batches(id) ON DELETE CASCADE,
        FOREIGN KEY(last_seen_batch_id) REFERENCES node_import_batches(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS node_test_runs (
        id TEXT PRIMARY KEY,
        trigger_source TEXT NOT NULL DEFAULT 'manual',
        filter_snapshot_json TEXT NOT NULL DEFAULT '{}',
        scope_summary TEXT NOT NULL DEFAULT '',
        target_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'completed',
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS node_test_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 0,
        result_order INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER,
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES node_test_runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS node_report_snapshots (
        id TEXT PRIMARY KEY,
        report_month TEXT NOT NULL,
        trigger_source TEXT NOT NULL DEFAULT 'manual',
        filter_snapshot_json TEXT NOT NULL DEFAULT '{}',
        scope_summary TEXT NOT NULL DEFAULT '',
        total_ranked_nodes INTEGER NOT NULL DEFAULT 0,
        recommended_nodes INTEGER NOT NULL DEFAULT 0,
        excellent_nodes INTEGER NOT NULL DEFAULT 0,
        stable_nodes INTEGER NOT NULL DEFAULT 0,
        average_score INTEGER NOT NULL DEFAULT 0,
        top_score INTEGER NOT NULL DEFAULT 0,
        total_tests INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        markdown_path TEXT NOT NULL DEFAULT '',
        csv_path TEXT NOT NULL DEFAULT '',
        recommended_csv_path TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS node_report_items (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 0,
        source_label TEXT NOT NULL DEFAULT '',
        source_file_name TEXT NOT NULL DEFAULT '',
        total_tests INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        success_rate REAL NOT NULL DEFAULT 0,
        average_latency_ms INTEGER,
        score INTEGER NOT NULL DEFAULT 0,
        recommendation_level TEXT NOT NULL DEFAULT '',
        recommendation_reason TEXT NOT NULL DEFAULT '',
        last_test_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(snapshot_id) REFERENCES node_report_snapshots(id) ON DELETE CASCADE,
        UNIQUE(snapshot_id, node_id)
      );

      CREATE TABLE IF NOT EXISTS node_monthly_jobs (
        id TEXT PRIMARY KEY,
        job_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        report_month_mode TEXT NOT NULL DEFAULT 'previous',
        schedule_day INTEGER NOT NULL DEFAULT 1,
        schedule_hour INTEGER NOT NULL DEFAULT 9,
        schedule_minute INTEGER NOT NULL DEFAULT 0,
        trigger_source TEXT NOT NULL DEFAULT 'scheduler',
        keyword TEXT NOT NULL DEFAULT '',
        source_label TEXT NOT NULL DEFAULT '',
        protocol TEXT NOT NULL DEFAULT '',
        last_run_at TEXT,
        next_run_at TEXT,
        last_snapshot_id TEXT NOT NULL DEFAULT '',
        last_status TEXT NOT NULL DEFAULT 'pending',
        last_error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS node_monthly_job_runs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        job_name TEXT NOT NULL,
        report_month TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        triggered_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        snapshot_id TEXT NOT NULL DEFAULT '',
        export_path TEXT NOT NULL DEFAULT '',
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES node_monthly_jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_projects_project_no ON projects(project_no);
      CREATE INDEX IF NOT EXISTS idx_projects_customer_name ON projects(customer_name);
      CREATE INDEX IF NOT EXISTS idx_projects_phone ON projects(phone);
      CREATE INDEX IF NOT EXISTS idx_projects_follow_stage ON projects(follow_stage);
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
      CREATE INDEX IF NOT EXISTS idx_quotation_items_project_id ON quotation_items(project_id);
      CREATE INDEX IF NOT EXISTS idx_cad_documents_project_id ON cad_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_cad_documents_status ON cad_documents(status);
      CREATE INDEX IF NOT EXISTS idx_cad_documents_updated_at ON cad_documents(updated_at);
      CREATE INDEX IF NOT EXISTS idx_cad_analysis_jobs_document_id ON cad_analysis_jobs(cad_document_id);
      CREATE INDEX IF NOT EXISTS idx_cad_analysis_jobs_status ON cad_analysis_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_node_import_batches_created_at ON node_import_batches(created_at);
      CREATE INDEX IF NOT EXISTS idx_node_entries_protocol ON node_entries(protocol);
      CREATE INDEX IF NOT EXISTS idx_node_entries_source_label ON node_entries(source_label);
      CREATE INDEX IF NOT EXISTS idx_node_entries_updated_at ON node_entries(updated_at);
      CREATE INDEX IF NOT EXISTS idx_node_test_runs_created_at ON node_test_runs(created_at);
      CREATE INDEX IF NOT EXISTS idx_node_test_runs_status ON node_test_runs(status);
      CREATE INDEX IF NOT EXISTS idx_node_test_results_run_id ON node_test_results(run_id);
      CREATE INDEX IF NOT EXISTS idx_node_test_results_success ON node_test_results(success);
      CREATE INDEX IF NOT EXISTS idx_node_report_snapshots_month ON node_report_snapshots(report_month);
      CREATE INDEX IF NOT EXISTS idx_node_report_snapshots_created_at ON node_report_snapshots(created_at);
      CREATE INDEX IF NOT EXISTS idx_node_report_items_snapshot_id ON node_report_items(snapshot_id);
      CREATE INDEX IF NOT EXISTS idx_node_report_items_node_id ON node_report_items(node_id);
      CREATE INDEX IF NOT EXISTS idx_node_monthly_jobs_enabled ON node_monthly_jobs(enabled);
      CREATE INDEX IF NOT EXISTS idx_node_monthly_jobs_next_run_at ON node_monthly_jobs(next_run_at);
      CREATE INDEX IF NOT EXISTS idx_node_monthly_job_runs_job_id ON node_monthly_job_runs(job_id);
      CREATE INDEX IF NOT EXISTS idx_node_monthly_job_runs_created_at ON node_monthly_job_runs(created_at);
      "#,
    )
    .context("create sqlite schema")?;

  Ok(())
}
