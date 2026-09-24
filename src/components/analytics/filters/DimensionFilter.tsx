import React, { useState, useEffect } from 'react';
import { Search, Check, CheckSquare, Square, RefreshCcw } from 'lucide-react';
import { DatasetColumn, DimensionFacet } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';
import { analyticsService } from '../../../services/analyticsService';

interface DimensionFilterProps {
  datasetId: string;
  column: DatasetColumn;
  facet?: DimensionFacet;
}

export const DimensionFilter: React.FC<DimensionFilterProps> = ({
  datasetId,
  column,
  facet,
}) => {
  const { filters, addCondition, removeCondition } = useAnalyticsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<Array<{ value: any; count: number }>>([]);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);

  // Find active condition for this column
  const currentCondition = filters.conditions.find(
    (c) => !('logic' in c) && c.field === column.key
  ) as any;

  const selectedValues: any[] = currentCondition?.op === 'in' && Array.isArray(currentCondition.value)
    ? currentCondition.value
    : currentCondition?.op === 'eq'
    ? [currentCondition.value]
    : [];

  const isHighCardinality = (column.distinctCount || 0) > 200;

  // Autocomplete fetch for high cardinality
  useEffect(() => {
    if (!isHighCardinality) return;
    let isCancelled = false;

    const timeout = setTimeout(async () => {
      try {
        setIsLoadingAutocomplete(true);
        const data = await analyticsService.fetchColumnValues(datasetId, column.key, searchTerm, 50);
        if (!isCancelled) {
          setAutocompleteResults(data.values || []);
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setIsLoadingAutocomplete(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [datasetId, column.key, searchTerm, isHighCardinality]);

  const availableValues = isHighCardinality
    ? autocompleteResults
    : (facet?.values || column.values || []);

  const filteredValues = isHighCardinality
    ? availableValues
    : availableValues.filter((v) =>
        String(v.value ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );

  const toggleValue = (val: any) => {
    const isSelected = selectedValues.includes(val);
    let next: any[];
    if (isSelected) {
      next = selectedValues.filter((v) => v !== val);
    } else {
      next = [...selectedValues, val];
    }

    if (next.length === 0) {
      removeCondition(column.key);
    } else if (next.length === 1) {
      addCondition({ field: column.key, op: 'eq', value: next[0] });
    } else {
      addCondition({ field: column.key, op: 'in', value: next });
    }
  };

  const handleSelectAll = () => {
    const all = filteredValues.map((v) => v.value);
    addCondition({ field: column.key, op: 'in', value: all });
  };

  const handleInvert = () => {
    const inverted = filteredValues
      .map((v) => v.value)
      .filter((val) => !selectedValues.includes(val));
    if (inverted.length === 0) {
      removeCondition(column.key);
    } else {
      addCondition({ field: column.key, op: 'in', value: inverted });
    }
  };

  const handleEmptyToggle = () => {
    if (currentCondition?.op === 'isEmpty') {
      removeCondition(column.key);
    } else {
      addCondition({ field: column.key, op: 'isEmpty' });
    }
  };

  return (
    <div className="space-y-2.5 text-xs">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder={isHighCardinality ? 'Rechercher (autocomplétion)...' : 'Filtrer les valeurs...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] text-xs"
        />
      </div>

      {/* Bulk actions */}
      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5">
        <button
          type="button"
          onClick={handleSelectAll}
          className="hover:text-white transition-colors"
        >
          Tout sélectionner
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={handleInvert}
          className="hover:text-white transition-colors"
        >
          Inverser
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={handleEmptyToggle}
          className={`hover:text-white transition-colors ${
            currentCondition?.op === 'isEmpty' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          (Vide)
        </button>
      </div>

      {/* Values List */}
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {filteredValues.length === 0 ? (
          <div className="text-center py-3 text-slate-500 text-[11px]">
            {isLoadingAutocomplete ? 'Recherche en cours...' : 'Aucune valeur trouvée'}
          </div>
        ) : (
          filteredValues.map((item, idx) => {
            const isChecked = selectedValues.includes(item.value);
            return (
              <label
                key={`${item.value}-${idx}`}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(item.value)}
                    className="rounded border-slate-700 bg-slate-800 text-[#ff284d] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span
                    className={`truncate ${
                      isChecked ? 'text-white font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {item.value === null || item.value === '' ? '(Vide)' : String(item.value)}
                  </span>
                </div>

                {item.count !== undefined && (
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    {item.count.toLocaleString('fr-FR')}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};
