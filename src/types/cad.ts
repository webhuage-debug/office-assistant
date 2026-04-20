export const CAD_SOURCE_TYPE_OPTIONS = [
  "DWG",
  "DXF",
  "PDF",
  "PNG",
  "JPG",
  "SVG",
  "其他",
] as const;

export const CAD_STATUS_OPTIONS = ["待识别", "识别中", "已完成", "识别失败"] as const;

export type CadSourceTypeValue = (typeof CAD_SOURCE_TYPE_OPTIONS)[number];
export type CadStatusValue = (typeof CAD_STATUS_OPTIONS)[number];

export interface CadDocumentCreateInput {
  projectId?: string;
  sourcePath: string;
  sourceType: CadSourceTypeValue;
  note: string;
}

export interface CadDocumentSummary {
  id: string;
  projectId: string | null;
  projectNo: string | null;
  customerName: string | null;
  originalFileName: string;
  sourceType: string;
  sourcePath: string;
  storagePath: string;
  fileSizeBytes: number;
  status: CadStatusValue | string;
  analysisJobCount: number;
  latestJobStatus: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CadPipelineStats {
  totalDocuments: number;
  pendingDocuments: number;
  processingDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  linkedProjects: number;
}
