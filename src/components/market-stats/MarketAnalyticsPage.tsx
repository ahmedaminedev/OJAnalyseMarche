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
  Cpu,
  ChevronDown,
  ChevronUp,
  LineChart as LineIcon,
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
import { SalesEvolutionChart } from '../dashboard/SalesEvolutionChart';
import {
  DynamicDatabaseFiltersBar,
  DynamicFiltersState,
} from './DynamicDatabaseFiltersBar';

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
  const [showSchemaDrawer, setShowSchemaDrawer] = useState<boolean>(false);

  // Dynamic Database Filters State
  const [dynamicFilters, setDynamicFilters] = useState<DynamicFiltersState>({
    searchQuery: '',
    cellFilters: {},
    selectedPeriod: 'all',
  });

  // Fetch market stats & available datasets
  const loadData = async (
    datasetId?: string,
    brandName?: string,
    customFilters?: DynamicFiltersState
  ) => {
    setIsLoading(true);
    try {
      const activeFilters = customFilters || dynamicFilters;
      const targetId = datasetId || selectedDatasetId;

      const [stats, datasets] = await Promise.all([
        marketService.getMarketStats({
          importId: targetId,
          brand: brandName || selectedBrand,
          searchQuery: activeFilters.searchQuery,
          cellFilters: activeFilters.cellFilters,
          selectedPeriod: activeFilters.selectedPeriod,
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
    // Reset filters on dataset change
    const freshFilters: DynamicFiltersState = {
      searchQuery: '',
      cellFilters: {},
      selectedPeriod: 'all',
    };
    setDynamicFilters(freshFilters);
    await loadData(newId, undefined, freshFilters);
  };

  const handleFiltersChange = async (newFilters: DynamicFiltersState) => {
    setDynamicFilters(newFilters);
    await loadData(selectedDatasetId, selectedBrand, newFilters);
  };

  const handleSelectBrand = async (brand: string) => {
    setSelectedBrand(brand);
    const updated = await marketService.getMarketStats({
      importId: selectedDatasetId,
      brand,
      searchQuery: dynamicFilters.searchQuery,
      cellFilters: dynamicFilters.cellFilters,
      selectedPeriod: dynamicFilters.selectedPeriod,
    });
    if (updated) {
      setStatsData(updated);
    }
  };

  const hasImportedData = Boolean(
    statsData && statsData.hasData && statsData.totalRows && statsData.totalRows > 0
  );

  const displayedBrands: BrandStat[] = statsData?.brandsRanking || [];

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
            Compréhension automatique des types et colonnes de la base, filtres cellulaires et visualisations synchronisées.
          </p>
        </div>

        {/* Dataset selector + schema inspector + refresh */}
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

          {statsData?.semanticSchema?.profiles && (
            <button
              type="button"
              onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-800/60 hover:bg-slate-800 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Inspecter comment le système a compris les colonnes en base"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Schéma Compris ({statsData.semanticSchema.profiles.length})</span>
              {showSchemaDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
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

      {/* Semantic Schema Understanding Drawer */}
      {showSchemaDrawer && statsData?.semanticSchema && (
        <div className="bg-[#0b1324] border border-cyan-900/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Compréhension Sémantique des Données de la Base
                </h3>
                <p className="text-xs text-slate-400">
                  Le système a scanné les colonnes et a automatiquement identifié les types, rôles métiers et métriques à agréger.
                </p>
              </div>
            </div>
            {statsData.semanticSchema.plan && (
              <div className="text-xs text-cyan-300 font-mono bg-cyan-950/60 border border-cyan-800/60 px-3 py-1.5 rounded-xl">
                {statsData.semanticSchema.plan.dimensionRoleExplanation}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {statsData.semanticSchema.profiles.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#080d19] border border-slate-800 hover:border-cyan-800/50 transition-colors flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="font-bold text-white truncate max-w-[160px]">
                      {p.originalHeader}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                      {p.semanticRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {p.explanation}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Type : {p.detectedDataType}</span>
                  <span>Confiance : {Math.round(p.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <span className="text-emerald-400 font-semibold">
                    {statsData.totalFilteredRows !== undefined ? statsData.totalFilteredRows : statsData.totalRows}
                  </span> lignes filtrées sur {statsData.totalRows}
                </div>
              </div>

              {/* KPI 2: Leader */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Leader N°1</span>
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

              {/* KPI 3: Segments Count or PHEV */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">
                    {statsData.segmentsBreakdown && statsData.segmentsBreakdown.length > 0 ? 'Segments Analysés' : 'Ventes PHEV'}
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {statsData.segmentsBreakdown && statsData.segmentsBreakdown.length > 0
                    ? statsData.segmentsBreakdown.length
                    : statsData.kpis.totalPhevSales.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono truncate">
                  {statsData.segmentsBreakdown && statsData.segmentsBreakdown.length > 0
                    ? `Top: ${statsData.segmentsBreakdown[0]?.name || ''}`
                    : `${statsData.kpis.totalMarketSales > 0 ? ((statsData.kpis.totalPhevSales / statsData.kpis.totalMarketSales) * 100).toFixed(1) : 0}% du volume global`}
                </div>
              </div>

              {/* KPI 4: Total Distinct Brands / Entities */}
              <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800/90 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Entités Détectées</span>
                  <span className="p-1.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-900/50">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {statsData.kpis.totalBrands}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  Marques ou catégories distinctes
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC DATABASE FILTERS BAR (100% LINKED TO DATABASE) */}
          {statsData && (
            <DynamicDatabaseFiltersBar
              datasetId={selectedDatasetId}
              datasetName={statsData.datasetName || undefined}
              totalRows={statsData.totalRows || 0}
              totalFilteredRows={statsData.totalFilteredRows}
              availableFilterOptions={statsData.availableFilterOptions}
              availablePeriods={statsData.availablePeriods}
              filters={dynamicFilters}
              onFiltersChange={handleFiltersChange}
            />
          )}

          {/* Interactive Visualizations */}
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

              {/* Chart 5: Courbe d'Évolution des Ventes */}
              {statsData.timeEvolution && statsData.timeEvolution.length > 0 && (
                <div className="lg:col-span-12">
                  <SalesEvolutionChart
                    data={statsData.timeEvolution}
                    datasetName={statsData.datasetName || undefined}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
