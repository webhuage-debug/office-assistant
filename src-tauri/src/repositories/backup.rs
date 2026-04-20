use crate::models::{ExportResult, ProjectDetail};
use anyhow::{Context, Result};
use chrono::Utc;
use csv::Writer;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use super::projects::{list_all_project_details, list_projects};
use crate::models::ProjectFilters;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonBackup {
  version: u32,
  generated_at: String,
  projects: Vec<ProjectDetail>,
}

fn timestamp_slug() -> String {
  Utc::now().format("%Y%m%d-%H%M%S").to_string()
}

fn ensure_dir(path: &Path) -> Result<()> {
  fs::create_dir_all(path).context("create export directory")?;
  Ok(())
}

fn build_json_backup(connection: &Connection) -> Result<JsonBackup> {
  let projects = list_all_project_details(connection)?;
  Ok(JsonBackup {
    version: 1,
    generated_at: Utc::now().to_rfc3339(),
    projects,
  })
}

pub fn export_json_backup(connection: &Connection, export_dir: &Path, app_name: &str) -> Result<ExportResult> {
  ensure_dir(export_dir)?;
  let backup = build_json_backup(connection)?;
  let file_name = format!("{app_name}-backup-{}.json", timestamp_slug());
  let path = export_dir.join(file_name);
  fs::write(&path, serde_json::to_string_pretty(&backup)?).context("write json backup")?;

  Ok(ExportResult {
    kind: "json".to_string(),
    primary_path: path.to_string_lossy().to_string(),
    paths: vec![path.to_string_lossy().to_string()],
    generated_at: backup.generated_at,
  })
}

pub fn export_csv_backup(connection: &Connection, export_dir: &Path, app_name: &str) -> Result<ExportResult> {
  ensure_dir(export_dir)?;
  let folder = export_dir.join(format!("{app_name}-csv-{}", timestamp_slug()));
  fs::create_dir_all(&folder).context("create csv export folder")?;

  let projects_path = folder.join("projects.csv");
  let items_path = folder.join("quotation_items.csv");

  write_projects_csv(connection, &projects_path)?;
  write_items_csv(connection, &items_path)?;

  let generated_at = Utc::now().to_rfc3339();
  Ok(ExportResult {
    kind: "csv".to_string(),
    primary_path: folder.to_string_lossy().to_string(),
    paths: vec![
      projects_path.to_string_lossy().to_string(),
      items_path.to_string_lossy().to_string(),
    ],
    generated_at,
  })
}

pub fn export_database_backup(database_path: &Path, export_dir: &Path, app_name: &str) -> Result<ExportResult> {
  ensure_dir(export_dir)?;
  let file_name = format!("{app_name}-database-{}.db", timestamp_slug());
  let path = export_dir.join(file_name);
  fs::copy(database_path, &path).context("copy sqlite database")?;

  Ok(ExportResult {
    kind: "database".to_string(),
    primary_path: path.to_string_lossy().to_string(),
    paths: vec![path.to_string_lossy().to_string()],
    generated_at: Utc::now().to_rfc3339(),
  })
}

pub fn import_json_backup(connection: &mut Connection, content: &str, restore_path: &Path) -> Result<ExportResult> {
  let backup = serde_json::from_str::<JsonBackup>(content).context("parse json backup")?;
  let transaction = connection.transaction().context("start import transaction")?;

  transaction
    .execute("DELETE FROM quotation_items", [])
    .context("clear quotation items")?;
  transaction.execute("DELETE FROM projects", []).context("clear projects")?;

  for project in backup.projects {
    transaction
      .execute(
        r#"
        INSERT INTO projects (
          id, project_no, customer_name, phone, address, room_count, plan_type, follow_stage,
          contract_amount_cents, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        rusqlite::params![
          project.id,
          project.project_no,
          project.customer_name,
          project.phone,
          project.address,
          project.room_count,
          project.plan_type,
          project.follow_stage,
          project.contract_amount_cents,
          project.remark,
          project.created_at,
          project.updated_at,
        ],
      )
      .context("insert imported project")?;

    for item in project.quotation_items {
      transaction
        .execute(
          r#"
          INSERT INTO quotation_items (
            id, project_id, product_name, brand, model, quantity, unit,
            unit_price_cents, subtotal_cents, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          "#,
          rusqlite::params![
            item.id,
            item.project_id,
            item.product_name,
            item.brand,
            item.model,
            item.quantity,
            item.unit,
            item.unit_price_cents,
            item.subtotal_cents,
            item.created_at,
            item.updated_at,
          ],
        )
        .context("insert imported quotation item")?;
    }
  }

  transaction.commit().context("commit import transaction")?;

  Ok(ExportResult {
    kind: "json".to_string(),
    primary_path: restore_path.to_string_lossy().to_string(),
    paths: vec![],
    generated_at: backup.generated_at,
  })
}

fn write_projects_csv(connection: &Connection, path: &Path) -> Result<()> {
  let projects = list_projects(
    connection,
    &ProjectFilters {
      project_no: None,
      customer_name: None,
      phone: None,
    },
  )?;

  let mut writer = Writer::from_path(path).context("open projects csv")?;
  writer.write_record([
    "id",
    "project_no",
    "customer_name",
    "phone",
    "address",
    "room_count",
    "plan_type",
    "follow_stage",
    "contract_amount_cents",
    "quotation_item_count",
    "created_at",
    "updated_at",
  ])?;

  for project in projects {
    writer.write_record([
      project.id,
      project.project_no,
      project.customer_name,
      project.phone,
      project.address,
      project.room_count.to_string(),
      project.plan_type,
      project.follow_stage,
      project.contract_amount_cents.to_string(),
      project.quotation_item_count.to_string(),
      project.created_at,
      project.updated_at,
    ])?;
  }

  writer.flush().context("flush projects csv")?;
  Ok(())
}

fn write_items_csv(connection: &Connection, path: &Path) -> Result<()> {
  let projects = list_all_project_details(connection)?;
  let mut writer = Writer::from_path(path).context("open quotation items csv")?;
  writer.write_record([
    "id",
    "project_id",
    "product_name",
    "brand",
    "model",
    "quantity",
    "unit",
    "unit_price_cents",
    "subtotal_cents",
    "created_at",
    "updated_at",
  ])?;

  for project in projects {
    for item in project.quotation_items {
      writer.write_record([
        item.id,
        item.project_id,
        item.product_name,
        item.brand,
        item.model,
        item.quantity.to_string(),
        item.unit,
        item.unit_price_cents.to_string(),
        item.subtotal_cents.to_string(),
        item.created_at,
        item.updated_at,
      ])?;
    }
  }

  writer.flush().context("flush quotation items csv")?;
  Ok(())
}
