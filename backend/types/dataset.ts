import { ObjectId } from 'mongodb';

export type DatasetStatus = 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';

export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export type ColumnRole = 'dimension' | 'measure' | 'date' | 'id' | 'ignored';

export interface ColumnValueCount {
  value: any;
  count: number;
}

export interface DatasetColumn {
  key: string;            // Identifiant technique sûr et unique (slug ASCII, ex: "ventes_2026", "c_1")
  label: string;          // Nom d'origine dans le fichier
  type: ColumnType;       // "string" | "number" | "date" | "boolean"
  role: ColumnRole;       // "dimension" | "measure" | "date" | "id" | "ignored"
  nullCount: number;
  distinctCount: number;
  values?: ColumnValueCount[];   // Seulement si distinctCount <= 200
  min?: number | string | null;  // Pour number et date
  max?: number | string | null;  // Pour number et date
}

export interface SemanticMapping {
  brand?: string;
  model?: string;
  energy?: string;
  region?: string;
  date?: string;
  volume?: string;
  [key: string]: string | undefined;
}

export interface ValidationIssue {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  columnKey?: string;
  columnName?: string;
}

export interface QualityReport {
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
}

export interface ColumnChecksum {
  column: string; // column key
  expected: number | string | null;
  actual: number | string | null;
  ok: boolean;
}

export interface ReconciliationReport {
  expectedRows: number;
  actualRows: number;
  checksums: ColumnChecksum[];
  verified: boolean;
}

export interface DatasetDocument {
  _id: ObjectId;
  name: string;
  fileName: string;
  fileHash: string; // SHA-256
  fileSizeBytes: number;
  sheetName: string;
  importedAt: Date;
  importedBy: string;
  status: DatasetStatus;
  rowCount: number;
  errorMessage?: string;
  columns: DatasetColumn[];
  mapping?: SemanticMapping;
  quality?: QualityReport;
  reconciliation?: ReconciliationReport;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RowDocument {
  _id?: ObjectId;
  datasetId: ObjectId;
  rowNumber: number;
  chunkIndex?: number;
  data: Record<string, string | number | boolean | Date | null>;
}
