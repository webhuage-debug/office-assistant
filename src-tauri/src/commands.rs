use crate::config::ResolvedAppConfig;
use crate::db::open_connection;
use crate::models::{
  CadDocumentCreateInput, CadDocumentSummary, CadParseSummary, CadPipelineStats, DashboardStats, ExportResult,
  NodeEntrySummary, NodeImportBatchSummary, NodeImportInput, NodeListFilters, NodeOverviewStats, NodeReportExportInput,
  NodeTestRequest, NodeTestResultSummary, NodeTestRunDetail, NodeTestRunSummary, ProjectDetail, ProjectFilters,
  ProjectSummary, ProjectUpsertInput, NodeQualityStats, NodeQualitySummary, NodeReportComparisonSummary,
  NodeReportSnapshotSummary, NodeMonthlyJobRunSummary, NodeMonthlyJobSummary, NodeMonthlyJobUpsertInput,
};
use crate::repositories::{backup, cad, node_jobs, nodes, projects};
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
pub fn list_node_entries(state: State<'_, AppState>, filters: NodeListFilters) -> Result<Vec<NodeEntrySummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::list_node_entries(&connection, &filters).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn import_node_entries(
  state: State<'_, AppState>,
  input: NodeImportInput,
) -> Result<NodeImportBatchSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::import_node_entries(&mut connection, std::path::Path::new(&state.config.upload_dir), &input)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_node_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::delete_node_entry(&mut connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_node_overview_stats(state: State<'_, AppState>) -> Result<NodeOverviewStats, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::overview_stats(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_quality_rankings(
  state: State<'_, AppState>,
  filters: NodeListFilters,
  limit: Option<i64>,
) -> Result<Vec<NodeQualitySummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::list_node_quality_rankings(&connection, &filters, limit.unwrap_or(20)).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_node_quality_stats(state: State<'_, AppState>, filters: NodeListFilters) -> Result<NodeQualityStats, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::quality_stats(&connection, &filters).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn run_node_tests(state: State<'_, AppState>, request: NodeTestRequest) -> Result<NodeTestRunDetail, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::run_node_tests(&mut connection, &request).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_test_runs(state: State<'_, AppState>, limit: Option<i64>) -> Result<Vec<NodeTestRunSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::list_node_test_runs(&connection, limit.unwrap_or(10)).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_test_results(
  state: State<'_, AppState>,
  run_id: String,
) -> Result<Vec<NodeTestResultSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::list_node_test_results(&connection, &run_id).map_err(|error| error.to_string())
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

#[tauri::command]
pub fn export_node_monthly_report(
  state: State<'_, AppState>,
  input: NodeReportExportInput,
) -> Result<ExportResult, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::export_node_monthly_report(
    &mut connection,
    std::path::Path::new(&state.config.export_dir),
    &state.config.app_name,
    &input,
  )
  .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_report_snapshots(
  state: State<'_, AppState>,
  limit: Option<i64>,
) -> Result<Vec<NodeReportSnapshotSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::list_node_report_snapshots(&connection, limit.unwrap_or(8)).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_node_report_comparison(
  state: State<'_, AppState>,
) -> Result<Option<NodeReportComparisonSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  nodes::get_node_report_comparison(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_monthly_jobs(state: State<'_, AppState>) -> Result<Vec<NodeMonthlyJobSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::list_node_monthly_jobs(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_node_monthly_job_runs(
  state: State<'_, AppState>,
  limit: Option<i64>,
) -> Result<Vec<NodeMonthlyJobRunSummary>, String> {
  let connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::list_node_monthly_job_runs(&connection, limit.unwrap_or(10)).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_node_monthly_job(
  state: State<'_, AppState>,
  input: NodeMonthlyJobUpsertInput,
) -> Result<NodeMonthlyJobSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::create_node_monthly_job(&mut connection, &input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_node_monthly_job(
  state: State<'_, AppState>,
  id: String,
  input: NodeMonthlyJobUpsertInput,
) -> Result<NodeMonthlyJobSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::update_node_monthly_job(&mut connection, &id, &input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_node_monthly_job(state: State<'_, AppState>, id: String) -> Result<(), String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::delete_node_monthly_job(&mut connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn run_node_monthly_job_now(state: State<'_, AppState>, id: String) -> Result<NodeMonthlyJobRunSummary, String> {
  let mut connection = open_connection(std::path::Path::new(&state.config.database_path))
    .map_err(|error| error.to_string())?;
  node_jobs::run_node_monthly_job_now(
    &mut connection,
    std::path::Path::new(&state.config.export_dir),
    &state.config.app_name,
    &id,
  )
  .map_err(|error| error.to_string())
}
