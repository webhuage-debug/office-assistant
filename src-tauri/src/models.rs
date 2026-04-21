use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
  pub id: String,
  pub project_no: String,
  pub customer_name: String,
  pub phone: String,
  pub address: String,
  pub room_count: i64,
  pub plan_type: String,
  pub follow_stage: String,
  pub contract_amount_cents: i64,
  pub quotation_item_count: i64,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotationItemRecord {
  pub id: String,
  pub project_id: String,
  pub product_name: String,
  pub brand: String,
  pub model: String,
  pub quantity: i64,
  pub unit: String,
  pub unit_price_cents: i64,
  pub subtotal_cents: i64,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetail {
  pub id: String,
  pub project_no: String,
  pub customer_name: String,
  pub phone: String,
  pub address: String,
  pub room_count: i64,
  pub plan_type: String,
  pub follow_stage: String,
  pub contract_amount_cents: i64,
  pub remark: String,
  pub quotation_items: Vec<QuotationItemRecord>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
  pub total_projects: i64,
  pub follow_up_projects: i64,
  pub signed_projects: i64,
  pub total_contract_amount_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
  pub kind: String,
  pub primary_path: String,
  pub paths: Vec<String>,
  pub generated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFilters {
  pub project_no: Option<String>,
  pub customer_name: Option<String>,
  pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotationItemInput {
  pub product_name: String,
  pub brand: String,
  pub model: String,
  pub quantity: i64,
  pub unit: String,
  pub unit_price_cents: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUpsertInput {
  pub project_no: String,
  pub customer_name: String,
  pub phone: String,
  pub address: String,
  pub room_count: i64,
  pub plan_type: String,
  pub follow_stage: String,
  pub remark: String,
  pub quotation_items: Vec<QuotationItemInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadDocumentCreateInput {
  pub project_id: Option<String>,
  pub source_path: String,
  pub source_type: String,
  pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadLayerCount {
  pub layer_name: String,
  pub entity_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadParseSummary {
  pub document_id: String,
  pub parser_name: String,
  pub source_type: String,
  pub entity_count: i64,
  pub layer_count: i64,
  pub line_count: i64,
  pub circle_count: i64,
  pub polyline_count: i64,
  pub text_count: i64,
  pub insert_count: i64,
  pub other_count: i64,
  pub top_layers: Vec<CadLayerCount>,
  pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadDocumentSummary {
  pub id: String,
  pub project_id: Option<String>,
  pub project_no: Option<String>,
  pub customer_name: Option<String>,
  pub original_file_name: String,
  pub source_type: String,
  pub source_path: String,
  pub storage_path: String,
  pub file_size_bytes: i64,
  pub status: String,
  pub analysis_job_count: i64,
  pub latest_job_status: Option<String>,
  pub latest_parse_summary: Option<CadParseSummary>,
  pub note: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadPipelineStats {
  pub total_documents: i64,
  pub pending_documents: i64,
  pub processing_documents: i64,
  pub completed_documents: i64,
  pub failed_documents: i64,
  pub linked_projects: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeEntrySummary {
  pub id: String,
  pub node_name: String,
  pub protocol: String,
  pub host: String,
  pub port: i64,
  pub remark: String,
  pub source_label: String,
  pub source_file_name: String,
  pub first_seen_batch_id: String,
  pub last_seen_batch_id: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeImportBatchSummary {
  pub id: String,
  pub source_file_name: String,
  pub source_file_path: String,
  pub copied_file_path: String,
  pub source_type: String,
  pub source_label: String,
  pub total_rows: i64,
  pub inserted_rows: i64,
  pub updated_rows: i64,
  pub duplicate_rows: i64,
  pub invalid_rows: i64,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeOverviewStats {
  pub total_nodes: i64,
  pub import_batches: i64,
  pub source_labels: i64,
  pub protocol_count: i64,
  pub latest_batch_rows: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeListFilters {
  pub keyword: Option<String>,
  pub source_label: Option<String>,
  pub protocol: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeImportInput {
  pub source_path: String,
  pub source_label: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTestRequest {
  pub filters: NodeListFilters,
  pub trigger_source: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeReportExportInput {
  pub filters: NodeListFilters,
  pub month: Option<String>,
  pub trigger_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTestRunSummary {
  pub id: String,
  pub trigger_source: String,
  pub filter_snapshot_json: String,
  pub scope_summary: String,
  pub target_count: i64,
  pub success_count: i64,
  pub failure_count: i64,
  pub duration_ms: i64,
  pub status: String,
  pub error_message: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTestResultSummary {
  pub id: String,
  pub run_id: String,
  pub node_id: String,
  pub node_name: String,
  pub protocol: String,
  pub host: String,
  pub port: i64,
  pub result_order: i64,
  pub success: bool,
  pub latency_ms: Option<i64>,
  pub error_message: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTestRunDetail {
  pub run: NodeTestRunSummary,
  pub results: Vec<NodeTestResultSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeQualitySummary {
  pub id: String,
  pub node_id: String,
  pub node_name: String,
  pub protocol: String,
  pub host: String,
  pub port: i64,
  pub source_label: String,
  pub source_file_name: String,
  pub total_tests: i64,
  pub success_count: i64,
  pub failure_count: i64,
  pub success_rate: f64,
  pub average_latency_ms: Option<i64>,
  pub score: i64,
  pub recommendation_level: String,
  pub recommendation_reason: String,
  pub last_test_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeQualityStats {
  pub total_ranked_nodes: i64,
  pub recommended_nodes: i64,
  pub excellent_nodes: i64,
  pub stable_nodes: i64,
  pub average_score: i64,
  pub top_score: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeReportSnapshotSummary {
  pub id: String,
  pub report_month: String,
  pub trigger_source: String,
  pub filter_snapshot_json: String,
  pub scope_summary: String,
  pub total_ranked_nodes: i64,
  pub recommended_nodes: i64,
  pub excellent_nodes: i64,
  pub stable_nodes: i64,
  pub average_score: i64,
  pub top_score: i64,
  pub total_tests: i64,
  pub success_count: i64,
  pub failure_count: i64,
  pub markdown_path: String,
  pub csv_path: String,
  pub recommended_csv_path: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeReportChangeSummary {
  pub node_id: String,
  pub node_name: String,
  pub protocol: String,
  pub host: String,
  pub port: i64,
  pub current_score: Option<i64>,
  pub previous_score: Option<i64>,
  pub score_delta: i64,
  pub current_success_rate: Option<f64>,
  pub previous_success_rate: Option<f64>,
  pub current_recommendation_level: Option<String>,
  pub previous_recommendation_level: Option<String>,
  pub change_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeReportComparisonSummary {
  pub current_snapshot: NodeReportSnapshotSummary,
  pub previous_snapshot: Option<NodeReportSnapshotSummary>,
  pub recent_snapshots: Vec<NodeReportSnapshotSummary>,
  pub total_nodes_delta: i64,
  pub recommended_delta: i64,
  pub excellent_delta: i64,
  pub stable_delta: i64,
  pub average_score_delta: i64,
  pub top_score_delta: i64,
  pub total_tests_delta: i64,
  pub success_count_delta: i64,
  pub failure_count_delta: i64,
  pub added_nodes: i64,
  pub removed_nodes: i64,
  pub improved_nodes: i64,
  pub declined_nodes: i64,
  pub unchanged_nodes: i64,
  pub change_rows: Vec<NodeReportChangeSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMonthlyJobSummary {
  pub id: String,
  pub job_name: String,
  pub enabled: bool,
  pub report_month_mode: String,
  pub schedule_day: i64,
  pub schedule_hour: i64,
  pub schedule_minute: i64,
  pub trigger_source: String,
  pub keyword: String,
  pub source_label: String,
  pub protocol: String,
  pub last_run_at: Option<String>,
  pub next_run_at: Option<String>,
  pub last_snapshot_id: String,
  pub last_status: String,
  pub last_error_message: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMonthlyJobRunSummary {
  pub id: String,
  pub job_id: String,
  pub job_name: String,
  pub report_month: String,
  pub scheduled_for: String,
  pub triggered_at: String,
  pub status: String,
  pub snapshot_id: String,
  pub export_path: String,
  pub error_message: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMonthlyJobUpsertInput {
  pub job_name: String,
  pub enabled: bool,
  pub report_month_mode: String,
  pub schedule_day: i64,
  pub schedule_hour: i64,
  pub schedule_minute: i64,
  pub trigger_source: String,
  pub keyword: String,
  pub source_label: String,
  pub protocol: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HermesTaskDraftInput {
  pub title: String,
  pub instruction: String,
  #[serde(default = "default_hermes_source_type")]
  pub source_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HermesTaskDraftSummary {
  pub id: String,
  pub title: String,
  pub instruction: String,
  pub source_type: String,
  pub source_label: String,
  pub report_month: String,
  pub source_snapshot_id: String,
  pub payload_path: String,
  pub payload_size_bytes: i64,
  pub generated_at: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HermesTaskResultInput {
  pub draft_id: Option<String>,
  pub title: String,
  pub status: String,
  pub summary: String,
  pub payload_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HermesTaskResultSummary {
  pub id: String,
  pub draft_id: String,
  pub draft_title: String,
  pub title: String,
  pub status: String,
  pub summary: String,
  pub source_type: String,
  pub source_label: String,
  pub report_month: String,
  pub source_snapshot_id: String,
  pub payload_path: String,
  pub payload_size_bytes: i64,
  pub generated_at: String,
  pub created_at: String,
  pub updated_at: String,
}

fn default_hermes_source_type() -> String {
  "latestNodeReport".to_string()
}

fn default_hermes_inbox_dir() -> String {
  "data/hermes/inbox".to_string()
}

fn default_hermes_outbox_dir() -> String {
  "data/hermes/outbox".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageConfig {
  pub database_file: String,
  pub export_dir: String,
  pub upload_dir: String,
  #[serde(default = "default_hermes_inbox_dir")]
  pub hermes_inbox_dir: String,
  #[serde(default = "default_hermes_outbox_dir")]
  pub hermes_outbox_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
  pub app_name: String,
  pub storage: StorageConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedAppConfig {
  pub app_name: String,
  pub app_data_dir: String,
  pub config_file_path: String,
  pub database_path: String,
  pub export_dir: String,
  pub upload_dir: String,
  pub hermes_inbox_dir: String,
  pub hermes_outbox_dir: String,
  pub storage: StorageConfig,
}
