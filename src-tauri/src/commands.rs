use crate::config::ResolvedAppConfig;
use crate::db::open_connection;
use crate::models::{
  CadDocumentCreateInput, CadDocumentSummary, CadParseSummary, CadPipelineStats, DashboardStats, ExportResult,
  ProjectDetail, ProjectFilters, ProjectSummary, ProjectUpsertInput,
};
use crate::repositories::{backup, cad, projects};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_app_config(state: State<'_, AppState>) -> Result<ResolvedAppConfig, String> {
  Ok(state.config.clone())
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>, filters: ProjectFilters) -> Result<Vec<ProjectSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::list_projects(&connection, &filters).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, id: String) -> Result<Option<ProjectDetail>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::get_project(&connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_project(state: State<'_, AppState>, input: ProjectUpsertInput) -> Result<ProjectDetail, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::create_project(&mut connection, &input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_project(
  state: State<'_, AppState>,
  id: String,
  input: ProjectUpsertInput,
) -> Result<ProjectDetail, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::update_project(&mut connection, &id, &input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::delete_project(&mut connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  projects::dashboard_stats(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_cad_documents(state: State<'_, AppState>) -> Result<Vec<CadDocumentSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  cad::list_cad_documents(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_cad_document(
  state: State<'_, AppState>,
  input: CadDocumentCreateInput,
) -> Result<CadDocumentSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  cad::create_cad_document(&mut connection, std::path::Path::new(&state.config.upload_dir), &input)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn parse_cad_document(state: State<'_, AppState>, id: String) -> Result<CadParseSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  cad::parse_cad_document(&mut connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_cad_document(state: State<'_, AppState>, id: String) -> Result<(), String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  cad::delete_cad_document(&mut connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_cad_pipeline_stats(state: State<'_, AppState>) -> Result<CadPipelineStats, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  cad::pipeline_stats(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn export_json_backup(state: State<'_, AppState>) -> Result<ExportResult, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  backup::export_json_backup(
    &connection,
    std::path::Path::new(&state.config.export_dir),
    &state.config.app_name,
  )
  .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn export_csv_backup(state: State<'_, AppState>) -> Result<ExportResult, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  backup::export_csv_backup(
    &connection,
    std::path::Path::new(&state.config.export_dir),
    &state.config.app_name,
  )
  .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn export_database_backup(state: State<'_, AppState>) -> Result<ExportResult, String> {
  backup::export_database_backup(
    std::path::Path::new(&state.config.database_path),
    std::path::Path::new(&state.config.export_dir),
    &state.config.app_name,
  )
  .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn import_json_backup(state: State<'_, AppState>, content: String) -> Result<ExportResult, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  backup::import_json_backup(&mut connection, &content, std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())
}
