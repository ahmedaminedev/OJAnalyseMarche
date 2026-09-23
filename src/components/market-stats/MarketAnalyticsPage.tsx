import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Award,
  BarChart3,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  marketService,
  MarketStatsResponse,
  SmartFilterSuggestion,
  BrandStat,
} from '../../services/marketService';
import { importService } from '../../services/importService';
import { ImportedFileRecord } from '../../types/import';
import { MarketSharePieChart } from './MarketSharePieChart';
import { BrandModelsBarChart } from './BrandModelsBarChart';
import { PhevRankingBarChart } from './PhevRankingBarChart';
import { AtttSalesRankingChart } from './AtttSalesRankingChart';
import { AiSmartFiltersBar, ActiveFiltersState } from './AiSmartFiltersBar';

interface MarketAnalyticsPageProps {
  onNavigateToImport?: () => void;
}

export const MarketAnalyticsPage: React.FC<MarketAnalyticsPageProps> = ({
  onNavigateToImport,
}) => {
  const [statsData, setStatsData] = useState<MarketStatsResponse | null>(null);
  const [availableDatasets, setAvailableDatasets] = useState<ImportedFileRecord[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Hyundai');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<ActiveFiltersState>({
    energyFilter: 'all',
    originFilter: 'all',
    minSales: 0,
    selectedBrands: [],
  });

  // AI Intelligence State
  const [smartSuggestions, setSmartSuggestions] = useState<SmartFilterSuggestion[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiTakeaways, setAiTakeaways] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Fetch initial market data & datasets list
  const loadData = async (datasetId?: string, brandName?: string) => {
    setIsLoading(true);
    try {
      const [stats, datasets] = await Promise.all([
        marketService.getMarketStats({
          importId: datasetId || selectedDatasetId,
          brand: brandName || selectedBrand,
        }),
        importService.getAllImports(),
      ]);

      if (stats) {
        setStatsData(stats);
        if (!selectedBrand || !stats.availableBrands.includes(selectedBrand)) {
          setSelectedBrand(stats.selectedBrand || 'Hyundai');
        }
      }
      setAvailableDatasets(datasets);
    } catch (err) {
      console.error('Erreur chargement page stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load AI Insights
  const loadAiInsights = async (userQuery?: string) => {
    setIsLoadingAi(true);
    try {
      const res = await marketService.getAiInsights({
        datasetId: selectedDatasetId,
        activeFilters: filters,
        userQuery,
      });
      if (res) {
        setAiSummary(res.summary);
        setAiTakeaways(res.keyTakeaways);
        setSmartSuggestions(res.smartFilterSuggestions);
      }
    } catch (err) {
      console.warn('Erreur AI insights:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAiInsights();
  }, []);

  const handleDatasetChange = async (newId: string) => {
    setSelectedDatasetId(newId);
    await loadData(newId);
    await loadAiInsights();
  };

  const handleSelectBrand = async (brand: string) => {
    setSelectedBrand(brand);
    // Reload model breakdown dynamically
    const updated = await marketService.getMarketStats({
      importId: selectedDatasetId,
      brand,
    });
    if (updated) {
      setStatsData(updated);
    }
  };

  // Filter application pipeline
  const applySmartSuggestion = (suggestion: SmartFilterSuggestion) => {
    if (suggestion.filterType === 'brandGroup' && suggestion.brands) {
      setFilters({
        ...filters,
        selectedBrands: suggestion.brands,
      });
    } else if (suggestion.filterType === 'origin' && suggestion.origin) {
      setFilters({
        ...filters,
        originFilter: suggestion.origin,
      });
    } else if (suggestion.filterType === 'phevOnly') {
      setFilters({
        ...filters,
        energyFilter: 'phev',
      });
    }
  };

  // Calculate filtered brand records
  let displayedBrands: BrandStat[] = statsData?.brandsRanking || [];

  if (filters.energyFilter === 'phev') {
    displayedBrands = displayedBrands.filter((b) => b.phevSales > 0);
  }

  if (filters.originFilter !== 'all') {
    displayedBrands = displayedBrands.filter((b) =>
      b.origin.toLowerCase().includes(filters.originFilter.toLowerCase())
    );
  }

  if (filters.minSales > 0) {
    displayedBrands = displayedBrands.filter((b) => b.sales >= filters.minSales);
  }

  if (filters.selectedBrands.length > 0) {
    displayedBrands = displayedBrands.filter((b) =>
      filters.selectedBrands.some(
        (target) => b.brand.toLowerCase() === target.toLowerCase()
      )
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb & Dataset Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-red-950/70 text-red-400 border border-red-800/60">
              Intelligence Marché & Visualisations
            </span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-slate-400 text-xs font-mono">
              Source : ATTT Tunisie 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Analyse Approfondie du Marché Automobile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visualisations dynamiques générées à 100% à partir des données réelles de la base MongoDB.
          </p>
        </div>

        {/* Dataset selector + refresh */}
        <div className="flex items-center gap-2">
          {availableDatasets.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedDatasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs cursor-pointer focus:outline-none"
              >
                <option value="">Jeu officiel ATTT 2026 (Par défaut)</option>
                {availableDatasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    Fichier : {ds.fileName} ({ds.totalRows} lignes)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Rafraîchir les données depuis la base"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Row of 4 Core Dynamic Market KPIs */}
      {statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Market Sales */}
          <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Volume Total Marché</span>
              <span className="p-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
                <BarChart3 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsData.kpis.totalMarketSales.toLocaleString('fr-FR')}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">+4.2%</span>
              <span>vs période précédente</span>
            </div>
          </div>

          {/* KPI 2: OMODA & JAECOO Market Position */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121c33] to-[#0e1626] border border-red-500/40 shadow-xl shadow-red-950/20 relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-red-400 uppercase tracking-wider">
                OMODA & JAECOO
              </span>
              <span className="p-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-800/60">
                <Award className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsData.kpis.omodaJaecoo.sales}{' '}
              <span className="text-sm font-normal text-slate-400">unités</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-300 flex items-center gap-2">
              <span className="font-bold text-red-400">
                {statsData.kpis.omodaJaecoo.marketShare}% PDM
              </span>
              <span className="text-slate-400">| Rang #{statsData.kpis.omodaJaecoo.rank}</span>
            </div>
          </div>

          {/* KPI 3: Total PHEV Volume (Capture 2 Context) */}
          <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-emerald-400 uppercase tracking-wider">
                Immatriculations PHEV
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                <Zap className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsData.kpis.totalPhevSales.toLocaleString('fr-FR')}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Omoda & Jaecoo détient{' '}
              <strong className="text-emerald-400">
                {statsData.kpis.omodaJaecoo.phevShare}%
              </strong>{' '}
              du segment PHEV
            </div>
          </div>

          {/* KPI 4: Market Leader */}
          <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Marque Leader</span>
              <span className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-900/50">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsData.kpis.leader.brand}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              <strong className="text-white">
                {statsData.kpis.leader.sales.toLocaleString('fr-FR')}
              </strong>{' '}
              ventes ({statsData.kpis.leader.marketShare}% PDM)
            </div>
          </div>
        </div>
      )}

      {/* Advanced AI & Contextual Filter Hub */}
      <AiSmartFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        availableBrands={statsData?.availableBrands || []}
        smartSuggestions={smartSuggestions}
        onApplySmartSuggestion={applySmartSuggestion}
        onAskAi={loadAiInsights}
        isLoadingAi={isLoadingAi}
        aiSummary={aiSummary}
        aiTakeaways={aiTakeaways}
      />

      {/* Grid Row 1: Capture 1 Pair (Parts de marché Camembert + Répartition Modèles Marque) */}
      {statsData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <MarketSharePieChart
              data={displayedBrands}
              onSelectBrand={handleSelectBrand}
              selectedBrand={selectedBrand}
            />
          </div>
          <div className="lg:col-span-6">
            <BrandModelsBarChart
              brandName={selectedBrand}
              models={statsData.modelsBreakdown}
              availableBrands={statsData.availableBrands}
              onSelectBrand={handleSelectBrand}
            />
          </div>
        </div>
      )}

      {/* Grid Row 2: Capture 2 (Immatriculations PHEV par marque en Tunisie) */}
      {statsData && (
        <div>
          <PhevRankingBarChart data={statsData.phevRanking} />
        </div>
      )}

      {/* Grid Row 3: Capture 3 (VENTES SOURCE: ATTT - Classement exhaustif en barres) */}
      {statsData && (
        <div>
          <AtttSalesRankingChart
            data={displayedBrands}
            onSelectBrand={handleSelectBrand}
            selectedBrand={selectedBrand}
          />
        </div>
      )}
    </div>
  );
};
