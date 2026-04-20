export interface NodeImportInput {
  sourcePath: string;
  sourceLabel: string;
}

export interface NodeTestRequest {
  filters: NodeListFilters;
  triggerSource?: string;
}

export interface NodeListFilters {
  keyword?: string;
  sourceLabel?: string;
  protocol?: string;
}

export interface NodeOverviewStats {
  totalNodes: number;
  importBatches: number;
  sourceLabels: number;
  protocolCount: number;
  latestBatchRows: number;
}

export interface NodeImportBatchSummary {
  id: string;
  sourceFileName: string;
  sourceFilePath: string;
  copiedFilePath: string;
  sourceType: string;
  sourceLabel: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  duplicateRows: number;
  invalidRows: number;
  createdAt: string;
  updatedAt: string;
}

export interface NodeEntrySummary {
  id: string;
  nodeName: string;
  protocol: string;
  host: string;
  port: number;
  remark: string;
  sourceLabel: string;
  sourceFileName: string;
  firstSeenBatchId: string;
  lastSeenBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeTestRunSummary {
  id: string;
  triggerSource: string;
  filterSnapshotJson: string;
  scopeSummary: string;
  targetCount: number;
  successCount: number;
  failureCount: number;
  durationMs: number;
  status: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeTestResultSummary {
  id: string;
  runId: string;
  nodeId: string;
  nodeName: string;
  protocol: string;
  host: string;
  port: number;
  resultOrder: number;
  success: boolean;
  latencyMs?: number | null;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeTestRunDetail {
  run: NodeTestRunSummary;
  results: NodeTestResultSummary[];
}

export interface NodeQualitySummary {
  id: string;
  nodeId: string;
  nodeName: string;
  protocol: string;
  host: string;
  port: number;
  sourceLabel: string;
  sourceFileName: string;
  totalTests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageLatencyMs?: number | null;
  score: number;
  recommendationLevel: string;
  recommendationReason: string;
  lastTestAt: string;
}

export interface NodeQualityStats {
  totalRankedNodes: number;
  recommendedNodes: number;
  excellentNodes: number;
  stableNodes: number;
  averageScore: number;
  topScore: number;
}
