pub use crate::models::{AppConfig, ResolvedAppConfig};
use anyhow::{Context, Result};
use std::fs;
use std::path::Path;
use tauri::{path::BaseDirectory, AppHandle, Manager};

const DEFAULT_CONFIG_JSON: &str = include_str!("../../config/app.config.json");

pub fn load_or_init_config(app: &AppHandle) -> Result<ResolvedAppConfig> {
  let app_data_dir = app
    .path()
    .resolve("smart-home-office-assistant", BaseDirectory::AppData)
    .context("resolve app data directory")?;

  let config_dir = app_data_dir.join("config");
  let data_dir = app_data_dir.join("data");
  let export_dir = app_data_dir.join("exports");
  let upload_dir = app_data_dir.join("uploads");

  fs::create_dir_all(&config_dir).context("create config directory")?;
  fs::create_dir_all(&data_dir).context("create data directory")?;
  fs::create_dir_all(&export_dir).context("create export directory")?;
  fs::create_dir_all(&upload_dir).context("create upload directory")?;

  let config_file_path = config_dir.join("app.config.json");
  if !config_file_path.exists() {
    fs::write(&config_file_path, DEFAULT_CONFIG_JSON).context("write default config file")?;
  }

  let parsed = read_config_file(&config_file_path).or_else(|_| {
    fs::write(&config_file_path, DEFAULT_CONFIG_JSON)?;
    read_config_from_str(DEFAULT_CONFIG_JSON)
  })?;

  let database_path = app_data_dir.join(&parsed.storage.database_file);
  if let Some(parent) = database_path.parent() {
    fs::create_dir_all(parent).context("create database parent directory")?;
  }

  let runtime_export_dir = app_data_dir.join(&parsed.storage.export_dir);
  let runtime_upload_dir = app_data_dir.join(&parsed.storage.upload_dir);
  fs::create_dir_all(&runtime_export_dir).context("create runtime export directory")?;
  fs::create_dir_all(&runtime_upload_dir).context("create runtime upload directory")?;

  Ok(ResolvedAppConfig {
    app_name: parsed.app_name,
    app_data_dir: app_data_dir.to_string_lossy().to_string(),
    config_file_path: config_file_path.to_string_lossy().to_string(),
    database_path: database_path.to_string_lossy().to_string(),
    export_dir: runtime_export_dir.to_string_lossy().to_string(),
    upload_dir: runtime_upload_dir.to_string_lossy().to_string(),
    storage: parsed.storage,
  })
}

fn read_config_file(path: &Path) -> Result<AppConfig> {
  let content = fs::read_to_string(path).context("read runtime config file")?;
  read_config_from_str(&content)
}

fn read_config_from_str(content: &str) -> Result<AppConfig> {
  let config = serde_json::from_str::<AppConfig>(content).context("parse config file")?;
  Ok(config)
}
