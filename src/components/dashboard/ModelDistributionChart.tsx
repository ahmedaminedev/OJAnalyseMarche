import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { ModelDistributionSlice } from '../../services/marketService';

interface ModelDistributionChartProps {
  data?: ModelDistributionSlice[];
  datasetName?: string;
}

export const ModelDistributionChart: React.FC<ModelDistributionChartProps> = ({
  data = [],
  datasetName,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-center items-center h-64 text-center">
        <PieIcon className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Aucune répartition disponible</p>
        <span className="text-[11px] text-slate-500 mt-1">Importez un fichier Excel pour calculer le mix</span>
      </div>
    );
  }

  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // SVG Donut dimensions
  const size = 200;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const arcs = data.map((item) => {
    const pct = (item.count / totalCount) * 100;
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += pct;

    return {
      ...item,
      percentage: Number(pct.toFixed(1)),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Mix Catégories / Marques
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 uppercase">
          Données du fichier
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 flex-1">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            {arcs.map((arc, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={arc.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 6px rgba(255,40,77,0.4))' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Central Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-[10px] text-slate-400 font-mono">TOTAL</span>
            <span className="text-sm font-extrabold text-white font-mono">
              {totalCount.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin text-xs">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const pct = ((item.count / totalCount) * 100).toFixed(1);

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-800' : 'hover:bg-slate-800/40'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-300 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
                  <span className="text-white font-bold">{item.count.toLocaleString('fr-FR')}</span>
                  <span className="text-slate-400 text-[11px]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
