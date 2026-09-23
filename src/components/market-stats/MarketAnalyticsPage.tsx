import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Award,
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  ArrowRight,
} from 'lucide-react';
import {
  marketService,
  MarketStatsResponse,
  BrandStat,
} from '../../services/marketService';
import { importService } from '../../services/importService';
import { ImportedFileRecord } from '../../types/import';
import { MarketSharePieChart } from './MarketSharePieChart';
import { BrandModelsBarChart } from './BrandModelsBarChart';
import { PhevRankingBarChart } from './PhevRankingBarChart';
import { AtttSalesRankingChart } from './AtttSalesRankingChart';
import {
  AdvancedMarketFiltersBar,
  AdvancedFiltersState,
} from './AdvancedMarketFiltersBar';

interface MarketAnalyticsPageProps {
  onNavigateToImport?: () => void;
  onNavigateToAssistant?: () => void;
}

export const MarketAnalyticsPage: React.FC<MarketAnalyticsPageProps> = ({
  onNavigateToImport,
  onNavigateToAssistant,
}) => {
  const [statsData, setStatsData] = useState<MarketStatsResponse | null>(null);
  const [availableDatasets, setAvailableDatasets] = useState<ImportedFileRecord[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Non-AI Advanced Filters State
  const [filters, setFilters] = useState<AdvancedFiltersState>({
    searchQuery: '',
    selectedBrands: [],
    originFilter: 'all',
    energyFilter: 'all',
    minSales: 0,
    topLimit: 0,
    sortBy: 'sales_desc',
  });

  // Fetch market stats & available datasets
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
          setSelectedBrand(stats.selectedBrand || stats.availableBrands[0] || '');
        }
      }
      setAvailableDatasets(datasets);
      if (!selectedDatasetId && datasets.length > 0) {
        setSelectedDatasetId(datasets[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement page stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDatasetChange = async (newId: string) => {
    setSelectedDatasetId(newId);
    await loadData(newId);
  };

  const handleSelectBrand = async (brand: string) => {
    setSelectedBrand(brand);
    const updated = await marketService.getMarketStats({
      importId: selectedDatasetId,
      brand,
    });
    if (updated) {
      setStatsData(updated);
    }
  };

  const hasImportedData = Boolean(
    statsData && statsData.hasData && statsData.totalRows && statsData.totalRows > 0
  );

  // Filter application pipeline
  let displayedBrands: BrandStat[] = [...(statsData?.brandsRanking || [])];

  // 1. Text Search Query
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    displayedBrands = displayedBrands.filter((b) =>
      b.brand.toLowerCase().includes(q)
    );
  }

  // 2. Multi-brand selection
  if (filters.selectedBrands.length > 0) {
    const setBrands = new Set(filters.selectedBrands.map((b) => b.toLowerCase()));
    displayedBrands = displayedBrands.filter((b) =>
      setBrands.has(b.brand.toLowerCase())
    );
  }

  // 3. Geographic Origin
  if (filters.originFilter !== 'all') {
    displayedBrands = displayedBrands.filter((b) =>
      b.origin.toLowerCase().includes(filters.originFilter.toLowerCase())
    );
  }

  // 4. Energy Filter
  if (filters.energyFilter === 'phev') {
    displayedBrands = displayedBrands.filter((b) => b.phevSales > 0);
  } else if (filters.energyFilter === 'ice') {
    displayedBrands = displayedBrands.filter((b) => b.sales > b.phevSales);
  }

  // 5. Minimum Sales Threshold
  if (filters.minSales > 0) {
    displayedBrands = displayedBrands.filter((b) => b.sales >= filters.minSales);
  }

  // 6. Sorting
  if (filters.sortBy === 'sales_asc') {
    displayedBrands.sort((a, b) => a.sales - b.sales);
  } else if (filters.sortBy === 'phev_desc') {
    displayedBrands.sort((a, b) => b.phevSales - a.phevSales);
  } else if (filters.sortBy === 'share_desc') {
    displayedBrands.sort((a, b) => b.marketShare - a.marketShare);
  } else if (filters.sortBy === 'name_asc') {
    displayedBrands.sort((a, b) => a.brand.localeCompare(b.brand));
  } else {
    displayedBrands.sort((a, b) => b.sales - a.sales);
  }

  // 7. Top Limit
  if (filters.topLimit > 0) {
    displayedBrands = displayedBrands.slice(0, filters.topLimit);
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb & Dataset Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-red-950/70 text-red-400 border border-red-800/60">
              Observatoire & Visualisations
            </span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-slate-400 text-xs font-mono">
              {statsData?.datasetName
                ? `Fichier : ${statsData.datasetName} (${statsData.totalRows} lignes)`
                : 'Aucun fichier actif'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Analyse Complète du Marché Automobile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Explorez les données de vos fichiers Excel avec des filtres combinés et visualisations dynamiques.
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
                {availableDatasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.fileName} ({ds.totalRows} lignes)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rafraîchir les données depuis la base"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Empty State Banner if no imported Excel file exists */}
      {!hasImportedData ? (
        <div className="rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#0d1628] to-[#141f36] border-2 border-dashed border-red-500/40 p-8 sm:p-12 text-center shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-red-600/30">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Aucun fichier de données importé
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Pour visualiser les classements, parts de marché et graphiques détaillés, vous devez d'abord importer un fichier Excel (.xlsx ou .xls).
            </p>

            {onNavigateToImport && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToImport}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-950/50 flex items-center gap-2.5 mx-auto transition-transform active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importer un fichier Excel maintenant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Row of 4 Core Dynamic Market KPIs */}
          {statsData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total Market Sales */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Volume Total Fichier</span>
                  <span className="p-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/50">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {statsData.kpis.totalMarketSales.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">{statsData.totalRows}</span> lignes réelles analysées
                </div>
              </div>

              {/* KPI 2: Leader */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Marque N°1</span>
                  <span className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-900/50">
                    <Award className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono truncate">
                  {statsData.kpis.leader.brand}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-between font-mono">
                  <span className="text-amber-400 font-bold">
                    {statsData.kpis.leader.sales.toLocaleString('fr-FR')} unités
                  </span>
                  <span>{statsData.kpis.leader.marketShare}% PDM</span>
                </div>
              </div>

              {/* KPI 3: Secondary / PHEV Volume */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Segment PHEV</span>
                  <span className="p-1.5 rounded-lg bg-red-950/60 text-[#ff284d] border border-red-900/50">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#ff284d] font-mono">
                  {statsData.kpis.totalPhevSales.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  {statsData.kpis.totalPhevSales > 0 ? 'Immatriculations rechargeables' : 'Non spécifié'}
                </div>
              </div>

              {/* KPI 4: Total Brands */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Entités Détectées</span>
                  <span className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {statsData.kpis.totalBrands}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  Catégories ou marques distinctes
                </div>
              </div>
            </div>
          )}

          {/* 100% NON-AI ADVANCED FILTERS BAR */}
          {statsData && (
            <AdvancedMarketFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              availableBrands={statsData.availableBrands}
              totalRecordsCount={statsData.brandsRanking.length}
              filteredRecordsCount={displayedBrands.length}
            />
          )}

          {/* 4 Interactive Visualizations */}
          {statsData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chart 1: Donut Part de Marché */}
              <div className="lg:col-span-6 xl:col-span-5">
                <MarketSharePieChart
                  data={displayedBrands}
                  onSelectBrand={handleSelectBrand}
                  selectedBrand={selectedBrand}
                />
              </div>

              {/* Chart 2: Modèles de la marque sélectionnée */}
              <div className="lg:col-span-6 xl:col-span-7">
                <BrandModelsBarChart
                  brandName={selectedBrand}
                  models={statsData.modelsBreakdown}
                  availableBrands={statsData.availableBrands}
                  onSelectBrand={handleSelectBrand}
                />
              </div>

              {/* Chart 3: Podium PHEV (Hybrides Rechargeables) */}
              <div className="lg:col-span-12 xl:col-span-5">
                <PhevRankingBarChart data={statsData.phevRanking} />
              </div>

              {/* Chart 4: Ventes Complètes par Marque */}
              <div className="lg:col-span-12 xl:col-span-7">
                <AtttSalesRankingChart
                  data={displayedBrands}
                  onSelectBrand={handleSelectBrand}
                  selectedBrand={selectedBrand}
                  datasetName={statsData.datasetName || undefined}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
