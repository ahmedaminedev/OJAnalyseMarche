import { ColumnInfo, ValidationIssue, IssueSeverity } from './import';

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WizardStepMeta {
  id: WizardStepId;
  label: string;
  shortLabel: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { id: 1, label: 'Fichier source', shortLabel: 'Fichier', description: 'Sélection et détection CSV / Excel' },
  { id: 2, label: 'Structure des données', shortLabel: 'Structure', description: 'Feuille, en-têtes et plages' },
  { id: 3, label: 'Typage & Rôles', shortLabel: 'Colonnes', description: 'Types, devises, dates et rôles' },
  { id: 4, label: 'Format large / long', shortLabel: 'Unpivot', description: 'Dépivotage des colonnes de périodes' },
  { id: 5, label: 'Nettoyage & Casse', shortLabel: 'Nettoyage', description: 'Trim, casse et fusion des variantes' },
  { id: 6, label: 'Mapping sémantique', shortLabel: 'Mapping', description: 'Suggestions optionnelles de rôles' },
  { id: 7, label: 'Vérification qualité', shortLabel: 'Vérification', description: 'Rapport d’erreurs et aperçu 50 lignes' },
  { id: 8, label: 'Téléversement & Contrôle', shortLabel: 'Envoi', description: 'Lots, réconciliation et intégrité' },
];

export interface FileConfig {
  file: File | null;
  fileName: string;
  fileSizeBytes: number;
  fileHash: string; // SHA-256
  fileType: 'xlsx' | 'xls' | 'csv' | 'unknown';
  csvDelimiter: string; // ';', ',', '\t', '|'
  csvEncoding: string; // 'UTF-8' | 'ISO-8859-1'
  availableSheets: string[];
}

export interface StructureConfig {
  activeSheetName: string;
  headerRowIndex: number; // 0-indexed in raw matrix
  firstDataRowIndex: number; // 0-indexed in raw matrix
  lastDataRowIndex: number | null; // null = to end of sheet
  ignoreEmptyRows: boolean;
  ignoreTotalRows: boolean;
  fillDownMergedCells: boolean;
}

export type WizardColumnType = 'string' | 'number' | 'date' | 'boolean';
export type WizardColumnRole = 'dimension' | 'measure' | 'date' | 'id' | 'ignored';

export interface ColumnSetting {
  key: string;               // Technical safe key: "c_0", "marque_1", etc.
  originalHeader: string;    // Raw value in header cell
  label: string;             // User-editable display name
  type: WizardColumnType;    // User-overridable
  role: WizardColumnRole;    // User-overridable
  isUnnamed: boolean;
  sampleValues: (string | number | boolean | null)[];
  nullCount: number;
  distinctCount: number;
  excelErrorsCount: number;
  dateFormatChoice?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'auto';
  isDateAmbiguous?: boolean;
}

export interface UnpivotConfig {
  enabled: boolean;
  fixedColumnKeys: string[];
  unpivotColumnKeys: string[];
  attributeColumnName: string; // default: "Période"
  valueColumnName: string;     // default: "Volume"
  attributeIsDate: boolean;
}

export interface VariantMergeRule {
  id: string;
  columnKey: string;
  columnName: string;
  variantValue: string;
  targetCanonicalValue: string;
  count: number;
  enabled: boolean;
}

export interface CleaningConfig {
  autoTrim: boolean;
  textCase: 'preserve' | 'upper' | 'lower' | 'title';
  variantMerges: VariantMergeRule[];
}

export interface SemanticMappingConfig {
  brand?: string;
  model?: string;
  energy?: string;
  region?: string;
  date?: string;
  volume?: string;
}

export interface ColumnStatSummary {
  key: string;
  label: string;
  type: WizardColumnType;
  role: WizardColumnRole;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  sampleValues: (string | number | boolean | null)[];
  sum?: number;
  min?: string | number | null;
  max?: string | number | null;
}

export interface QualitySummary {
  errors: number;
  warnings: number;
  infos: number;
  issues: ValidationIssue[];
}

export interface ChecksumItem {
  column: string;
  label: string;
  sum?: number;
  min?: string | number | null;
  max?: string | number | null;
}

export interface UploadChunkState {
  chunkIndex: number;
  totalChunks: number;
  sentRows: number;
  totalRows: number;
  percent: number;
  retries: number;
  statusText: string;
  isCancelled: boolean;
}

export interface ReconciliationReportUI {
  ok: boolean;
  expectedRows: number;
  actualRows: number;
  checksums: Array<{
    column: string;
    label: string;
    expected: any;
    actual: any;
    ok: boolean;
  }>;
  errorMessage?: string;
}
