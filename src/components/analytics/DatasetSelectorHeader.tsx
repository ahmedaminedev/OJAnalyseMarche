import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Layers,
  Calendar,
  Download,
  Share2,
  Bookmark,
  Check,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { DatasetSummary } from '../../types/analytics';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { analyticsService } from '../../services/analyticsService';

interface DatasetSelectorHeaderProps {
  datasets: DatasetSummary[];
  activeDataset: DatasetSummary | null;
  isLoading?: boolean;
}

export const DatasetSelectorHeader: React.FC<DatasetSelectorHeaderProps> = ({
  datasets,
  activeDataset,
  isLoading,
}) => {
  const {
    selectedDatasetId,
    setSelectedDatasetId,
    filters,
    savedViews,
    activeViewName,
    saveView,
    loadView,
    deleteView,
    clearAllFilters,
  } = useAnalyticsStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleQuickExport = async (format: 'xlsx' | 'csv') => {
    if (!selectedDatasetId) return;
    try {
      setIsExporting(true);
      await analyticsService.exportQuery(selectedDatasetId, { filters }, format);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    saveView(newViewName.trim());
    setNewViewName('');
    setShowSaveModal(false);
  };

  const activeFiltersCount = filters.conditions.length;

  return (
    <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Dataset Selector Dropdown */}
        <div className="flex-1 relative">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
            Jeu de données actif
          </label>

          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-3 bg-[#131b2e] hover:bg-[#162138] border border-slate-700/80 rounded-xl px-4 py-3 text-left transition-all group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-lg bg-red-600/10 text-[#ff284d] border border-red-500/20 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="truncate">
                {activeDataset ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base truncate">
                      {activeDataset.name || activeDataset.fileName}
                    </span>
                    {activeDataset.reconciliation?.verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Vérifié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60 shrink-0">
                        Actif
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm">
                    {isLoading ? 'Chargement des jeux de données...' : 'Sélectionnez un fichier...'}
                  </span>
                )}
                {activeDataset && (
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{activeDataset.rowCount?.toLocaleString('fr-FR')} lignes</span>
                    <span>•</span>
                    <span>{activeDataset.columns?.length || 0} colonnes</span>
                    <span>•</span>
                    <span>
                      {new Date(activeDataset.importedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <ChevronDown
              className={`w-5 h-5 text-slate-400 group-hover:text-white transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Datasets Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c1424] border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                Fichiers importés ({datasets.length})
              </div>

              {datasets.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucun fichier importé disponible. Veuillez d'abord importer un fichier.
                </div>
              ) : (
                datasets.map((d) => {
                  const isSelected = d._id === selectedDatasetId;
                  return (
                    <button
                      key={d._id}
                      type="button"
                      onClick={() => {
                        setSelectedDatasetId(d._id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-red-950/40 text-white border-l-4 border-[#ff284d]'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FileSpreadsheet
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-[#ff284d]' : 'text-slate-400'
                          }`}
                        />
                        <div className="truncate">
                          <div className="font-semibold text-sm truncate">
                            {d.name || d.fileName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{d.rowCount?.toLocaleString('fr-FR')} lignes</span>
                            <span>•</span>
                            <span>{d.columns?.length || 0} colonnes</span>
                            <span>•</span>
                            <span>{new Date(d.importedAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {d.reconciliation?.verified && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            Vérifié
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-[#ff284d]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Action Controls: Saved Views, Share Link, Export */}
        <div className="flex flex-wrap items-center gap-2.5 self-end">
          {/* Saved Views Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSavedViewsOpen(!isSavedViewsOpen)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeViewName ? activeViewName : `Vues (${savedViews.length})`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isSavedViewsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0c1424] border border-slate-700 rounded-xl shadow-2xl p-2 z-40 space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase">
                  Vues sauvegardées
                </div>

                {savedViews.length === 0 ? (
                  <div className="p-2 text-xs text-slate-400 text-center">
                    Aucune vue sauvegardée.
                  </div>
                ) : (
                  savedViews.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-xs text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          loadView(v);
                          setIsSavedViewsOpen(false);
                        }}
                        className="truncate text-left flex-1 hover:text-white"
                      >
                        {v.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteView(v.id)}
                        className="p-1 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}

                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavedViewsOpen(false);
                      setShowSaveModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sauvegarder la vue actuelle</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Shareable URL Copy Button */}
          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
            title="Copier le lien partageable avec filtres"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copié !</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Partager</span>
              </>
            )}
          </button>

          {/* Quick Export Button */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden">
            <button
              type="button"
              disabled={isExporting || !selectedDatasetId}
              onClick={() => handleQuickExport('xlsx')}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExporting ? 'Export...' : 'Excel'}</span>
            </button>
            <span className="w-[1px] h-4 bg-slate-700" />
            <button
              type="button"
              disabled={isExporting || !selectedDatasetId}
              onClick={() => handleQuickExport('csv')}
              className="px-2.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              CSV
            </button>
          </div>

          {/* Reset Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Réinitialiser ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Save View Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#ff284d]" />
              Sauvegarder cette vue
            </h3>
            <p className="text-xs text-slate-300">
              Enregistre les filtres actuels pour y accéder rapidement plus tard.
            </p>
            <form onSubmit={handleSaveViewSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="Ex: Top Ventes Véhicules Hybrides 2026"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff284d]"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newViewName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
