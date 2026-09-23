import React from 'react';
import { Trophy } from 'lucide-react';
import { TOP_MODELS } from '../../data/mockData';

export const TopModelsList: React.FC = () => {
  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-[#ff284d]" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Top 5 des modèles les plus vendus
        </h3>
      </div>

      {/* Top Models Rows */}
      <div className="divide-y divide-slate-800/60 flex-1 flex flex-col justify-around">
        {TOP_MODELS.map((model) => (
          <div
            key={model.rank}
            className="flex items-center justify-between py-2 px-1 hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  model.rank <= 2
                    ? 'border border-red-500/80 text-[#ff284d] bg-red-950/30'
                    : 'border border-slate-700 text-slate-400 bg-slate-800/50'
                }`}
              >
                {model.rank}
              </div>

              {/* Car Thumbnail */}
              <div className="w-10 h-6 rounded-md bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img
                  src={model.image}
                  alt={model.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Model Name */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {model.name}
                </h4>
              </div>
            </div>

            {/* Sales Volume */}
            <div className="text-right">
              <span className="text-xs font-bold text-white tracking-wide">
                {model.salesCount.toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
