import React from 'react';
import { X, Filter, RefreshCw } from 'lucide-react';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { DatasetColumn, FilterCondition } from '../../types/analytics';

interface ActiveFilterChipsProps {
  columns: DatasetColumn[];
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ columns }) => {
  const { filters, removeCondition, clearAllFilters } = useAnalyticsStore();

  const columnsMap = new Map<string, DatasetColumn>();
  for (const c of columns) {
    columnsMap.set(c.key, c);
  }

  // Flatten active conditions
  const flatConditions: FilterCondition[] = [];
  for (const c of filters.conditions) {
    if (!('logic' in c)) {
      flatConditions.push(c as FilterCondition);
    }
  }

  if (flatConditions.length === 0) return null;

  const formatConditionLabel = (cond: FilterCondition): string => {
    const col = columnsMap.get(cond.field);
    const colName = col?.label || cond.field;

    switch (cond.op) {
      case 'eq':
        return `${colName} = ${String(cond.value)}`;
      case 'neq':
        return `${colName} ≠ ${String(cond.value)}`;
      case 'in':
        if (Array.isArray(cond.value)) {
          return `${colName} : ${cond.value.slice(0, 3).join(', ')}${
            cond.value.length > 3 ? ` (+${cond.value.length - 3})` : ''
          }`;
        }
        return `${colName} : ${String(cond.value)}`;
      case 'nin':
        return `${colName} exclu : ${Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}`;
      case 'contains':
        return `${colName} contient "${cond.value}"`;
      case 'startsWith':
        return `${colName} commence par "${cond.value}"`;
      case 'endsWith':
        return `${colName} se termine par "${cond.value}"`;
      case 'gt':
        return `${colName} > ${cond.value}`;
      case 'gte':
        return `${colName} ≥ ${cond.value}`;
      case 'lt':
        return `${colName} < ${cond.value}`;
      case 'lte':
        return `${colName} ≤ ${cond.value}`;
      case 'between':
        if (Array.isArray(cond.value)) {
          return `${colName} entre ${cond.value[0]} et ${cond.value[1]}`;
        }
        return `${colName} entre ...`;
      case 'before':
        return `${colName} avant ${new Date(cond.value).toLocaleDateString('fr-FR')}`;
      case 'after':
        return `${colName} après ${new Date(cond.value).toLocaleDateString('fr-FR')}`;
      case 'isEmpty':
        return `${colName} est vide`;
      case 'isNotEmpty':
        return `${colName} n'est pas vide`;
      default:
        return `${colName} (${cond.op})`;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <Filter className="w-3.5 h-3.5 text-[#ff284d]" />
        <span>Filtres actifs :</span>
      </div>

      {flatConditions.map((cond) => (
        <span
          key={cond.field}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#162035] text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-colors shadow-sm"
        >
          <span>{formatConditionLabel(cond)}</span>
          <button
            type="button"
            onClick={() => removeCondition(cond.field)}
            className="p-0.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Supprimer ce filtre"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {flatConditions.length > 1 && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Tout effacer</span>
        </button>
      )}
    </div>
  );
};
