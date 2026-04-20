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
      "#,
    )
    .context("create sqlite schema")?;

  Ok(())
}
