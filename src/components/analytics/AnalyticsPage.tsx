import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Table as TableIcon,
  LayoutDashboard,
  Upload,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import { DatasetSelectorHeader } from './DatasetSelectorHeader';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterPanel } from './FilterPanel';
import { TableExplorer } from './TableExplorer';
import { ChartBuilder } from './ChartBuilder';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import {
  useDatasetsList,
  useDatasetDetails,
  useDatasetFacets,
} from '../../hooks/useDatasetAnalytics';

interface AnalyticsPageProps {
  onNavigateToImport: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigateToImport }) => {
  const {
    selectedDatasetId,
    setSelectedDatasetId,
    filters,
    syncFromUrl,
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'table'>('dashboard');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Initialize from URL query params on mount
  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  // Fetch list of datasets
  const {
    data: datasets = [],
    isLoading: isLoadingDatasets,
    isError: isDatasetsError,
    refetch: refetchDatasets,
  } = useDatasetsList();

  // If no dataset is selected yet, pick the first SUCCESS dataset or the first one in the list
  useEffect(() => {
    if (!selectedDatasetId && datasets.length > 0) {
      const preferred = datasets.find((d) => d.status === 'SUCCESS') || datasets[0];
      if (preferred) {
        setSelectedDatasetId(preferred._id);
      }
    }
  }, [selectedDatasetId, datasets, setSelectedDatasetId]);

  // Fetch active dataset details
  const {
    data: activeDataset,
    isLoading: isLoadingActiveDataset,
  } = useDatasetDetails(selectedDatasetId);

  // Fetch cascading facets under active filters
  const {
    data: facets,
    isLoading: isLoadingFacets,
  } = useDatasetFacets(selectedDatasetId, filters);

  const columns = activeDataset?.columns || [];

  // Empty state: no imported files yet
  if (!isLoadingDatasets && datasets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 text-[#ff284d] border border-red-500/20 flex items-center justify-center mx-auto shadow-xl">
          <Database className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">
            Aucun jeu de données disponible
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Pour explorer et analyser vos statistiques automobiles (type Power BI), importez d’abord
            un fichier tabulaire (.xlsx, .xls, .csv).
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToImport}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02]"
        >
          <Upload className="w-4 h-4" />
          <span>Importer un fichier Excel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-16">
      {/* 1. Header with Dataset Selector, Saved Views & Quick Actions */}
      <DatasetSelectorHeader
        datasets={datasets}
        activeDataset={activeDataset || null}
        isLoading={isLoadingDatasets || isLoadingActiveDataset}
      />

      {/* 2. Dismissible Active Filter Chips & Clear All */}
      <ActiveFilterChips columns={columns} />

      {/* 3. Navigation View Switcher (Dashboard / Visual Builder / Data Table) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-[#0b111e] p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tableaux de bord</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'builder'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Constructeur de graphiques</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'table'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Tableau explorateur</span>
          </button>
        </div>

        {/* Toggle Filter Panel visibility */}
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
            isFilterPanelOpen
              ? 'bg-[#131b2e] border-slate-700 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff284d]" />
          <span>{isFilterPanelOpen ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
        </button>
      </div>

      {/* 4. Main Two-Column Layout: Left Filters + Right Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Column: Dynamic Column Filters Panel */}
        {isFilterPanelOpen && selectedDatasetId && (
          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)]">
            <FilterPanel
              datasetId={selectedDatasetId}
              columns={columns}
              facets={facets}
              isLoadingFacets={isLoadingFacets}
            />
          </div>
        )}

        {/* Right Column: Active View (Dashboard, Builder, or Table) */}
        <div className="flex-1 w-full overflow-hidden space-y-5">
          {selectedDatasetId ? (
            activeTab === 'dashboard' ? (
              <AnalyticsDashboard
                datasetId={selectedDatasetId}
                columns={columns}
                totalRows={activeDataset?.rowCount || 0}
              />
            ) : activeTab === 'builder' ? (
              <ChartBuilder
                datasetId={selectedDatasetId}
                columns={columns}
                onSaveWidget={(config) => {
                  setActiveTab('dashboard');
                }}
              />
            ) : (
              <TableExplorer
                datasetId={selectedDatasetId}
                columns={columns}
                totalRowsCount={activeDataset?.rowCount || 0}
              />
            )
          ) : (
            <div className="p-12 text-center text-slate-500 bg-[#0b111e] rounded-2xl border border-slate-800">
              Veuillez sélectionner un jeu de données pour commencer l'analyse.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
