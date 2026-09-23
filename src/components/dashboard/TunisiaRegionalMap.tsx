import React, { useState } from 'react';
import { MapPin, Globe } from 'lucide-react';
import { RegionalDataItem } from '../../services/marketService';

interface TunisiaRegionalMapProps {
  data?: RegionalDataItem[];
  datasetName?: string;
}

export const TunisiaRegionalMap: React.FC<TunisiaRegionalMapProps> = ({
  data = [],
}) => {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-center items-center h-64 text-center">
        <MapPin className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Aucune donnée géographique</p>
        <span className="text-[11px] text-slate-500 mt-1">Importez un fichier avec colonnes région / gouvernorat</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.sales), 1);

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Répartition Géographique / Segments
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 uppercase">
          Données du fichier
        </span>
      </div>

      <div className="space-y-2.5 flex-1 max-h-60 overflow-y-auto scrollbar-thin pr-1">
        {data.map((item, idx) => {
          const pct = Math.max((item.sales / maxVal) * 100, 5);
          const isSelected = activeRegion === item.region;

          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveRegion(item.region)}
              onMouseLeave={() => setActiveRegion(null)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-red-500/80'
                  : 'bg-slate-900/60 border-slate-800/70 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-red-400" />
                  <span>{item.region}</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {item.sales.toLocaleString('fr-FR')}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({item.percentage}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
