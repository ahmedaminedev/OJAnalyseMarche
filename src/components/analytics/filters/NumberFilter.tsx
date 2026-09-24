import React, { useState, useEffect } from 'react';
import { DatasetColumn, RangeFacet, FilterOperator } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';

interface NumberFilterProps {
  column: DatasetColumn;
  rangeFacet?: RangeFacet;
}

export const NumberFilter: React.FC<NumberFilterProps> = ({ column, rangeFacet }) => {
  const { filters, addCondition, removeCondition } = useAnalyticsStore();

  const currentCondition = filters.conditions.find(
    (c) => !('logic' in c) && c.field === column.key
  ) as any;

  const minBound = Number(rangeFacet?.min ?? column.min ?? 0);
  const maxBound = Number(rangeFacet?.max ?? column.max ?? 100);

  const [operator, setOperator] = useState<FilterOperator>(
    (currentCondition?.op as FilterOperator) || 'between'
  );

  const [minVal, setMinVal] = useState<number>(
    currentCondition?.op === 'between' && Array.isArray(currentCondition.value)
      ? Number(currentCondition.value[0])
      : minBound
  );

  const [maxVal, setMaxVal] = useState<number>(
    currentCondition?.op === 'between' && Array.isArray(currentCondition.value)
      ? Number(currentCondition.value[1])
      : maxBound
  );

  const [singleVal, setSingleVal] = useState<number>(
    currentCondition?.value != null && !Array.isArray(currentCondition.value)
      ? Number(currentCondition.value)
      : minBound
  );

  const handleApply = (newOp = operator, val1 = minVal, val2 = maxVal, sVal = singleVal) => {
    if (newOp === 'isEmpty' || newOp === 'isNotEmpty') {
      addCondition({ field: column.key, op: newOp });
    } else if (newOp === 'between') {
      addCondition({ field: column.key, op: 'between', value: [Number(val1), Number(val2)] });
    } else {
      addCondition({ field: column.key, op: newOp, value: Number(sVal) });
    }
  };

  const handleClear = () => {
    removeCondition(column.key);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Operator Selector */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-400 shrink-0 font-medium">Opérateur :</label>
        <select
          value={operator}
          onChange={(e) => {
            const nextOp = e.target.value as FilterOperator;
            setOperator(nextOp);
            handleApply(nextOp, minVal, maxVal, singleVal);
          }}
          className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#ff284d]"
        >
          <option value="between">Entre (plage)</option>
          <option value="eq">Égal à (=)</option>
          <option value="neq">Différent de (≠)</option>
          <option value="gt">Supérieur strict (&gt;)</option>
          <option value="gte">Supérieur ou égal (≥)</option>
          <option value="lt">Inférieur strict (&lt;)</option>
          <option value="lte">Inférieur ou égal (≤)</option>
          <option value="isEmpty">Est vide</option>
          <option value="isNotEmpty">N'est pas vide</option>
        </select>
      </div>

      {operator === 'between' ? (
        <div className="space-y-2.5">
          {/* Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min={minBound}
              max={maxBound}
              value={maxVal}
              onChange={(e) => {
                const nextMax = Number(e.target.value);
                setMaxVal(nextMax);
                handleApply('between', minVal, nextMax);
              }}
              className="w-full accent-[#ff284d] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{minBound.toLocaleString('fr-FR')}</span>
              <span>{maxBound.toLocaleString('fr-FR')}</span>
            </div>
          </div>

          {/* Dual numeric inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Min</span>
              <input
                type="number"
                value={minVal}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinVal(v);
                  handleApply('between', v, maxVal);
                }}
                className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#ff284d]"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Max</span>
              <input
                type="number"
                value={maxVal}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxVal(v);
                  handleApply('between', minVal, v);
                }}
                className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#ff284d]"
              />
            </div>
          </div>
        </div>
      ) : operator !== 'isEmpty' && operator !== 'isNotEmpty' ? (
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">Valeur</span>
          <input
            type="number"
            value={singleVal}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSingleVal(v);
              handleApply(operator, minVal, maxVal, v);
            }}
            className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#ff284d]"
          />
        </div>
      ) : null}

      {/* Clear this filter button */}
      {currentCondition && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
          >
            Effacer ce filtre
          </button>
        </div>
      )}
    </div>
  );
};
