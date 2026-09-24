import React, { useState } from 'react';
import { X, Plus, Trash2, Layers, Check, AlertCircle } from 'lucide-react';
import {
  DatasetColumn,
  FilterGroup,
  FilterCondition,
  FilterLogic,
  FilterOperator,
} from '../../../types/analytics';
import { useAnalyticsStore } from '../../../store/useAnalyticsStore';

interface AdvancedFilterBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: DatasetColumn[];
}

export const AdvancedFilterBuilderModal: React.FC<AdvancedFilterBuilderModalProps> = ({
  isOpen,
  onClose,
  columns,
}) => {
  const { filters, setFilters } = useAnalyticsStore();
  const [localFilters, setLocalFilters] = useState<FilterGroup>(() =>
    JSON.parse(JSON.stringify(filters))
  );

  if (!isOpen) return null;

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const addConditionToGroup = (targetGroup: FilterGroup) => {
    const defaultCol = columns[0];
    const newCond: FilterCondition = {
      field: defaultCol?.key || '',
      op: defaultCol?.type === 'number' ? 'eq' : defaultCol?.type === 'date' ? 'after' : 'eq',
      value: '',
    };
    targetGroup.conditions.push(newCond);
    setLocalFilters({ ...localFilters });
  };

  const addSubGroupToGroup = (targetGroup: FilterGroup) => {
    const defaultCol = columns[0];
    const newGroup: FilterGroup = {
      logic: targetGroup.logic === 'AND' ? 'OR' : 'AND',
      conditions: [
        {
          field: defaultCol?.key || '',
          op: 'eq',
          value: '',
        },
      ],
    };
    targetGroup.conditions.push(newGroup);
    setLocalFilters({ ...localFilters });
  };

  const removeConditionFromGroup = (targetGroup: FilterGroup, index: number) => {
    targetGroup.conditions.splice(index, 1);
    setLocalFilters({ ...localFilters });
  };

  const renderGroup = (group: FilterGroup, depth: number = 1, isRoot: boolean = false) => {
    return (
      <div
        className={`p-3.5 rounded-xl border space-y-3 ${
          isRoot
            ? 'bg-[#0f172a]/60 border-slate-700/80'
            : 'bg-[#131d36]/80 border-slate-700/60 ml-4'
        }`}
      >
        {/* Group Header: Logic toggle (AND / OR) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">
              Règle :
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-700 p-0.5">
              <button
                type="button"
                onClick={() => {
                  group.logic = 'AND';
                  setLocalFilters({ ...localFilters });
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  group.logic === 'AND'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TOUTES (ET / AND)
              </button>
              <button
                type="button"
                onClick={() => {
                  group.logic = 'OR';
                  setLocalFilters({ ...localFilters });
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  group.logic === 'OR'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AU MOINS UNE (OU / OR)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => addConditionToGroup(group)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Condition</span>
            </button>

            {depth < 5 && (
              <button
                type="button"
                onClick={() => addSubGroupToGroup(group)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sous-groupe</span>
              </button>
            )}
          </div>
        </div>

        {/* Conditions List */}
        <div className="space-y-2">
          {group.conditions.length === 0 ? (
            <div className="text-center py-2 text-slate-500 text-xs italic">
              Aucune condition dans ce groupe. Cliquez sur "+ Condition".
            </div>
          ) : (
            group.conditions.map((item, idx) => {
              if ('logic' in item) {
                // Subgroup
                return (
                  <div key={idx} className="relative group/sub">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        type="button"
                        onClick={() => removeConditionFromGroup(group, idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                        title="Supprimer ce sous-groupe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {renderGroup(item as FilterGroup, depth + 1, false)}
                  </div>
                );
              }

              // Individual Condition
              const cond = item as FilterCondition;
              const selectedCol = columns.find((c) => c.key === cond.field) || columns[0];

              return (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 bg-[#0c1424] p-2.5 rounded-xl border border-slate-800"
                >
                  {/* Column Select */}
                  <select
                    value={cond.field}
                    onChange={(e) => {
                      cond.field = e.target.value;
                      const c = columns.find((col) => col.key === e.target.value);
                      cond.op = c?.type === 'number' ? 'eq' : 'eq';
                      cond.value = '';
                      setLocalFilters({ ...localFilters });
                    }}
                    className="bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  >
                    {columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.type})
                      </option>
                    ))}
                  </select>

                  {/* Operator Select */}
                  <select
                    value={cond.op}
                    onChange={(e) => {
                      cond.op = e.target.value as FilterOperator;
                      setLocalFilters({ ...localFilters });
                    }}
                    className="bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  >
                    {selectedCol?.type === 'string' && (
                      <>
                        <option value="eq">Égal à (=)</option>
                        <option value="neq">Différent de (≠)</option>
                        <option value="contains">Contient</option>
                        <option value="startsWith">Commence par</option>
                        <option value="endsWith">Se termine par</option>
                        <option value="isEmpty">Est vide</option>
                        <option value="isNotEmpty">N'est pas vide</option>
                      </>
                    )}
                    {selectedCol?.type === 'number' && (
                      <>
                        <option value="eq">Égal à (=)</option>
                        <option value="neq">Différent de (≠)</option>
                        <option value="gt">Supérieur (&gt;)</option>
                        <option value="gte">Supérieur ou égal (≥)</option>
                        <option value="lt">Inférieur (&lt;)</option>
                        <option value="lte">Inférieur ou égal (≤)</option>
                        <option value="isEmpty">Est vide</option>
                        <option value="isNotEmpty">N'est pas vide</option>
                      </>
                    )}
                    {selectedCol?.type === 'date' && (
                      <>
                        <option value="eq">Égal à (date)</option>
                        <option value="before">Avant</option>
                        <option value="after">Après</option>
                        <option value="isEmpty">Est vide</option>
                        <option value="isNotEmpty">N'est pas vide</option>
                      </>
                    )}
                    {selectedCol?.type === 'boolean' && (
                      <option value="eq">Égal à</option>
                    )}
                  </select>

                  {/* Value Input */}
                  {cond.op !== 'isEmpty' && cond.op !== 'isNotEmpty' && (
                    <input
                      type={selectedCol?.type === 'number' ? 'number' : selectedCol?.type === 'date' ? 'date' : 'text'}
                      value={cond.value ?? ''}
                      onChange={(e) => {
                        cond.value = selectedCol?.type === 'number' ? Number(e.target.value) : e.target.value;
                        setLocalFilters({ ...localFilters });
                      }}
                      placeholder="Valeur..."
                      className="flex-1 bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                    />
                  )}

                  {/* Remove Condition */}
                  <button
                    type="button"
                    onClick={() => removeConditionFromGroup(group, idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e1626] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 text-[#ff284d] border border-red-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Constructeur Avancé de Filtres</h3>
              <p className="text-xs text-slate-400">
                Créez des règles logiques complexes avec groupes ET (AND) et OU (OR) imbriqués.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {renderGroup(localFilters, 1, true)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
          <button
            type="button"
            onClick={() => setLocalFilters({ logic: 'AND', conditions: [] })}
            className="text-xs font-semibold text-red-400 hover:text-red-300"
          >
            Tout réinitialiser
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20"
            >
              <Check className="w-4 h-4" />
              <span>Appliquer les filtres</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
