export interface BrandStat {
  brand: string;
  sales: number;
  phevSales: number;
  origin: string;
  color: string;
  isOmoda: boolean;
  rank: number;
  marketShare: number;
  phevShare: number;
}

export interface PhevStat {
  brand: string;
  count: number;
  color: string;
  isHighlight: boolean;
}

export interface ModelStat {
  model: string;
  sales: number;
  isHighlight?: boolean;
}

export interface SegmentStat {
  name: string;
  count: number;
  percentage: number;
}

export interface MarketKPIs {
  totalMarketSales: number;
  totalPhevSales: number;
  totalBrands: number;
  leader: {
    brand: string;
    sales: number;
    marketShare: number;
  };
  lowest?: {
    brand: string;
    sales: number;
    marketShare: number;
  };
  omodaJaecoo: {
    brand: string;
    sales: number;
    phevSales: number;
    marketShare: number;
    rank: number;
    phevRank: number;
    phevShare: number;
  };
  chineseMarketShare: number;
}

export interface TimeEvolutionPoint {
  month: string;
  value1: number;
  value2?: number;
}

export interface ModelDistributionSlice {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopModelItem {
  rank: number;
  name: string;
  salesCount: number;
  share: string;
}

export interface RegionalDataItem {
  region: string;
  sales: number;
  percentage: number;
}

export interface SemanticColumnProfile {
  columnKey: string;
  originalHeader: string;
  detectedDataType: 'string' | 'number' | 'date' | 'boolean' | 'empty';
  semanticRole: string;
  confidence: number;
  explanation: string;
  uniqueCount: number;
  nullCount: number;
  sampleValues: any[];
  numericStats?: {
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
  topCategories?: Array<{
    value: string;
    count: number;
    sharePercent: number;
  }>;
}

export interface SemanticAnalysisPlan {
  primaryDimensionCol: string;
  subDimensionCol?: string;
  segmentCol?: string;
  primaryMetricCol: string;
  temporalMetricCols?: string[];
  isWideTemporalFormat?: boolean;
  phevMetricCol?: string;
  energyCol?: string;
  temporalCol?: string;
  geographicCol?: string;
  priceCol?: string;
  dimensionRoleExplanation: string;
  metricRoleExplanation: string;
}

export interface FilterOptionGroup {
  columnKey: string;
  columnHeader: string;
  semanticRole: string;
  values: Array<{ value: string; count: number }>;
}

export interface CellSuggestion {
  type: 'column' | 'cell_value';
  columnKey: string;
  columnHeader: string;
  value: string;
  label: string;
  subLabel?: string;
  count?: number;
}

export interface MarketStatsResponse {
  hasData: boolean;
  message?: string;
  datasetId: string | null;
  datasetName: string | null;
  updatedAt?: string;
  totalRows?: number;
  totalFilteredRows?: number;
  totalColumns?: number;
  activeSheetName?: string;
  availableSheets?: string[];
  semanticSchema?: {
    profiles: SemanticColumnProfile[];
    plan: SemanticAnalysisPlan;
  } | null;
  kpis: MarketKPIs;
  brandsRanking: BrandStat[];
  phevRanking: PhevStat[];
  selectedBrand: string;
  modelsBreakdown: ModelStat[];
  segmentsBreakdown?: SegmentStat[];
  availableBrands: string[];
  timeEvolution?: TimeEvolutionPoint[];
  modelDistribution?: ModelDistributionSlice[];
  topModels?: TopModelItem[];
  regionalData?: RegionalDataItem[];
  availableFilterOptions?: Record<string, FilterOptionGroup>;
  availablePeriods?: string[];
}

export interface SmartFilterSuggestion {
  id: string;
  title: string;
  description: string;
  filterType: 'brandGroup' | 'origin' | 'minVolume' | 'phevOnly' | 'segment';
  brands?: string[];
  origin?: string;
  models?: string[];
  limit?: number;
}

export interface AiMarketInsightsResponse {
  summary: string;
  keyTakeaways: string[];
  smartFilterSuggestions: SmartFilterSuggestion[];
}

export const marketService = {
  async getMarketStats(params?: {
    importId?: string;
    brand?: string;
    searchQuery?: string;
    cellFilters?: Record<string, string[]>;
    selectedPeriod?: string;
  }): Promise<MarketStatsResponse | null> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.importId) searchParams.append('importId', params.importId);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.searchQuery) searchParams.append('searchQuery', params.searchQuery);
      if (params?.selectedPeriod && params.selectedPeriod !== 'all') {
        searchParams.append('selectedPeriod', params.selectedPeriod);
      }
      if (params?.cellFilters && Object.keys(params.cellFilters).length > 0) {
        searchParams.append('cellFilters', JSON.stringify(params.cellFilters));
      }

      const queryStr = searchParams.toString();
      const res = await fetch(`/api/market-stats${queryStr ? `?${queryStr}` : ''}`);
      if (res.status === 503) {
        console.warn('MongoDB déconnecté lors de la requête market-stats (503).');
        return null;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch market stats: ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error('Erreur getMarketStats:', err);
      return null;
    }
  },

  async getSuggestions(importId?: string, query?: string): Promise<CellSuggestion[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const searchParams = new URLSearchParams();
      if (importId) searchParams.append('importId', importId);
      searchParams.append('q', query.trim());
      const res = await fetch(`/api/market-stats/suggestions?${searchParams.toString()}`);
      if (!res.ok) return [];
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error('Erreur getSuggestions:', err);
      return [];
    }
  },

  async getSchemaAnalysis(importId?: string): Promise<{
    hasData: boolean;
    datasetName?: string;
    totalRows?: number;
    profiles?: SemanticColumnProfile[];
    plan?: SemanticAnalysisPlan;
  } | null> {
    try {
      const res = await fetch(`/api/market-stats/schema-analysis${importId ? `?importId=${importId}` : ''}`);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.error('Erreur getSchemaAnalysis:', e);
      return null;
    }
  },
};
