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

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageConfig {
  pub database_file: String,
  pub export_dir: String,
  pub upload_dir: String,
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
  pub storage: StorageConfig,
}
