import type {
  CadDocumentCreateInput,
  CadDocumentSummary,
  CadPipelineStats,
} from "@/types/cad";
import { callBackend } from "@/services/backendClient";

export async function listCadDocuments(): Promise<CadDocumentSummary[]> {
  return callBackend<CadDocumentSummary[]>("list_cad_documents");
}

export async function createCadDocument(input: CadDocumentCreateInput): Promise<CadDocumentSummary> {
  return callBackend<CadDocumentSummary>("create_cad_document", { input });
}

export async function deleteCadDocument(id: string): Promise<void> {
  await callBackend<void>("delete_cad_document", { id });
}

export async function getCadPipelineStats(): Promise<CadPipelineStats> {
  return callBackend<CadPipelineStats>("get_cad_pipeline_stats");
}
