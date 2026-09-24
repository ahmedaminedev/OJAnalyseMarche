import React, { useState } from 'react';
import { DatasetColumn, FilterOperator } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';

interface TextFilterProps {
  column: DatasetColumn;
}

export const TextFilter: React.FC<TextFilterProps> = ({ column }) => {
  const { filters, addCondition, removeCondition } = useAnalyticsStore();

  const currentCondition = filters.conditions.find(
    (c) => !('logic' in c) && c.field === column.key
  ) as any;

  const [operator, setOperator] = useState<FilterOperator>(
    (currentCondition?.op as FilterOperator) || 'contains'
  );
  const [val, setVal] = useState<string>(String(currentCondition?.value ?? ''));

  const handleApply = (newOp = operator, text = val) => {
    if (newOp === 'isEmpty' || newOp === 'isNotEmpty') {
      addCondition({ field: column.key, op: newOp });
    } else if (text.trim() === '') {
      removeCondition(column.key);
    } else {
      addCondition({ field: column.key, op: newOp, value: text.trim() });
    }
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-400 shrink-0 font-medium">Condition :</label>
        <select
          value={operator}
          onChange={(e) => {
            const nextOp = e.target.value as FilterOperator;
            setOperator(nextOp);
            handleApply(nextOp, val);
          }}
          className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#ff284d]"
        >
          <option value="contains">Contient</option>
          <option value="startsWith">Commence par</option>
          <option value="endsWith">Se termine par</option>
          <option value="eq">Égal exactement</option>
          <option value="neq">Différent de</option>
          <option value="isEmpty">Est vide</option>
          <option value="isNotEmpty">N'est pas vide</option>
        </select>
      </div>

      {operator !== 'isEmpty' && operator !== 'isNotEmpty' && (
        <input
          type="text"
          placeholder="Texte recherché..."
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            handleApply(operator, e.target.value);
          }}
          className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#ff284d]"
        />
      )}

      {currentCondition && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              removeCondition(column.key);
              setVal('');
            }}
            className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
          >
            Effacer
          </button>
        </div>
      )}
    </div>
  );
};
