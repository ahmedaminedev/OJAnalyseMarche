import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronDown,
  Filter,
  Check,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  FilterOptionGroup,
  CellSuggestion,
  marketService,
} from '../../services/marketService';

export interface DynamicFiltersState {
  searchQuery: string;
  cellFilters: Record<string, string[]>; // { [columnKeyOrHeader]: string[] }
  selectedPeriod: string; // 'all' or '2026-01', etc.
}

interface DynamicDatabaseFiltersBarProps {
  datasetId?: string;
  datasetName?: string;
  totalRows: number;
  totalFilteredRows?: number;
  availableFilterOptions?: Record<string, FilterOptionGroup>;
  availablePeriods?: string[];
  filters: DynamicFiltersState;
  onFiltersChange: (newFilters: DynamicFiltersState) => void;
}

export const DynamicDatabaseFiltersBar: React.FC<DynamicDatabaseFiltersBarProps> = ({
  datasetId,
  datasetName,
  totalRows,
  totalFilteredRows,
  availableFilterOptions = {},
  availablePeriods = [],
  filters,
  onFiltersChange,
}) => {
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');
  const [suggestions, setSuggestions] = useState<CellSuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeDropdownCol, setActiveDropdownCol] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize local search input if filters are reset from outside
  useEffect(() => {
    setSearchInput(filters.searchQuery);
  }, [filters.searchQuery]);

  // Debounced autocomplete suggestions fetching across database cells and headers
  useEffect(() => {
    if (!searchInput || searchInput.trim().length === 0) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await marketService.getSuggestions(datasetId, searchInput);
      setSuggestions(res);
      setIsSuggestionsOpen(res.length > 0);
    }, 180);

    return () => clearTimeout(timer);
  }, [searchInput, datasetId]);

  // Close suggestions or column dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownCol(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter columns to display as dropdowns (brand, model, segment, category)
  const filterableColumns = Object.values(availableFilterOptions).filter(
    (col) => col.values && col.values.length > 0
  );

  // Active filters calculation
  const activeChips: Array<{ key: string; colName: string; val: string; type: 'cell' | 'search' | 'period' }> = [];

  if (filters.searchQuery) {
    activeChips.push({
      key: 'search_global',
      colName: 'Recherche globale',
      val: filters.searchQuery,
      type: 'search',
    });
  }

  if (filters.selectedPeriod && filters.selectedPeriod !== 'all') {
    activeChips.push({
      key: 'period_selected',
      colName: 'Période',
      val: filters.selectedPeriod,
      type: 'period',
    });
  }

  for (const [colKey, vals] of Object.entries(filters.cellFilters)) {
    const colHeader = availableFilterOptions[colKey]?.columnHeader || colKey;
    for (const val of vals) {
      activeChips.push({
        key: `${colKey}:${val}`,
        colName: colHeader,
        val,
        type: 'cell',
      });
    }
  }

  const handleResetAll = () => {
    setSearchInput('');
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    onFiltersChange({
      searchQuery: '',
      cellFilters: {},
      selectedPeriod: 'all',
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsOpen(false);
    onFiltersChange({
      ...filters,
      searchQuery: searchInput.trim(),
    });
  };

  const handleSelectSuggestion = (s: CellSuggestion) => {
    setIsSuggestionsOpen(false);
    if (s.type === 'column') {
      // User selected a column name, open its dropdown
      setActiveDropdownCol(s.columnKey);
      setSearchInput('');
    } else {
      // User selected a cell value, add it directly to that column's filter
      const current = filters.cellFilters[s.columnKey] || [];
      if (!current.includes(s.value)) {
        onFiltersChange({
          ...filters,
          searchQuery: '', // clear free search in favor of strict cell filter
          cellFilters: {
            ...filters.cellFilters,
            [s.columnKey]: [...current, s.value],
          },
        });
        setSearchInput('');
      }
    }
  };

  const handleToggleCellValue = (colKey: string, value: string) => {
    const current = filters.cellFilters[colKey] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const newCellFilters = { ...filters.cellFilters };
    if (updated.length > 0) {
      newCellFilters[colKey] = updated;
    } else {
      delete newCellFilters[colKey];
    }

    onFiltersChange({
      ...filters,
      cellFilters: newCellFilters,
    });
  };

  const handleRemoveChip = (chip: typeof activeChips[0]) => {
    if (chip.type === 'search') {
      setSearchInput('');
      onFiltersChange({ ...filters, searchQuery: '' });
    } else if (chip.type === 'period') {
      onFiltersChange({ ...filters, selectedPeriod: 'all' });
    } else {
      // Cell filter
      const [colKey, val] = chip.key.split(':');
      const current = filters.cellFilters[colKey] || [];
      const updated = current.filter((v) => v !== val);
      const newCellFilters = { ...filters.cellFilters };
      if (updated.length > 0) {
        newCellFilters[colKey] = updated;
      } else {
        delete newCellFilters[colKey];
      }
      onFiltersChange({ ...filters, cellFilters: newCellFilters });
    }
  };

  const activeColGroup = activeDropdownCol
    ? availableFilterOptions[activeDropdownCol]
    : null;

  const filteredDropdownValues = activeColGroup?.values.filter((v) =>
    v.value.toLowerCase().includes(dropdownSearch.toLowerCase())
  ) || [];

  return (
    <div className="bg-[#0e1626] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Row: Title + Database Connection Indicator + Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Filtres Intelligents Liés à la Base de Données
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Dynamique
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Recherche instantanée et filtres synchronisés sur chaque colonne et cellule du fichier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalFilteredRows !== undefined && (
            <div className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-white font-bold">{totalFilteredRows.toLocaleString('fr-FR')}</span>
              <span className="text-slate-500"> / {totalRows.toLocaleString('fr-FR')} lignes</span>
            </div>
          )}

          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-red-950/30 transition-colors cursor-pointer border border-transparent hover:border-red-900/50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer ({activeChips.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Omnibar Search with Cell Autocomplete */}
      <div className="relative" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsSuggestionsOpen(true);
            }}
            placeholder='Rechercher dans toutes les cellules (ex: "Isuzu", "D-Max", "Pick-up", "2026-01", ou tapez "marque")...'
            className="w-full pl-10 pr-24 py-2.5 bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-sans"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSuggestions([]);
                setIsSuggestionsOpen(false);
                if (filters.searchQuery) {
                  onFiltersChange({ ...filters, searchQuery: '' });
                }
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
          >
            Filtrer
          </button>
        </form>

        {/* Autocomplete Suggestions Overlay */}
        {isSuggestionsOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[#0b1220] border border-cyan-800/80 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in duration-150">
            <div className="p-2 bg-slate-900/90 flex items-center justify-between text-[11px] font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Suggestions intelligentes dans la base :
              </span>
              <span className="text-slate-400">Cliquez pour filtrer</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left p-2.5 hover:bg-cyan-950/40 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    {s.type === 'column' ? (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800">
                        COLONNE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                        {s.columnHeader}
                      </span>
                    )}
                    <span className="text-xs text-white font-medium group-hover:text-cyan-300">
                      {s.label}
                    </span>
                  </div>
                  {s.subLabel && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {s.subLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Filter Controls Row: Dropdowns generated from real columns */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1" ref={dropdownRef}>
        {/* Temporal / Period Selector (if file has 2026-01, 2026-02...) */}
        {availablePeriods && availablePeriods.length > 0 && (
          <div className="relative">
            <select
              value={filters.selectedPeriod}
              onChange={(e) =>
                onFiltersChange({ ...filters, selectedPeriod: e.target.value })
              }
              className="appearance-none bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-200 cursor-pointer focus:outline-none transition-colors"
            >
              <option value="all">Toutes les périodes (Cumul)</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  Période : {p}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Dynamic Column Dropdowns for all categorical columns */}
        {filterableColumns.map((col) => {
          const selectedVals = filters.cellFilters[col.columnKey] || [];
          const hasActive = selectedVals.length > 0;
          const isOpen = activeDropdownCol === col.columnKey;

          return (
            <div key={col.columnKey} className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdownCol(isOpen ? null : col.columnKey);
                  setDropdownSearch('');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  hasActive
                    ? 'bg-red-950/60 border-red-700/80 text-red-200 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span>{col.columnHeader}</span>
                {hasActive && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {selectedVals.length}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#0a101d] border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in duration-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder={`Chercher ${col.columnHeader.toLowerCase()}...`}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                    {filteredDropdownValues.length === 0 ? (
                      <p className="text-[11px] text-slate-500 p-2 text-center">Aucun résultat trouvé</p>
                    ) : (
                      filteredDropdownValues.map((v) => {
                        const isChecked = selectedVals.includes(v.value);
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => handleToggleCellValue(col.columnKey, v.value)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-red-950/80 text-red-200 font-semibold'
                                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                            }`}
                          >
                            <span className="truncate pr-2">{v.value}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] text-slate-500 font-mono">({v.count})</span>
                              {isChecked && <Check className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtres actifs :
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-900 border border-slate-700/80 text-slate-200"
            >
              <span className="text-slate-400 font-mono text-[10px]">{chip.colName} :</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{chip.val}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(chip)}
                className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                title="Supprimer ce filtre"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
