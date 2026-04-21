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

export type HermesTaskResultStatus = "completed" | "needs_review" | "failed";

export interface HermesTaskResultInput {
  draftId?: string;
  title: string;
  status: HermesTaskResultStatus;
  summary: string;
  payloadJson: string;
}

export interface HermesTaskResultSummary {
  id: string;
  draftId: string;
  draftTitle: string;
  title: string;
  status: HermesTaskResultStatus;
  summary: string;
  sourceType: HermesTaskSourceType | "manual";
  sourceLabel: string;
  reportMonth: string;
  sourceSnapshotId: string;
  payloadPath: string;
  payloadSizeBytes: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}
