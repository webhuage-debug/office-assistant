import { callBackend } from "@/services/backendClient";
import type {
  NodeEntrySummary,
  NodeImportBatchSummary,
  NodeImportInput,
  NodeListFilters,
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
