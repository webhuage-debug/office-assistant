import type { ExportResult } from "@/types/app";
import { callBackend } from "@/services/backendClient";

export async function exportJsonBackup(): Promise<ExportResult> {
  return callBackend<ExportResult>("export_json_backup");
}

export async function exportCsvBackup(): Promise<ExportResult> {
  return callBackend<ExportResult>("export_csv_backup");
}

export async function exportDatabaseBackup(): Promise<ExportResult> {
  return callBackend<ExportResult>("export_database_backup");
}

export async function importJsonBackup(content: string): Promise<ExportResult> {
  return callBackend<ExportResult>("import_json_backup", { content });
}
