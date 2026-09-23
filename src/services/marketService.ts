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

export interface MarketStatsResponse {
  hasData: boolean;
  message?: string;
  datasetId: string | null;
  datasetName: string | null;
  updatedAt?: string;
  totalRows?: number;
  totalColumns?: number;
  activeSheetName?: string;
  availableSheets?: string[];
  kpis: MarketKPIs;
  brandsRanking: BrandStat[];
  phevRanking: PhevStat[];
  selectedBrand: string;
  modelsBreakdown: ModelStat[];
  availableBrands: string[];
  timeEvolution?: TimeEvolutionPoint[];
  modelDistribution?: ModelDistributionSlice[];
  topModels?: TopModelItem[];
  regionalData?: RegionalDataItem[];
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
    energyFilter?: string;
    originFilter?: string;
    minSales?: number;
  }): Promise<MarketStatsResponse | null> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.importId) searchParams.append('importId', params.importId);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.energyFilter && params.energyFilter !== 'all') {
        searchParams.append('energyFilter', params.energyFilter);
      }
      if (params?.originFilter && params.originFilter !== 'all') {
        searchParams.append('originFilter', params.originFilter);
      }
      if (params?.minSales) searchParams.append('minSales', String(params.minSales));

      const queryStr = searchParams.toString();
      const res = await fetch(`/api/market-stats${queryStr ? `?${queryStr}` : ''}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch market stats: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Erreur getMarketStats:', err);
      return null;
    }
  },
};
