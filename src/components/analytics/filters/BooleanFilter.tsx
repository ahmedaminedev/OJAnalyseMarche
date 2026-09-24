import React from 'react';
import { DatasetColumn } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';

interface BooleanFilterProps {
  column: DatasetColumn;
}

export const BooleanFilter: React.FC<BooleanFilterProps> = ({ column }) => {
  const { filters, addCondition, removeCondition } = useAnalyticsStore();

  const currentCondition = filters.conditions.find(
    (c) => !('logic' in c) && c.field === column.key
  ) as any;

  const currentValue = currentCondition?.op === 'eq' ? currentCondition.value : null;

  const handleSelect = (val: boolean | null) => {
    if (val === null) {
      removeCondition(column.key);
    } else {
      addCondition({ field: column.key, op: 'eq', value: val });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => handleSelect(null)}
        className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-colors ${
          currentValue === null
            ? 'bg-red-600 text-white border-red-500 shadow-sm'
            : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        Tous
      </button>

      <button
        type="button"
        onClick={() => handleSelect(true)}
        className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-colors ${
          currentValue === true
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
            : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        Oui (Vrai)
      </button>

      <button
        type="button"
        onClick={() => handleSelect(false)}
        className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-colors ${
          currentValue === false
            ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
            : 'bg-[#131b2e] border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        Non (Faux)
      </button>
    </div>
  );
};
