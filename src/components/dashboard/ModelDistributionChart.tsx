import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { MODEL_SALES_DISTRIBUTION } from '../../data/mockData';

export const ModelDistributionChart: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = MODEL_SALES_DISTRIBUTION;
  const totalCount = 12458;

  // SVG Donut dimensions
  const size = 200;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and stroke-dashoffset for each arc
  let accumulatedPercent = 0;
  const arcs = data.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <PieIcon className="w-5 h-5 text-[#ff284d]" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Répartition des ventes par modèle
        </h3>
      </div>

      {/* Chart & Legend Grid */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
        {/* Donut Canvas */}
        <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full -rotate-90 transform overflow-visible"
            viewBox={`0 0 ${size} ${size}`}
          >
            {arcs.map((arc, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <circle
                  key={arc.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={arc.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-xl font-black text-white tracking-tight">
              {hoveredIndex !== null
                ? `${data[hoveredIndex].percentage}%`
                : totalCount.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5 tracking-wider">
              {hoveredIndex !== null ? data[hoveredIndex].name : 'Ventes totales'}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full space-y-2.5">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  isHovered ? 'bg-slate-800/60 scale-[1.02]' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isHovered ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white">
                    {item.percentage.toString().replace('.', ',')}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
