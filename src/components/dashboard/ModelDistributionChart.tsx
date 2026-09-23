import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';

interface ModelSlice {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

interface ModelDistributionChartProps {
  data?: ModelSlice[];
}

const DEFAULT_SLICES: ModelSlice[] = [
  { name: 'Omoda C5 1.5T', percentage: 55, count: 280, color: '#ff284d' },
  { name: 'Jaecoo 7 PHEV AWD', percentage: 29, count: 145, color: '#f59e0b' },
  { name: 'Omoda E5 EV 100%', percentage: 16, count: 81, color: '#06b6d4' },
];

export const ModelDistributionChart: React.FC<ModelDistributionChartProps> = ({
  data = DEFAULT_SLICES,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0) || 506;

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Mix Gamme OMODA & JAECOO
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Données réelles</span>
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
                  className="transition-all duration-300 ease-out cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Text inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] text-slate-400 font-medium">Total Gamme</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {totalCount.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] text-slate-400">unités</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-3 w-full">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={item.name}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isHovered ? 'bg-slate-800/80 shadow-md' : 'hover:bg-slate-900/60'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white">{item.percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-4.5 font-mono">
                  <span>{item.count.toLocaleString('fr-FR')} unités</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
