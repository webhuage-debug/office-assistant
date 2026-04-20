import { callBackend } from "@/services/backendClient";
import type {
  NodeEntrySummary,
  NodeImportBatchSummary,
  NodeImportInput,
  NodeListFilters,
  NodeTestRequest,
  NodeTestResultSummary,
  NodeTestRunDetail,
  NodeTestRunSummary,
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
