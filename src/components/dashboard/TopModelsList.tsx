import React from 'react';
import { Trophy } from 'lucide-react';
import { TopModelItem } from '../../services/marketService';

interface TopModelsListProps {
  items?: TopModelItem[];
  datasetName?: string;
}

export const TopModelsList: React.FC<TopModelsListProps> = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-center items-center h-64 text-center">
        <Trophy className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Aucun classement disponible</p>
        <span className="text-[11px] text-slate-500 mt-1">Importez un fichier Excel pour calculer le Top 5</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Top {items.length} du fichier
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 uppercase">
          Données réelles
        </span>
      </div>

      {/* Top Models Rows */}
      <div className="divide-y divide-slate-800/60 flex-1 flex flex-col justify-around">
        {items.map((model) => (
          <div
            key={model.rank}
            className="flex items-center justify-between py-2 px-1 hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  model.rank === 1
                    ? 'border border-amber-500/80 text-amber-400 bg-amber-950/30'
                    : model.rank <= 3
                    ? 'border border-red-500/80 text-[#ff284d] bg-red-950/30'
                    : 'border border-slate-700 text-slate-400 bg-slate-800/50'
                }`}
              >
                #{model.rank}
              </div>

              {/* Model Name */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {model.name}
                </h4>
                {model.share && (
                  <span className="text-[10px] text-slate-400">{model.share} part</span>
                )}
              </div>
            </div>

            {/* Sales Volume */}
            <div className="text-right">
              <span className="text-xs font-bold text-white font-mono tracking-wide">
                {model.salesCount.toLocaleString('fr-FR')}
              </span>
              <span className="text-[10px] text-slate-400 block">unités</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
