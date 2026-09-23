import React, { useState } from 'react';
import { Download, Zap, TrendingUp } from 'lucide-react';
import { PhevStat } from '../../services/marketService';

interface PhevRankingBarChartProps {
  data: PhevStat[];
}

export const PhevRankingBarChart: React.FC<PhevRankingBarChartProps> = ({ data }) => {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  const maxY = 800;
  const yTicks = [800, 600, 400, 200, 0];

  const handleDownloadCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Marque,Immatriculations_PHEV\n' +
      data.map((e) => `"${e.brand}",${e.count}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'immatriculations_phev_tunisie_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-6 shadow-2xl relative overflow-hidden">
      {/* Header (Matching Capture 2) */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 text-center pr-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Immatriculations des véhicules PHEV par marque en Tunisie
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Du 1er Janvier au 31 Août 2026 (Véhicules Hybrides Rechargeables)
          </p>
        </div>

        {/* Download Action (from Capture 2) */}
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Exporter les données PHEV (CSV)"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Main Chart Graphic with Y Axis */}
      <div className="relative flex h-72 sm:h-80 w-full pt-4">
        {/* Y Axis Label (Vertical text like in Capture 2) */}
        <div className="w-8 flex items-center justify-center -rotate-90 select-none">
          <span className="text-[11px] font-sans text-slate-400 whitespace-nowrap tracking-wider">
            Nombre d'immatriculations
          </span>
        </div>

        {/* Y Axis Grid + Ticks */}
        <div className="w-10 flex flex-col justify-between items-end pr-2 text-xs font-mono text-slate-400 select-none py-1">
          {yTicks.map((val) => (
            <span key={val}>{val}</span>
          ))}
        </div>

        {/* Bars Container */}
        <div className="flex-1 relative flex items-end justify-between gap-1.5 sm:gap-2.5 pb-8 border-b border-slate-700/60">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
            {yTicks.map((val) => (
              <div key={val} className="w-full border-t border-slate-800/50" />
            ))}
          </div>

          {/* Vertical Bars (Exactly as in Capture 2) */}
          {data.map((item, idx) => {
            const heightPct = Math.min(100, Math.max(3, (item.count / maxY) * 100));

            // Leader bar (BYD) is bright red (#dc2626)
            // Omoda & Jaecoo is highlighted (#ff284d or bright slate)
            // Other bars are grey/white shades exactly matching Capture 2
            let barColor = '#475569';
            if (idx === 0) {
              barColor = '#dc2626'; // Red for BYD
            } else if (item.brand.toLowerCase().includes('omoda')) {
              barColor = '#e2e8f0'; // Light bright grey for Omoda (405)
            } else if (idx === 1) {
              barColor = '#64748b'; // Lynk & Co (409)
            } else if (idx === 3) {
              barColor = '#cbd5e1'; // Chery (328)
            } else if (idx === 5) {
              barColor = '#f8fafc'; // DFSK (204)
            } else if (idx === 7) {
              barColor = '#f1f5f9'; // Cupra (131)
            } else if (idx === 11) {
              barColor = '#ef4444'; // Volvo (red in capture 2)
            } else {
              barColor = '#475569';
            }

            const isHovered = hoveredBrand === item.brand;

            return (
              <div
                key={item.brand}
                className="relative flex-1 h-full flex flex-col items-center justify-end group cursor-pointer z-10"
                onMouseEnter={() => setHoveredBrand(item.brand)}
                onMouseLeave={() => setHoveredBrand(null)}
              >
                {/* Numeric value label directly above bar (as in capture 2: "630", "409", "405", etc.) */}
                <span
                  className={`text-[10px] sm:text-xs font-mono font-bold mb-1 transition-all ${
                    isHovered ? 'text-white scale-110' : 'text-slate-200'
                  }`}
                >
                  {item.count}
                </span>

                {/* Vertical Bar */}
                <div
                  className="w-full max-w-[34px] rounded-t-sm transition-all duration-300 ease-out group-hover:brightness-125"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                  }}
                />

                {/* X Axis Brand Label (under the bar) */}
                <span className="absolute -bottom-6 w-full text-center text-[10px] sm:text-[11px] text-slate-300 font-medium truncate px-0.5 group-hover:text-white">
                  {item.brand.length > 8 ? `${item.brand.substring(0, 6)}...` : item.brand}
                </span>

                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-white whitespace-nowrap shadow-xl">
                    <span className="font-bold">{item.brand}</span> : {item.count} immatriculations PHEV
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Volumes hybrides rechargeables (PHEV) calculés directement depuis le fichier.
          </span>
        </div>
        <span className="font-mono text-slate-400">Données réelles du fichier</span>
      </div>
    </div>
  );
};
