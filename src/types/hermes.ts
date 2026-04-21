export type HermesTaskSourceType = "latestNodeReport" | "manual";

export interface HermesTaskDraftInput {
  title: string;
  instruction: string;
  sourceType: HermesTaskSourceType;
}

export interface HermesTaskDraftSummary {
  id: string;
  title: string;
  instruction: string;
  sourceType: HermesTaskSourceType;
  sourceLabel: string;
  reportMonth: string;
  sourceSnapshotId: string;
  payloadPath: string;
  payloadSizeBytes: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}
