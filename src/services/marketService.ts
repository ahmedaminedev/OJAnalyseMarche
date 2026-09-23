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

export interface MarketStatsResponse {
  datasetId: string;
  datasetName: string;
  updatedAt: string;
  kpis: MarketKPIs;
  brandsRanking: BrandStat[];
  phevRanking: PhevStat[];
  selectedBrand: string;
  modelsBreakdown: ModelStat[];
  availableBrands: string[];
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

class MarketService {
  async getMarketStats(params?: {
    importId?: string;
    brand?: string;
    originFilter?: string;
    minSales?: number;
  }): Promise<MarketStatsResponse | null> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.importId) searchParams.append('importId', params.importId);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.originFilter) searchParams.append('originFilter', params.originFilter);
      if (params?.minSales) searchParams.append('minSales', String(params.minSales));

      const url = `/api/market-stats?${searchParams.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Erreur chargement market stats:', err);
      return null;
    }
  }

  async getAiInsights(payload: {
    datasetId?: string;
    activeFilters?: any;
    userQuery?: string;
  }): Promise<AiMarketInsightsResponse | null> {
    try {
      const res = await fetch('/api/market-stats/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Erreur génération insights IA:', err);
      return null;
    }
  }
}

export const marketService = new MarketService();
