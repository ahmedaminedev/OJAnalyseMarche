import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { DatasetColumn, FilterOperator } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';

interface DateFilterProps {
  column: DatasetColumn;
}

export const DateFilter: React.FC<DateFilterProps> = ({ column }) => {
  const { filters, addCondition, removeCondition } = useAnalyticsStore();

  const currentCondition = filters.conditions.find(
    (c) => !('logic' in c) && c.field === column.key
  ) as any;

  const [activeShortcut, setActiveShortcut] = useState<string>('custom');

  const now = new Date();
  const year = now.getFullYear();

  const handleShortcut = (shortcut: 'thisMonth' | 'last3Months' | 'ytd' | 'lastYear') => {
    setActiveShortcut(shortcut);
    let start: Date;
    let end: Date = new Date();

    switch (shortcut) {
      case 'thisMonth':
        start = new Date(year, now.getMonth(), 1);
        end = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last3Months':
        start = new Date(year, now.getMonth() - 2, 1);
        end = new Date();
        break;
      case 'ytd':
        start = new Date(year, 0, 1);
        end = new Date();
        break;
      case 'lastYear':
        start = new Date(year - 1, 0, 1);
        end = new Date(year - 1, 11, 31, 23, 59, 59);
        break;
    }

    addCondition({
      field: column.key,
      op: 'between',
      value: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]],
    });
  };

  const currentBetween =
    currentCondition?.op === 'between' && Array.isArray(currentCondition.value)
      ? currentCondition.value
      : ['', ''];

  const handleCustomDateChange = (idx: 0 | 1, val: string) => {
    setActiveShortcut('custom');
    const nextRange = [...currentBetween];
    nextRange[idx] = val;
    if (nextRange[0] && nextRange[1]) {
      addCondition({
        field: column.key,
        op: 'between',
        value: nextRange,
      });
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => handleShortcut('thisMonth')}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors text-left ${
            activeShortcut === 'thisMonth'
              ? 'bg-red-950/60 border-[#ff284d] text-white'
              : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          Ce mois
        </button>
        <button
          type="button"
          onClick={() => handleShortcut('last3Months')}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors text-left ${
            activeShortcut === 'last3Months'
              ? 'bg-red-950/60 border-[#ff284d] text-white'
              : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          3 derniers mois
        </button>
        <button
          type="button"
          onClick={() => handleShortcut('ytd')}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors text-left ${
            activeShortcut === 'ytd'
              ? 'bg-red-950/60 border-[#ff284d] text-white'
              : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          YTD (Année en cours)
        </button>
        <button
          type="button"
          onClick={() => handleShortcut('lastYear')}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors text-left ${
            activeShortcut === 'lastYear'
              ? 'bg-red-950/60 border-[#ff284d] text-white'
              : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          Année dernière
        </button>
      </div>

      {/* Custom Range Picker */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-medium block">Période personnalisée :</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Du</span>
            <input
              type="date"
              value={currentBetween[0] || ''}
              onChange={(e) => handleCustomDateChange(0, e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#ff284d]"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Au</span>
            <input
              type="date"
              value={currentBetween[1] || ''}
              onChange={(e) => handleCustomDateChange(1, e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#ff284d]"
            />
          </div>
        </div>
      </div>

      {/* Clear this filter */}
      {currentCondition && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              removeCondition(column.key);
              setActiveShortcut('custom');
            }}
            className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
          >
            Effacer la date
          </button>
        </div>
      )}
    </div>
  );
};
