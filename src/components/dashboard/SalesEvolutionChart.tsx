import React, { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { SALES_EVOLUTION_6M } from '../../data/mockData';

export const SalesEvolutionChart: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3 mois' | '6 mois' | '12 mois'>('6 mois');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = SALES_EVOLUTION_6M;
  const maxY = 2500;
  const yTicks = [2500, 2000, 1500, 1000, 500, 0];

  // SVG Chart dimensions
  const svgWidth = 580;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + (1 - val / maxY) * chartHeight;
  };

  // Generate paths
  const omodaPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.omoda) }));
  const jaecooPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.jaecoo) }));

  const generatePathD = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, '');
  };

  const omodaPath = generatePathD(omodaPoints);
  const jaecooPath = generatePathD(jaecooPoints);

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Évolution des ventes
          </h3>
        </div>

        {/* Period Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="appearance-none bg-[#070b14] border border-slate-700/80 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 focus:outline-none focus:border-[#ff284d] cursor-pointer"
          >
            <option value="3 mois">3 mois</option>
            <option value="6 mois">6 mois</option>
            <option value="12 mois">12 mois</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* OMODA Gradient Area */}
            <linearGradient id="omodaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff284d" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff284d" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? 'none' : '3 3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="inherit"
                >
                  {tick.toLocaleString('fr-FR')}
                </text>
              </g>
            );
          })}

          {/* OMODA Gradient Fill Under Curve */}
          <path
            d={`${omodaPath} L ${omodaPoints[omodaPoints.length - 1].x} ${getY(0)} L ${omodaPoints[0].x} ${getY(0)} Z`}
            fill="url(#omodaGlow)"
          />

          {/* JAECOO Line (Silver/Gray) */}
          <path
            d={jaecooPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* OMODA Line (Red) */}
          <path
            d={omodaPath}
            fill="none"
            stroke="#ff284d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {omodaPoints.map((pt, i) => (
            <circle
              key={`omoda-dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5.5 : 4}
              fill="#ff284d"
              stroke="#0b1220"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          ))}

          {jaecooPoints.map((pt, i) => (
            <circle
              key={`jaecoo-dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5.5 : 4}
              fill="#94a3b8"
              stroke="#0b1220"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          ))}

          {/* X-axis Labels & Hover targets */}
          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover bar */}
                <rect
                  x={x - 25}
                  y={paddingTop}
                  width="50"
                  height={chartHeight + 20}
                  fill="transparent"
                />

                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={getY(0)}
                    stroke="#ff284d"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                <text
                  x={x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#64748b'}
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '400'}
                  fontFamily="inherit"
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0c1424] border border-slate-700 rounded-xl px-3.5 py-2 shadow-2xl pointer-events-none flex items-center gap-4 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <span className="font-bold text-white">
              {data[hoveredIndex].month}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff284d]" />
              <span className="text-slate-300">OMODA:</span>
              <span className="font-semibold text-white">
                {data[hoveredIndex].omoda.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
              <span className="text-slate-300">JAECOO:</span>
              <span className="font-semibold text-white">
                {data[hoveredIndex].jaecoo.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff284d]" />
          <span className="text-xs font-semibold text-slate-300">OMODA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
          <span className="text-xs font-semibold text-slate-300">JAECOO</span>
        </div>
      </div>
    </div>
  );
};
