import React from 'react';
import { Car, BarChart2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { MetricCardData } from '../../types';

interface StatCardProps {
  data: MetricCardData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'total':
        return <Car className="w-5 h-5 text-[#ff284d]" />;
      case 'omoda':
        return <BarChart2 className="w-5 h-5 text-[#ff284d]" />;
      case 'jaecoo':
        return <Car className="w-5 h-5 text-[#ff284d]" />;
      case 'share':
        return <TrendingUp className="w-5 h-5 text-[#ff284d]" />;
    }
  };

  // Generate SVG path for the red sparkline curve
  const generateSparklinePath = (points: number[]) => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const width = 80;
    const height = 32;
    const step = width / (points.length - 1);

    const coords = points.map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / (max - min || 1)) * (height - 6) - 3;
      return { x, y };
    });

    // Generate smooth bezier curve
    return coords.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, '');
  };

  return (
    <div
      id={`stat-card-${data.id}`}
      className="relative bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-200 shadow-lg flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        {/* Circular Icon with Red Ring */}
        <div className="w-10 h-10 rounded-full border border-red-500/50 bg-red-950/20 flex items-center justify-center">
          {getIcon()}
        </div>

        {/* Red Sparkline curve */}
        <div className="w-20 h-8 flex items-center justify-end">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 80 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={generateSparklinePath(data.sparkline)}
              stroke="#ff284d"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="mt-4">
        {/* Stat Title */}
        <p className="text-xs font-medium text-slate-400">{data.title}</p>

        {/* Main Value */}
        <h3 className="text-2xl font-black text-white tracking-tight mt-1">
          {data.value}
        </h3>

        {/* Trend Label */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="flex items-center text-xs font-semibold text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            {data.trend}
          </span>
          <span className="text-[11px] text-slate-400">vs. période précédente</span>
        </div>
      </div>
    </div>
  );
};
