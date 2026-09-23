export type ImportStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'PARTIAL' | 'ERROR';

export type DetectedDataType = 'text' | 'number' | 'date' | 'boolean' | 'empty' | 'mixed';

export interface ColumnInfo {
  index: number;
  key: string;
  name: string;
  detectedType: DetectedDataType;
  totalCount: number;
  emptyCount: number;
  uniqueCount: number;
  invalidCount: number;
  isUnnamed: boolean;
  mostlyEmpty: boolean;
  sampleValues: (string | number | boolean)[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueType =
  | 'unnamed_column'
  | 'empty_row'
  | 'empty_cells'
  | 'inconsistent_type'
  | 'invalid_date'
  | 'number_as_text'
  | 'potential_duplicates'
  | 'mostly_empty_column'
  | 'empty_sheet';

export interface ValidationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  count: number;
  columnKey?: string;
  columnName?: string;
  sampleLocations?: string[];
}

export interface SheetAnalysis {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  previewRows: Record<string, unknown>[];
  totalEmptyCells: number;
  completelyEmptyRows: number;
  duplicateRowsCount: number;
  issues: ValidationIssue[];
}

export interface ExcelParseResult {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  sheets: Record<string, SheetAnalysis>;
  parsedAt: string;
}

export interface ImportedFileRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileSizeBytes: number;
  importedAt: string;
  importedBy: string;
  status: ImportStatus;
  availableSheets: string[];
  activeSheetName: string;
  totalRows: number;
  totalColumns: number;
  totalEmptyCells: number;
  issuesCount: {
    errors: number;
    warnings: number;
    info: number;
  };
  sheetSummaries: {
    name: string;
    rows: number;
    columns: number;
  }[];
  // Stored preview data (up to 100-200 rows)
  previewData: {
    columns: ColumnInfo[];
    rows: Record<string, unknown>[];
  };
  issues: ValidationIssue[];
  notes?: string;
}
