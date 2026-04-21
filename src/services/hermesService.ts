import { callBackend } from "@/services/backendClient";
import type { HermesTaskDraftInput, HermesTaskDraftSummary } from "@/types/hermes";

export async function listHermesTaskDrafts(limit = 10): Promise<HermesTaskDraftSummary[]> {
  return callBackend<HermesTaskDraftSummary[]>("list_hermes_task_drafts", { limit });
}

export async function createHermesTaskDraft(input: HermesTaskDraftInput): Promise<HermesTaskDraftSummary> {
  return callBackend<HermesTaskDraftSummary>("create_hermes_task_draft", { input });
}

export async function deleteHermesTaskDraft(id: string): Promise<void> {
  await callBackend<void>("delete_hermes_task_draft", { id });
}
