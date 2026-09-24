export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export type ColumnRole = 'dimension' | 'measure' | 'date' | 'id' | 'ignored';

export type FilterLogic = 'AND' | 'OR';

export type FilterOperator =
  | 'in'
  | 'nin'
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'before'
  | 'after';

export interface FilterCondition {
  field: string;
  op: FilterOperator;
  value?: any;
}

export interface FilterGroup {
  logic: FilterLogic;
  conditions: Array<FilterCondition | FilterGroup>;
}

export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface GroupByField {
  field: string;
  granularity?: DateGranularity;
}

export type MeasureAgg = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countDistinct';

export interface MeasureField {
  field: string;
  agg: MeasureAgg;
  alias?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortField {
  field: string;
  dir: SortDirection;
}

export type CompareOption = 'previousPeriod' | 'sameLastYear';

export interface ShareOption {
  of: string;
  within?: string[];
}

export interface QueryRequest {
  filters?: FilterGroup;
  groupBy?: GroupByField[];
  measures?: MeasureField[];
  sort?: SortField[];
  limit?: number;
  compare?: CompareOption;
  share?: ShareOption;
}

export interface QueryMeta {
  executionTimeMs: number;
  rowCount: number;
  normalizedQuery: QueryRequest;
}

export interface QueryResult {
  data: Record<string, any>[];
  meta: QueryMeta;
}

export interface DatasetColumn {
  key: string;
  label: string;
  type: ColumnType;
  role: ColumnRole;
  nullCount: number;
  distinctCount: number;
  min?: number | string | null;
  max?: number | string | null;
  values?: Array<{ value: any; count: number }>;
}

export interface DatasetSummary {
  _id: string;
  name: string;
  fileName: string;
  fileHash: string;
  fileSizeBytes: number;
  sheetName: string;
  importedAt: string;
  importedBy: string;
  status: 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';
  rowCount: number;
  columns: DatasetColumn[];
  mapping?: Record<string, string>;
  quality?: {
    errors: number;
    warnings: number;
    info: number;
  };
  reconciliation?: {
    verified: boolean;
    actualRows: number;
  };
}

export interface DimensionFacetValue {
  value: any;
  count: number;
}

export interface DimensionFacet {
  field: string;
  label: string;
  type: 'string' | 'boolean';
  values: DimensionFacetValue[];
  totalDistinct: number;
}

export interface RangeFacet {
  field: string;
  label: string;
  type: 'number' | 'date';
  min: number | string | null;
  max: number | string | null;
  nullCount?: number;
}

export interface FacetsResponse {
  dimensions: Record<string, DimensionFacet>;
  ranges: Record<string, RangeFacet>;
  activeFiltersCount: number;
}

export type ChartType =
  | 'bar'
  | 'stackedBar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'kpi'
  | 'crossTab';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxisField?: string;
  granularity?: DateGranularity;
  measureField?: string;
  agg: MeasureAgg;
  measureAlias?: string;
  secondaryMeasureField?: string;
  secondaryAgg?: MeasureAgg;
  splitByField?: string;
  sortField?: string;
  sortDir: 'asc' | 'desc';
  topN?: number;
  compare?: CompareOption;
  showShare?: boolean;
  cumulative?: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  config: ChartConfig;
  gridSpan: 'half' | 'full' | 'third';
}

export interface SavedView {
  id: string;
  name: string;
  datasetId: string;
  filters: FilterGroup;
  createdAt: string;
}
