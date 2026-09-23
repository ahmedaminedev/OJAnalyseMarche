import React from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { ModelStat } from '../../services/marketService';

interface BrandModelsBarChartProps {
  brandName: string;
  models: ModelStat[];
  availableBrands?: string[];
  onSelectBrand?: (brand: string) => void;
}

export const BrandModelsBarChart: React.FC<BrandModelsBarChartProps> = ({
  brandName,
  models,
  availableBrands = [],
  onSelectBrand,
}) => {
  const maxSales = Math.max(...models.map((m) => m.sales), 100);
  const roundedMax = Math.ceil(maxSales / 200) * 200 || 1600;

  // Grid steps for x-axis (e.g. 0, 400, 800, 1200, 1600)
  const steps = [0, 400, 800, 1200, 1600].filter((s) => s <= roundedMax + 200);

  return (
    <div className="rounded-2xl bg-[#0e1626] border border-slate-800/90 p-5 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Répartition des ventes {brandName}
            </h3>
            <p className="text-[11px] text-slate-400">
              Volumes d'immatriculation par modèle (Source ATTT)
            </p>
          </div>
        </div>

        {/* Brand quick switcher */}
        {availableBrands.length > 0 && onSelectBrand && (
          <div className="relative">
            <select
              value={brandName}
              onChange={(e) => onSelectBrand(e.target.value)}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white appearance-none pr-8 cursor-pointer focus:outline-none focus:border-red-500"
            >
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  Marque : {b}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Bar Chart Container */}
      <div className="space-y-2 py-2 max-h-[360px] overflow-y-auto pr-2">
        {models.map((item, idx) => {
          const widthPct = Math.min(100, Math.max(3, (item.sales / roundedMax) * 100));
          // First bar or explicit highlight is red like in Capture 1
          const isLeaderBar = idx === 0 || item.isHighlight;
          const barColor = isLeaderBar ? '#dc2626' : '#6b7280';

          return (
            <div key={item.model} className="group flex items-center gap-3 text-xs">
              {/* Model Name */}
              <div
                className="w-36 sm:w-44 text-right truncate text-slate-300 font-medium group-hover:text-white transition-colors"
                title={item.model}
              >
                {item.model}
              </div>

              {/* Bar track + value */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-slate-900/80 rounded-sm overflow-hidden flex items-center">
                  <div
                    className="h-full rounded-sm transition-all duration-500 ease-out group-hover:brightness-110 flex items-center"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>

                {/* Direct Number Label (as in capture 1: "1 379") */}
                <span className="w-12 text-left font-mono font-semibold text-white text-[11px]">
                  {item.sales.toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom X-Axis (like in capture 1: 0, 200, 400 ... 1600 Ventes) */}
      <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono pl-36 sm:pl-44 pr-12">
        {steps.map((val) => (
          <span key={val}>{val}</span>
        ))}
        <span className="text-slate-400 uppercase font-sans font-medium text-[9px]">
          Ventes
        </span>
      </div>
    </div>
  );
};
