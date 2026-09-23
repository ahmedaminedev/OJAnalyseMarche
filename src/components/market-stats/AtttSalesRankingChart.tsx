import React, { useState } from 'react';
import { Layers, ArrowUpDown, Filter, Search } from 'lucide-react';
import { BrandStat } from '../../services/marketService';

interface AtttSalesRankingChartProps {
  data: BrandStat[];
  onSelectBrand?: (brand: string) => void;
  selectedBrand?: string;
}

export const AtttSalesRankingChart: React.FC<AtttSalesRankingChartProps> = ({
  data,
  onSelectBrand,
  selectedBrand,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'top10' | 'chinese' | 'phev'>('all');
  const [hoveredBrand, setHoveredBrand] = useState<BrandStat | null>(null);

  // Filter pipeline
  let filtered = data.filter((item) =>
    item.brand.toLowerCase().includes(search.toLowerCase())
  );

  if (filterMode === 'top10') {
    filtered = filtered.slice(0, 10);
  } else if (filterMode === 'chinese') {
    filtered = filtered.filter((item) =>
      /chine|chery|byd|geely|omoda|jaecoo|dfsk|dongfeng|gwm|mg|lynk/i.test(
        item.origin + item.brand
      )
    );
  } else if (filterMode === 'phev') {
    filtered = filtered.filter((item) => item.phevSales > 0);
  }

  const maxSales = Math.max(...data.map((d) => d.sales), 5000);

  return (
    <div className="rounded-2xl bg-[#0e1626] border border-slate-800/90 p-5 shadow-2xl flex flex-col justify-between">
      {/* Header (Matching Capture 3 "VENTES (SOURCE: ATTT)") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 mb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wider uppercase font-mono">
                VENTES
              </h3>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider">
                (SOURCE: ATTT)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Volumes d'immatriculations réels par marque
            </p>
          </div>
        </div>

        {/* Filter Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filters */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterMode === 'all'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({data.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('top10')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterMode === 'top10'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 10
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('chinese')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterMode === 'chinese'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chinoises
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('phev')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterMode === 'phev'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PHEV
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 w-32 sm:w-40"
            />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Rows (Matching Capture 3) */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2 relative py-1">
        {filtered.map((item) => {
          const widthPct = Math.min(100, Math.max(2, (item.sales / maxSales) * 100));
          const isSelected = selectedBrand === item.brand;
          const isHovered = hoveredBrand?.brand === item.brand;

          return (
            <div
              key={item.brand}
              className={`group flex items-center gap-3 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border border-red-500/40'
                  : 'hover:bg-slate-900/60'
              }`}
              onClick={() => onSelectBrand?.(item.brand)}
              onMouseEnter={() => setHoveredBrand(item)}
              onMouseLeave={() => setHoveredBrand(null)}
            >
              {/* Brand Label */}
              <div
                className={`w-32 sm:w-40 text-right truncate text-xs sm:text-sm font-medium transition-colors ${
                  isSelected || item.isOmoda
                    ? 'text-red-400 font-bold'
                    : 'text-slate-300 group-hover:text-white'
                }`}
              >
                {item.brand}
              </div>

              {/* Bar track */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 h-5 sm:h-6 bg-slate-950/70 rounded overflow-hidden flex items-center">
                  <div
                    className="h-full rounded transition-all duration-500 ease-out group-hover:brightness-110"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>

                {/* Sales Number (Direct integer label like Capture 3) */}
                <div className="w-16 sm:w-20 text-left flex items-baseline gap-1">
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    {item.sales.toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Tooltip matching Capture 3 */}
      {hoveredBrand && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700 flex flex-wrap items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hoveredBrand.color }}
            />
            <span className="font-bold text-white">{hoveredBrand.brand}</span>
            <span className="text-slate-400">({hoveredBrand.origin})</span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <div>
              <span className="text-slate-400">atttReleases : </span>
              <strong className="text-white">
                {hoveredBrand.sales.toLocaleString('fr-FR')}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">Part de marché : </span>
              <strong className="text-emerald-400">{hoveredBrand.marketShare}%</strong>
            </div>
            {hoveredBrand.phevSales > 0 && (
              <div>
                <span className="text-slate-400">PHEV : </span>
                <strong className="text-cyan-400">
                  {hoveredBrand.phevSales.toLocaleString('fr-FR')}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Affichage : {filtered.length} marques sur {data.length}</span>
        <span>Mise à jour automatique d'après la base MongoDB</span>
      </div>
    </div>
  );
};
