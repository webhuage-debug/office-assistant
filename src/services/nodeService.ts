import { callBackend } from "@/services/backendClient";
import type { ExportResult } from "@/types/app";
import type {
  NodeEntrySummary,
  NodeImportBatchSummary,
  NodeImportInput,
  NodeListFilters,
  NodeMonthlyJobRunSummary,
  NodeMonthlyJobSummary,
  NodeMonthlyJobUpsertInput,
  NodeReportExportInput,
  NodeReportComparisonSummary,
  NodeReportSnapshotSummary,
  NodeTestRequest,
  NodeTestResultSummary,
  NodeTestRunDetail,
  NodeTestRunSummary,
  NodeQualityStats,
  NodeQualitySummary,
  NodeOverviewStats,
} from "@/types/node";

export async function listNodeEntries(filters: NodeListFilters = {}): Promise<NodeEntrySummary[]> {
  return callBackend<NodeEntrySummary[]>("list_node_entries", { filters });
}

export async function importNodeEntries(input: NodeImportInput): Promise<NodeImportBatchSummary> {
  return callBackend<NodeImportBatchSummary>("import_node_entries", { input });
}

export async function deleteNodeEntry(id: string): Promise<void> {
  await callBackend<void>("delete_node_entry", { id });
}

export async function getNodeOverviewStats(): Promise<NodeOverviewStats> {
  return callBackend<NodeOverviewStats>("get_node_overview_stats");
}

export async function runNodeTests(input: NodeTestRequest): Promise<NodeTestRunDetail> {
  return callBackend<NodeTestRunDetail>("run_node_tests", { request: input });
}

export async function listNodeTestRuns(limit = 10): Promise<NodeTestRunSummary[]> {
  return callBackend<NodeTestRunSummary[]>("list_node_test_runs", { limit });
}

export async function listNodeTestResults(runId: string): Promise<NodeTestResultSummary[]> {
  return callBackend<NodeTestResultSummary[]>("list_node_test_results", { runId });
}

export async function listNodeQualityRankings(
  filters: NodeListFilters = {},
  limit = 20,
): Promise<NodeQualitySummary[]> {
  return callBackend<NodeQualitySummary[]>("list_node_quality_rankings", { filters, limit });
}

export async function getNodeQualityStats(filters: NodeListFilters = {}): Promise<NodeQualityStats> {
  return callBackend<NodeQualityStats>("get_node_quality_stats", { filters });
}

export async function exportNodeMonthlyReport(input: NodeReportExportInput): Promise<ExportResult> {
  return callBackend<ExportResult>("export_node_monthly_report", { input });
}

export async function listNodeReportSnapshots(limit = 8): Promise<NodeReportSnapshotSummary[]> {
  return callBackend<NodeReportSnapshotSummary[]>("list_node_report_snapshots", { limit });
}

export async function getNodeReportComparison(): Promise<NodeReportComparisonSummary | null> {
  return callBackend<NodeReportComparisonSummary | null>("get_node_report_comparison");
}

export async function listNodeMonthlyJobs(): Promise<NodeMonthlyJobSummary[]> {
  return callBackend<NodeMonthlyJobSummary[]>("list_node_monthly_jobs");
}

export async function listNodeMonthlyJobRuns(limit = 10): Promise<NodeMonthlyJobRunSummary[]> {
  return callBackend<NodeMonthlyJobRunSummary[]>("list_node_monthly_job_runs", { limit });
}

export async function createNodeMonthlyJob(input: NodeMonthlyJobUpsertInput): Promise<NodeMonthlyJobSummary> {
  return callBackend<NodeMonthlyJobSummary>("create_node_monthly_job", { input });
}

export async function updateNodeMonthlyJob(
  id: string,
  input: NodeMonthlyJobUpsertInput,
): Promise<NodeMonthlyJobSummary> {
  return callBackend<NodeMonthlyJobSummary>("update_node_monthly_job", { id, input });
}

export async function deleteNodeMonthlyJob(id: string): Promise<void> {
  await callBackend<void>("delete_node_monthly_job", { id });
}

export async function runNodeMonthlyJobNow(id: string): Promise<NodeMonthlyJobRunSummary> {
  return callBackend<NodeMonthlyJobRunSummary>("run_node_monthly_job_now", { id });
}
