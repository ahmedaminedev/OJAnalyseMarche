import React, { useState } from 'react';
import { PieChart as PieIcon, Download, Info } from 'lucide-react';
import { BrandStat } from '../../services/marketService';

interface MarketSharePieChartProps {
  data: BrandStat[];
  onSelectBrand?: (brand: string) => void;
  selectedBrand?: string;
}

export const MarketSharePieChart: React.FC<MarketSharePieChartProps> = ({
  data,
  onSelectBrand,
  selectedBrand,
}) => {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  // Take top brands and group remaining if more than 20
  const topCount = 18;
  const topBrands = data.slice(0, topCount);
  const remainingSales = data.slice(topCount).reduce((acc, curr) => acc + curr.sales, 0);
  const totalSales = data.reduce((acc, curr) => acc + curr.sales, 0) || 1;

  const chartSegments = [...topBrands];
  if (remainingSales > 0) {
    chartSegments.push({
      brand: 'Autres marques',
      sales: remainingSales,
      phevSales: 0,
      origin: 'Divers',
      color: '#475569',
      isOmoda: false,
      rank: topCount + 1,
      marketShare: Number(((remainingSales / totalSales) * 100).toFixed(2)),
      phevShare: 0,
    });
  }

  // Calculate SVG Pie slices
  let cumulativeAngle = 0;
  const radius = 100;
  const innerRadius = 38; // Elegant donut effect
  const cx = 140;
  const cy = 140;

  const slices = chartSegments.map((item, idx) => {
    const sliceAngle = (item.sales / totalSales) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    // Convert polar to cartesian
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const ix1 = cx + innerRadius * Math.cos(endRad);
    const iy1 = cy + innerRadius * Math.sin(endRad);
    const ix2 = cx + innerRadius * Math.cos(startRad);
    const iy2 = cy + innerRadius * Math.sin(startRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    // Color logic: Leader or Omoda gets bright red/coral, others get grayscale gradation as in capture 1
    let fill = '#94a3b8';
    if (idx === 0) {
      fill = '#dc2626'; // Leader red (Hyundai in capture 1)
    } else if (item.isOmoda) {
      fill = '#ff284d'; // Omoda highlight
    } else {
      // Elegant greyscale gradation matching capture 1
      const greyGrades = [
        '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb',
        '#64748b', '#475569', '#334155', '#94a3b8', '#cbd5e1',
        '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#3f3f46'
      ];
      fill = greyGrades[(idx - 1) % greyGrades.length];
    }

    const isSelected = selectedBrand === item.brand;
    const isHovered = hoveredBrand === item.brand;

    return {
      ...item,
      pathData,
      fill,
      isSelected,
      isHovered,
      startAngle,
      endAngle,
      midAngle: startAngle + sliceAngle / 2,
    };
  });

  const activeItem = slices.find((s) => s.isHovered) || slices.find((s) => s.isSelected) || slices[0];

  return (
    <div className="rounded-2xl bg-[#0e1626] border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-red-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Parts de marché
            </h3>
            <p className="text-[11px] text-slate-400">
              Répartition globale des volumes (Données calculées du fichier)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
            Total : {totalSales.toLocaleString('fr-FR')} imm.
          </span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 my-auto">
        {/* SVG Pie */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex-shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 280 280"
            className="w-full h-full filter drop-shadow-md transition-all duration-300"
          >
            {slices.map((slice) => {
              const isLead = slice.isHovered || slice.isSelected;
              return (
                <path
                  key={slice.brand}
                  d={slice.pathData}
                  fill={slice.fill}
                  stroke="#0e1626"
                  strokeWidth={isLead ? '2.5' : '1'}
                  className="cursor-pointer transition-all duration-200 hover:opacity-90"
                  style={{
                    transformOrigin: '140px 140px',
                    transform: isLead ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.2s ease, opacity 0.2s',
                  }}
                  onMouseEnter={() => setHoveredBrand(slice.brand)}
                  onMouseLeave={() => setHoveredBrand(null)}
                  onClick={() => onSelectBrand?.(slice.brand)}
                />
              );
            })}
          </svg>

          {/* Central Donut Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              {activeItem?.brand || 'Marché'}
            </span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              {activeItem?.marketShare}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeItem?.sales.toLocaleString('fr-FR')} ventes
            </span>
          </div>
        </div>

        {/* Legend List (Like capture 1) */}
        <div className="w-full lg:w-48 max-h-56 overflow-y-auto pr-1 space-y-1 text-xs">
          {slices.map((slice) => {
            const isTarget = slice.brand === activeItem?.brand;
            return (
              <button
                key={slice.brand}
                type="button"
                onClick={() => onSelectBrand?.(slice.brand)}
                onMouseEnter={() => setHoveredBrand(slice.brand)}
                onMouseLeave={() => setHoveredBrand(null)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors text-left ${
                  isTarget ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span className="truncate text-[11px]">{slice.brand}</span>
                </div>
                <span className="font-mono text-[11px] flex-shrink-0 ml-2">
                  {slice.marketShare}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Cliquez sur une marque pour afficher ses modèles</span>
        </span>
        <span className="text-red-400 font-semibold">
          Leader : {slices[0]?.brand} ({slices[0]?.marketShare}%)
        </span>
      </div>
    </div>
  );
};
