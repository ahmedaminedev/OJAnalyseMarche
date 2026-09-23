import React, { useState } from 'react';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Sparkles } from 'lucide-react';
import { AssistantChartConfig } from '../../services/assistantService';

interface DynamicChatChartProps {
  config: AssistantChartConfig;
}

const PALETTE = [
  '#ff284d', // Omoda red
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b', // slate
  '#94a3b8',
  '#cbd5e1',
];

export const DynamicChatChart: React.FC<DynamicChatChartProps> = ({ config }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!config || !config.data || config.data.length === 0) {
    return null;
  }

  const { type, title, description, data, xAxisLabel, yAxisLabel } = config;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0) || 1;

  return (
    <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 bg-[#090f1d] rounded-xl p-4 border border-slate-800 shadow-inner">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            {type === 'bar' && <BarChart3 className="w-3.5 h-3.5 text-red-500" />}
            {type === 'pie' && <PieIcon className="w-3.5 h-3.5 text-amber-400" />}
            {type === 'line' && <LineIcon className="w-3.5 h-3.5 text-blue-400" />}
            {type === 'comparison' && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{title}</span>
          </div>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 uppercase">
          Dynamique
        </span>
      </div>

      {/* Render Chart according to type */}
      {type === 'pie' ? (
        /* Donut Chart */
        <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
          <div className="relative w-40 h-40 flex-shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform">
              {(() => {
                let cumulativeAngle = 0;
                const radius = 80;
                const innerRadius = 38;
                const cx = 100;
                const cy = 100;

                return data.map((item, idx) => {
                  const sliceAngle = (item.value / totalValue) * 360;
                  const startAngle = cumulativeAngle;
                  const endAngle = cumulativeAngle + sliceAngle;
                  cumulativeAngle = endAngle;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const x1 = cx + radius * Math.cos(startRad);
                  const y1 = cy + radius * Math.sin(startRad);
                  const x2 = cx + radius * Math.cos(endRad);
                  const y2 = cy + radius * Math.sin(endRad);

                  const x3 = cx + innerRadius * Math.cos(endRad);
                  const y3 = cy + innerRadius * Math.sin(endRad);
                  const x4 = cx + innerRadius * Math.cos(startRad);
                  const y4 = cy + innerRadius * Math.sin(startRad);

                  const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                  const pathData = [
                    `M ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `L ${x3} ${y3}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                    'Z',
                  ].join(' ');

                  const isHovered = hoveredIdx === idx;
                  const fill = item.highlight ? '#ff284d' : PALETTE[idx % PALETTE.length];

                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill={fill}
                      stroke="#090f1d"
                      strokeWidth={2}
                      className="transition-all duration-150 cursor-pointer"
                      style={{
                        opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                        transformOrigin: '100px 100px',
                        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-[10px] text-slate-400 font-mono">TOTAL</span>
              <span className="text-xs font-bold text-white font-mono">
                {totalValue.toLocaleString('fr-FR')}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin text-xs pr-1">
            {data.map((item, idx) => {
              const isHovered = hoveredIdx === idx;
              const color = item.highlight ? '#ff284d' : PALETTE[idx % PALETTE.length];
              const pct = item.share || `${((item.value / totalValue) * 100).toFixed(1)}%`;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isHovered ? 'bg-slate-800' : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={`truncate text-xs ${
                        item.highlight ? 'font-bold text-red-400' : 'text-slate-300'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
                    <span className="text-white font-semibold">
                      {item.value.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-slate-400 text-[11px]">({pct})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : type === 'line' ? (
        /* Line Chart (SVG Curve) */
        <div className="pt-2">
          <div className="relative h-44 w-full">
            <svg viewBox="0 0 400 160" className="w-full h-full overflow-visible">
              {/* Grid lines */}
              {[0, 40, 80, 120].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="400"
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Polyline */}
              {(() => {
                const points = data.map((d, i) => {
                  const x = data.length > 1 ? (i / (data.length - 1)) * 380 + 10 : 200;
                  const y = 140 - (d.value / maxValue) * 110;
                  return `${x},${y}`;
                });

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#ff284d"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points.join(' ')}
                    />
                    {data.map((d, i) => {
                      const x = data.length > 1 ? (i / (data.length - 1)) * 380 + 10 : 200;
                      const y = 140 - (d.value / maxValue) * 110;
                      const isHovered = hoveredIdx === i;

                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 4}
                            fill="#ff284d"
                            stroke="#fff"
                            strokeWidth={isHovered ? 2 : 1}
                            className="transition-all cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                          <text
                            x={x}
                            y={y - 8}
                            textAnchor="middle"
                            fill={isHovered ? '#fff' : '#cbd5e1'}
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {d.value.toLocaleString('fr-FR')}
                          </text>
                          <text
                            x={x}
                            y={155}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="9"
                          >
                            {d.name}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      ) : (
        /* Bar Chart (Horizontal or Vertical) */
        <div className="space-y-2 py-1">
          {data.map((item, idx) => {
            const pctWidth = Math.max((item.value / maxValue) * 100, 4);
            const isHighlight = item.highlight || /omoda|jaecoo/i.test(item.name);
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="group relative"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className={`font-semibold truncate max-w-[180px] sm:max-w-xs ${
                      isHighlight ? 'text-red-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-white font-bold">
                      {item.value.toLocaleString('fr-FR')}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {yAxisLabel || 'unités'}
                      </span>
                    </span>
                    {item.share && (
                      <span className="text-slate-400 text-[10px]">({item.share})</span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div className="h-5 w-full bg-slate-900 rounded-md overflow-hidden relative border border-slate-800">
                  <div
                    className={`h-full rounded-md transition-all duration-300 ${
                      isHighlight
                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-md shadow-red-600/30'
                        : idx === 0
                        ? 'bg-gradient-to-r from-slate-600 to-slate-500'
                        : 'bg-slate-700/80 group-hover:bg-slate-600'
                    }`}
                    style={{ width: `${pctWidth}%` }}
                  />
                  {/* Secondary bar for PHEV if exists */}
                  {item.secondaryValue !== undefined && item.secondaryValue > 0 && (
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-emerald-500/80 rounded-md pointer-events-none"
                      style={{
                        width: `${Math.max((item.secondaryValue / maxValue) * 100, 2)}%`,
                      }}
                      title={`PHEV : ${item.secondaryValue}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Axis notes */}
      {(xAxisLabel || yAxisLabel) && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1 font-mono border-t border-slate-800/60 pt-1.5">
          <span>{xAxisLabel ? `Catégorie : ${xAxisLabel}` : ''}</span>
          <span>{yAxisLabel ? `Indicateur : ${yAxisLabel}` : ''}</span>
        </div>
      )}
    </div>
  );
};
