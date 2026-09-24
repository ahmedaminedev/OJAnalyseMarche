import React, { useState } from 'react';
import {
  Filter,
  Layers,
  ChevronDown,
  Search,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { DatasetColumn, FacetsResponse } from '../../types/analytics';
import { DimensionFilter } from './filters/DimensionFilter';
import { NumberFilter } from './filters/NumberFilter';
import { DateFilter } from './filters/DateFilter';
import { BooleanFilter } from './filters/BooleanFilter';
import { TextFilter } from './filters/TextFilter';
import { AdvancedFilterBuilderModal } from './filters/AdvancedFilterBuilderModal';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';

interface FilterPanelProps {
  datasetId: string;
  columns: DatasetColumn[];
  facets?: FacetsResponse;
  isLoadingFacets?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  datasetId,
  columns,
  facets,
  isLoadingFacets,
}) => {
  const { filters } = useAnalyticsStore();
  const [searchColumnTerm, setSearchColumnTerm] = useState('');
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const toggleCollapse = (colKey: string) => {
    setCollapsedCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const activeFilterFields = new Set(
    filters.conditions
      .filter((c) => !('logic' in c))
      .map((c: any) => c.field)
  );

  const filteredColumns = columns.filter((col) => {
    if (col.role === 'ignored') return false;
    if (!searchColumnTerm) return true;
    return (
      col.label.toLowerCase().includes(searchColumnTerm.toLowerCase()) ||
      col.key.toLowerCase().includes(searchColumnTerm.toLowerCase())
    );
  });

  return (
    <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-xl flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-600/10 text-[#ff284d] border border-red-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Filtres Automatiques</span>
              {isLoadingFacets && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              )}
            </h3>
            <span className="text-[11px] text-slate-400">
              {columns.length} colonnes détectées
            </span>
          </div>
        </div>

        {/* Advanced Builder Button */}
        <button
          type="button"
          onClick={() => setIsAdvancedModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
          title="Ouvrir le constructeur logique avancé (ET / OU)"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Avancé</span>
        </button>
      </div>

      {/* Filter Columns Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder="Chercher une colonne..."
          value={searchColumnTerm}
          onChange={(e) => setSearchColumnTerm(e.target.value)}
          className="w-full bg-[#131b2e] border border-slate-700/80 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d]"
        />
      </div>

      {/* Columns Accordion List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {filteredColumns.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 italic">
            Aucune colonne ne correspond à votre recherche.
          </div>
        ) : (
          filteredColumns.map((col) => {
            const isCollapsed = collapsedCols[col.key] === true;
            const hasActiveFilter = activeFilterFields.has(col.key);
            const dimensionFacet = facets?.dimensions?.[col.key];
            const rangeFacet = facets?.ranges?.[col.key];

            return (
              <div
                key={col.key}
                className={`rounded-xl border transition-all ${
                  hasActiveFilter
                    ? 'bg-[#121a2d] border-[#ff284d]/60 shadow-sm'
                    : 'bg-[#0f1728]/80 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Column Card Header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(col.key)}
                  className="w-full flex items-center justify-between p-3 text-left group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`text-xs font-semibold truncate ${
                        hasActiveFilter ? 'text-white font-bold' : 'text-slate-300'
                      }`}
                    >
                      {col.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                      {col.type}
                    </span>
                    {hasActiveFilter && (
                      <span className="w-2 h-2 rounded-full bg-[#ff284d] shrink-0" />
                    )}
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Column Filter Component Body */}
                {!isCollapsed && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/60">
                    {col.type === 'string' && (col.role === 'dimension' || (col.distinctCount || 0) <= 200) ? (
                      <DimensionFilter
                        datasetId={datasetId}
                        column={col}
                        facet={dimensionFacet}
                      />
                    ) : col.type === 'string' ? (
                      <TextFilter column={col} />
                    ) : col.type === 'number' ? (
                      <NumberFilter column={col} rangeFacet={rangeFacet} />
                    ) : col.type === 'date' ? (
                      <DateFilter column={col} />
                    ) : col.type === 'boolean' ? (
                      <BooleanFilter column={col} />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Advanced Filter Modal */}
      <AdvancedFilterBuilderModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        columns={columns}
      />
    </div>
  );
};
