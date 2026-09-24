import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { TimeEvolutionPoint } from '../../services/marketService';

interface SalesEvolutionChartProps {
  data?: TimeEvolutionPoint[];
  datasetName?: string;
}

export const SalesEvolutionChart: React.FC<SalesEvolutionChartProps> = ({
  data = [],
  datasetName,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-center items-center h-64 text-center">
        <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Aucune série temporelle disponible</p>
        <span className="text-[11px] text-slate-500 mt-1">Importez un fichier Excel pour générer la courbe</span>
      </div>
    );
  }

  const values = data.map((d) => d.value1);
  const maxVal = Math.max(...values, 10);
  const maxY = Math.ceil(maxVal * 1.15);

  const svgWidth = 580;
  const svgHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + (1 - val / maxY) * chartHeight;
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value1) }));

  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : '';

  const yTicks = [
    maxY,
    Math.round(maxY * 0.75),
    Math.round(maxY * 0.5),
    Math.round(maxY * 0.25),
    0,
  ];

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Évolution des volumes
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {datasetName && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[180px]">
              {datasetName}
            </span>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 uppercase">
            Données du fichier
          </span>
        </div>
      </div>

      {/* Main SVG Area */}
      <div className="relative w-full overflow-hidden flex-1 flex items-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff284d" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff284d" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y Axis Labels */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1c2538"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val.toLocaleString('fr-FR')}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#curveGradient)" />}

          {/* Primary Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#ff284d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Interactive Data Points & X Axis Labels */}
          {points.map((p, idx) => {
            const d = data[idx];
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx}>
                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? '#fff' : '#94a3b8'}
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {d.month.length > 10 ? `${d.month.substring(0, 9)}...` : d.month}
                </text>

                {/* Point Node */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#fff' : '#ff284d'}
                  stroke="#ff284d"
                  strokeWidth="2"
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Floating Value Tooltip on Hover */}
                {isHovered && (
                  <g pointerEvents="none">
                    <rect
                      x={Math.max(10, Math.min(svgWidth - 100, p.x - 45))}
                      y={p.y - 32 < 5 ? p.y + 10 : p.y - 32}
                      width="90"
                      height="24"
                      rx="6"
                      fill="#0d1526"
                      stroke="#ff284d"
                      strokeWidth="1"
                    />
                    <text
                      x={Math.max(55, Math.min(svgWidth - 55, p.x))}
                      y={p.y - 32 < 5 ? p.y + 26 : p.y - 16}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {d.value1.toLocaleString('fr-FR')}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
