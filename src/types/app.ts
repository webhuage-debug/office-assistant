export interface StorageConfig {
  databaseFile: string;
  exportDir: string;
  uploadDir: string;
}

export interface AppConfig {
  appName: string;
  storage: StorageConfig;
}

export interface ResolvedAppConfig {
  appName: string;
  appDataDir: string;
  configFilePath: string;
  databasePath: string;
  exportDir: string;
  uploadDir: string;
  storage: StorageConfig;
}

export interface QuotationItemRecord {
  id: string;
  projectId: string;
  productName: string;
  brand: string;
  model: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  subtotalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  projectNo: string;
  customerName: string;
  phone: string;
  address: string;
  roomCount: number;
  planType: string;
  followStage: string;
  contractAmountCents: number;
  quotationItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  remark: string;
  quotationItems: QuotationItemRecord[];
}

export interface ProjectFilters {
  projectNo?: string;
  customerName?: string;
  phone?: string;
}

export interface QuotationItemFormValue {
  productName: string;
  brand: string;
  model: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface ProjectFormState {
  projectNo: string;
  customerName: string;
  phone: string;
  address: string;
  roomCount: string;
  planType: string;
  followStage: string;
  remark: string;
  quotationItems: QuotationItemFormValue[];
}

export interface ProjectUpsertInput {
  projectNo: string;
  customerName: string;
  phone: string;
  address: string;
  roomCount: number;
  planType: string;
  followStage: string;
  remark: string;
  quotationItems: Array<{
    productName: string;
    brand: string;
    model: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
  }>;
}

export interface DashboardStats {
  totalProjects: number;
  followUpProjects: number;
  signedProjects: number;
  totalContractAmountCents: number;
}

export interface ExportResult {
  kind: "json" | "csv" | "database" | "node-report";
  primaryPath: string;
  paths: string[];
  generatedAt: string;
}
