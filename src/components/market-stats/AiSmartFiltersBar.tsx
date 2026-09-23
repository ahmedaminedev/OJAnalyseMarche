import React, { useState } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  Globe2,
  Filter,
  Check,
  Send,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { SmartFilterSuggestion } from '../../services/marketService';

export interface ActiveFiltersState {
  datasetId?: string;
  energyFilter: 'all' | 'phev' | 'ice';
  originFilter: string;
  minSales: number;
  selectedBrands: string[];
}

interface AiSmartFiltersBarProps {
  filters: ActiveFiltersState;
  onFiltersChange: (newFilters: ActiveFiltersState) => void;
  availableBrands: string[];
  smartSuggestions: SmartFilterSuggestion[];
  onApplySmartSuggestion: (suggestion: SmartFilterSuggestion) => void;
  onAskAi: (query: string) => Promise<void>;
  isLoadingAi: boolean;
  aiSummary?: string;
  aiTakeaways?: string[];
}

export const AiSmartFiltersBar: React.FC<AiSmartFiltersBarProps> = ({
  filters,
  onFiltersChange,
  availableBrands,
  smartSuggestions,
  onApplySmartSuggestion,
  onAskAi,
  isLoadingAi,
  aiSummary,
  aiTakeaways = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const handleReset = () => {
    setSelectedSuggestionId(null);
    onFiltersChange({
      energyFilter: 'all',
      originFilter: 'all',
      minSales: 0,
      selectedBrands: [],
    });
  };

  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return;
    onAskAi(naturalQuery);
  };

  const handleSuggestionClick = (suggestion: SmartFilterSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    onApplySmartSuggestion(suggestion);
  };

  const hasActiveFilters =
    filters.energyFilter !== 'all' ||
    filters.originFilter !== 'all' ||
    filters.minSales > 0 ||
    filters.selectedBrands.length > 0;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0e172a] to-[#0a101d] border border-slate-800/90 shadow-xl overflow-hidden">
      {/* Top Bar: Simple & Accessible Controls */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/70">
        {/* Left: Quick Filters Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-xs text-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
            <span className="font-semibold">Filtres Rapides :</span>
          </div>

          {/* Energy Filter */}
          <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, energyFilter: 'all' })}
              className={`px-3 py-1 rounded-md transition-colors ${
                filters.energyFilter === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, energyFilter: 'phev' })}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                filters.energyFilter === 'phev'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-300" />
              <span>PHEV</span>
            </button>
          </div>

          {/* Origin Filter */}
          <div className="relative">
            <select
              value={filters.originFilter}
              onChange={(e) => onFiltersChange({ ...filters, originFilter: e.target.value })}
              className="bg-slate-950/80 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-red-500"
            >
              <option value="all">🌍 Toutes origines</option>
              <option value="Chine">🇨🇳 Marques Chinoises</option>
              <option value="France">🇫🇷 Constructeurs Français</option>
              <option value="Corée">🇰🇷 Constructeurs Coréens</option>
              <option value="Japon">🇯🇵 Constructeurs Japonais</option>
              <option value="Allemagne">🇩🇪 Constructeurs Allemands</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Volume Threshold */}
          <div className="relative">
            <select
              value={filters.minSales}
              onChange={(e) => onFiltersChange({ ...filters, minSales: Number(e.target.value) })}
              className="bg-slate-950/80 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-red-500"
            >
              <option value={0}>📊 Tout volume de ventes</option>
              <option value={500}>&gt; 500 unités</option>
              <option value={1000}>&gt; 1 000 unités (Majeurs)</option>
              <option value={2000}>&gt; 2 000 unités (Top Tier)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: AI Intelligence Panel Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isExpanded
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Filtres Intelligents & Assistant IA</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expandable AI Intelligence Center */}
      {isExpanded && (
        <div className="p-5 bg-[#080d18] border-t border-slate-800/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Natural Language Query Bar */}
          <form onSubmit={handleNaturalSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                placeholder="Posez une question ou demandez un filtre (ex: 'Compare les marques chinoises PHEV avec Omoda' ou 'Isole le Top 5 du marché')..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingAi || !naturalQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-lg shadow-red-950/40"
            >
              {isLoadingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyse...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Analyser</span>
                </>
              )}
            </button>
          </form>

          {/* AI Dynamic Filter Suggestions studied from dataset */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-red-400" />
                <span>Filtres stratégiques recommandés par l'IA (Basés sur les données réelles du fichier) :</span>
              </span>
              <span className="text-[11px] text-slate-400">Cliquez pour appliquer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {smartSuggestions.map((sug) => {
                const isSelected = selectedSuggestionId === sug.id;
                return (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSuggestionClick(sug)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/50 border-red-500/80 shadow-md shadow-red-950/30'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{sug.title}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {sug.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Executive Summary if available */}
          {aiSummary && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthèse Exécutive Marché (IA) :</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{aiSummary}</p>
              {aiTakeaways.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1 pt-1">
                  {aiTakeaways.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
