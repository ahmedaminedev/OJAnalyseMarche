import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  Layers,
  Globe2,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  Car,
  X,
} from 'lucide-react';

export interface AdvancedFiltersState {
  searchQuery: string;
  selectedBrands: string[];
  originFilter: string;
  energyFilter: 'all' | 'phev' | 'ice';
  minSales: number;
  topLimit: number; // 0 = all
  sortBy: 'sales_desc' | 'sales_asc' | 'phev_desc' | 'share_desc' | 'name_asc';
}

interface AdvancedMarketFiltersBarProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (newFilters: AdvancedFiltersState) => void;
  availableBrands: string[];
  totalRecordsCount: number;
  filteredRecordsCount: number;
}

const ORIGIN_OPTIONS = [
  { label: 'Toutes les origines', value: 'all' },
  { label: '🇨🇳 Chine (Chery, BYD, Geely...)', value: 'Chine' },
  { label: '🇰🇷 Corée du Sud (Hyundai, KIA)', value: 'Corée' },
  { label: '🇫🇷 France (Peugeot, Renault, Citroën)', value: 'France' },
  { label: '🇯🇵 Japon (Toyota, Isuzu, Suzuki)', value: 'Japon' },
  { label: '🇩🇪 Allemagne (VW, Opel...)', value: 'Allemagne' },
  { label: '🇮🇹 Italie (Fiat)', value: 'Italie' },
];

export const AdvancedMarketFiltersBar: React.FC<AdvancedMarketFiltersBarProps> = ({
  filters,
  onFiltersChange,
  availableBrands,
  totalRecordsCount,
  filteredRecordsCount,
}) => {
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');

  // Count active filters
  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    (filters.selectedBrands.length > 0 ? 1 : 0) +
    (filters.originFilter !== 'all' ? 1 : 0) +
    (filters.energyFilter !== 'all' ? 1 : 0) +
    (filters.minSales > 0 ? 1 : 0) +
    (filters.topLimit > 0 ? 1 : 0) +
    (filters.sortBy !== 'sales_desc' ? 1 : 0);

  const handleReset = () => {
    onFiltersChange({
      searchQuery: '',
      selectedBrands: [],
      originFilter: 'all',
      energyFilter: 'all',
      minSales: 0,
      topLimit: 0,
      sortBy: 'sales_desc',
    });
  };

  const toggleBrand = (brand: string) => {
    const exists = filters.selectedBrands.includes(brand);
    const updated = exists
      ? filters.selectedBrands.filter((b) => b !== brand)
      : [...filters.selectedBrands, brand];
    onFiltersChange({ ...filters, selectedBrands: updated });
  };

  const selectBrandPreset = (preset: 'all' | 'none' | 'top5' | 'chinese' | 'phev') => {
    if (preset === 'all') {
      onFiltersChange({ ...filters, selectedBrands: [] });
    } else if (preset === 'none') {
      onFiltersChange({ ...filters, selectedBrands: [] });
    } else if (preset === 'top5') {
      onFiltersChange({
        ...filters,
        selectedBrands: availableBrands.slice(0, 5),
      });
    } else if (preset === 'chinese') {
      onFiltersChange({
        ...filters,
        selectedBrands: ['Omoda & Jaecoo', 'Chery', 'BYD', 'Geely', 'MG', 'DFSK', 'Lynk & Co', 'Dongfeng', 'GWM'],
      });
    } else if (preset === 'phev') {
      onFiltersChange({
        ...filters,
        selectedBrands: ['BYD', 'Lynk & Co', 'Omoda & Jaecoo', 'Chery', 'DFSK', 'Geely'],
      });
    }
    setIsBrandDropdownOpen(false);
  };

  const filteredBrandList = availableBrands.filter((b) =>
    b.toLowerCase().includes(brandSearchInput.toLowerCase())
  );

  return (
    <div className="bg-[#0e1626] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Header: Title + Active filter badges + Reset */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-red-500">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Filtres Avancés du Marché
              </h3>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-800">
                  {activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Filtrez par marques, motorisations, origines géographiques, seuils de volume et tris.
            </p>
          </div>
        </div>

        {/* Counter of visible records vs total */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
            Affichage : <strong className="text-white">{filteredRecordsCount}</strong> /{' '}
            {totalRecordsCount} marques
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Text Search Input */}
        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Recherche textuelle
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Chercher marque, modèle..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Motorisation / Energy Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Motorisation</span>
          </label>
          <select
            value={filters.energyFilter}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                energyFilter: e.target.value as 'all' | 'phev' | 'ice',
              })
            }
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">Toutes motorisations</option>
            <option value="phev">⚡ Hybrides PHEV (Rechargeables)</option>
            <option value="ice">⛽ Thermiques / Classiques uniquement</option>
          </select>
        </div>

        {/* 3. Geographic Origin */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-blue-400" />
            <span>Origine Constructeur</span>
          </label>
          <select
            value={filters.originFilter}
            onChange={(e) => onFiltersChange({ ...filters, originFilter: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            {ORIGIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Sorting & Top Limit */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-emerald-400" />
            <span>Tri des Données</span>
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sortBy: e.target.value as AdvancedFiltersState['sortBy'],
              })
            }
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="sales_desc">Volume de ventes (Décroissant)</option>
            <option value="sales_asc">Volume de ventes (Croissant)</option>
            <option value="phev_desc">Ventes PHEV (Décroissant)</option>
            <option value="share_desc">Part de Marché (%)</option>
            <option value="name_asc">Ordre alphabétique (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Row 2: Multi-Brand Picker Dropdown + Volume threshold + Top N */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2">
        {/* Multi-Brand selector dropdown (takes 6 cols on lg) */}
        <div className="lg:col-span-6 relative">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3 text-rose-400" />
              <span>Sélection Spécifique de Marques ({filters.selectedBrands.length === 0 ? 'Toutes' : filters.selectedBrands.length})</span>
            </span>
            {filters.selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, selectedBrands: [] })}
                className="text-[10px] text-red-400 hover:text-red-300 normal-case cursor-pointer"
              >
                Tout décocher
              </button>
            )}
          </label>

          <button
            type="button"
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-left text-white flex items-center justify-between hover:border-slate-600 transition-colors cursor-pointer"
          >
            <span className="truncate">
              {filters.selectedBrands.length === 0
                ? 'Toutes les marques incluses'
                : `${filters.selectedBrands.length} marque(s) sélectionnée(s) : ${filters.selectedBrands.slice(0, 3).join(', ')}${filters.selectedBrands.length > 3 ? '...' : ''}`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-2" />
          </button>

          {/* Brands dropdown modal */}
          {isBrandDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-800">
                <Search className="w-3 h-3 text-slate-500" />
                <input
                  type="text"
                  value={brandSearchInput}
                  onChange={(e) => setBrandSearchInput(e.target.value)}
                  placeholder="Filtrer la liste..."
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => selectBrandPreset('all')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Toutes
                </button>
                <button
                  type="button"
                  onClick={() => selectBrandPreset('top5')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Top 5
                </button>
                <button
                  type="button"
                  onClick={() => selectBrandPreset('chinese')}
                  className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60"
                >
                  Chinoises
                </button>
                <button
                  type="button"
                  onClick={() => selectBrandPreset('phev')}
                  className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                >
                  Podium PHEV
                </button>
              </div>

              {/* Checkboxes list */}
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {filteredBrandList.map((brand) => {
                  const isChecked = filters.selectedBrands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/60 text-xs text-slate-300 hover:text-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBrand(brand)}
                        className="rounded border-slate-700 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <span className={brand === 'Omoda & Jaecoo' ? 'font-bold text-red-400' : ''}>
                        {brand}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsBrandDropdownOpen(false)}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Valider
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Volume Threshold Minimum (takes 3 cols on lg) */}
        <div className="lg:col-span-3">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Seuil Volume Ventes Min.
          </label>
          <select
            value={filters.minSales}
            onChange={(e) => onFiltersChange({ ...filters, minSales: Number(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value={0}>Tous les volumes (&ge; 0 unité)</option>
            <option value={500}>&ge; 500 unités</option>
            <option value={1000}>&ge; 1 000 unités</option>
            <option value={2000}>&ge; 2 000 unités</option>
            <option value={3000}>&ge; 3 000 unités (Top Leaders)</option>
          </select>
        </div>

        {/* Top N limit (takes 3 cols on lg) */}
        <div className="lg:col-span-3">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Afficher les N premiers
          </label>
          <select
            value={filters.topLimit}
            onChange={(e) => onFiltersChange({ ...filters, topLimit: Number(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value={0}>Toutes les marques ({totalRecordsCount})</option>
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
      </div>

      {/* Selected brands active pills if any */}
      {filters.selectedBrands.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">
            Filtre marques :
          </span>
          {filters.selectedBrands.map((b) => (
            <span
              key={b}
              className="px-2 py-0.5 rounded-lg bg-red-950/80 text-red-300 border border-red-800/60 text-xs flex items-center gap-1 font-medium"
            >
              <span>{b}</span>
              <button
                type="button"
                onClick={() => toggleBrand(b)}
                className="hover:text-white"
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
