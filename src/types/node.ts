export interface NodeImportInput {
  sourcePath: string;
  sourceLabel: string;
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
