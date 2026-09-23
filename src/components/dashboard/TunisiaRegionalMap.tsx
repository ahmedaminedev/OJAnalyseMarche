import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { REGIONAL_SALES } from '../../data/mockData';

export const TunisiaRegionalMap: React.FC = () => {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-[#ff284d]" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Ventes par région
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
        {/* Tunisia SVG Map with glowing interactive markers */}
        <div className="sm:col-span-5 relative flex items-center justify-center p-2">
          <svg
            viewBox="0 0 100 160"
            className="w-full h-44 sm:h-48 max-w-[130px] overflow-visible drop-shadow-[0_0_15px_rgba(255,40,77,0.15)]"
          >
            {/* Tunisia Coastline & Border SVG Silhouette */}
            <path
              d="M 38 10
                 C 45 8, 55 10, 62 14
                 C 68 18, 72 24, 70 28
                 C 67 32, 62 30, 60 36
                 C 58 42, 62 48, 66 54
                 C 72 62, 70 70, 65 78
                 C 60 84, 55 88, 58 98
                 C 60 106, 52 118, 48 132
                 C 45 142, 38 152, 30 156
                 C 25 158, 20 152, 18 140
                 C 16 128, 22 110, 24 95
                 C 26 80, 22 65, 20 50
                 C 18 35, 25 20, 32 14 Z"
              fill="#111c30"
              stroke="#253550"
              strokeWidth="1.5"
              className="transition-colors duration-200"
            />

            {/* Glowing Hotspots on the Map */}
            {REGIONAL_SALES.map((item) => {
              const isSelected = activeRegion === item.region;
              // Map approximate positions
              let cx = 60;
              let cy = 25;
              if (item.region === 'Tunis') {
                cx = 58;
                cy = 22;
              } else if (item.region === 'Sousse') {
                cx = 62;
                cy = 46;
              } else if (item.region === 'Sfax') {
                cx = 62;
                cy = 68;
              } else if (item.region.includes('Bizerte')) {
                cx = 45;
                cy = 15;
              } else if (item.region === 'Gabès') {
                cx = 54;
                cy = 92;
              } else {
                cx = 36;
                cy = 70;
              }

              return (
                <g
                  key={item.region}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveRegion(item.region)}
                  onMouseLeave={() => setActiveRegion(null)}
                >
                  {/* Pulsing red ring for active/key cities */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4.5}
                    fill="#ff284d"
                    fillOpacity="0.4"
                    className="animate-ping"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 4 : 3}
                    fill="#ff284d"
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-transform duration-150"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Region Progress Bars List */}
        <div className="sm:col-span-7 space-y-2.5">
          {REGIONAL_SALES.map((item) => {
            const isHovered = activeRegion === item.region;
            return (
              <div
                key={item.region}
                onMouseEnter={() => setActiveRegion(item.region)}
                onMouseLeave={() => setActiveRegion(null)}
                className={`p-1 rounded-lg transition-colors ${
                  isHovered ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className={`font-semibold ${
                      isHovered ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {item.region}
                  </span>
                  <span className="font-bold text-white">
                    {item.percentage.toString().replace('.', ',')}%
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-[#ff284d] rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage * 2.8}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
