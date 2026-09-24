import { ColumnType } from './dataset';

export type FilterLogic = 'AND' | 'OR';

export type FilterOperator =
  // String & common
  | 'in'
  | 'nin'
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  // Number
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  // Date
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
  of: string;          // Measure alias or field name
  within?: string[];   // Partition fields for percentage of total
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

export interface FacetValueItem {
  value: any;
  count: number;
}

export interface DimensionFacet {
  field: string;
  label: string;
  type: 'string' | 'boolean';
  values: FacetValueItem[];
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

export interface MultiDatasetQueryRequest {
  datasetIds: string[];
  semanticFields: string[];
  filters?: FilterGroup;
  groupBy?: Array<{
    semanticField: string;
    granularity?: DateGranularity;
  }>;
  measures?: Array<{
    semanticField: string;
    agg: MeasureAgg;
    alias?: string;
  }>;
  sort?: SortField[];
  limit?: number;
}

export interface MultiDatasetQueryResult {
  data: Record<string, any>[];
  datasets: Array<{
    id: string;
    name: string;
    fileName: string;
  }>;
  meta: {
    executionTimeMs: number;
    totalDatasets: number;
    rowCount: number;
  };
}
