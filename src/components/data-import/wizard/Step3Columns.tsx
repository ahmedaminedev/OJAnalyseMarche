import React, { useState } from 'react';
import {
  Columns,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Search,
  CheckCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  Type,
  Hash,
  ToggleLeft,
  ShieldAlert,
} from 'lucide-react';
import { ColumnSetting, WizardColumnType, WizardColumnRole } from '../../../types/wizard';

interface Step3ColumnsProps {
  columns: ColumnSetting[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnSetting[]>>;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Columns: React.FC<Step3ColumnsProps> = ({
  columns,
  setColumns,
  onNext,
  onPrev,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredColumns = columns.filter((col) => {
    const matchesSearch =
      col.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      col.originalHeader.toLowerCase().includes(searchFilter.toLowerCase()) ||
      col.key.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesRole = roleFilter === 'all' || col.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleUpdateColumn = (key: string, updates: Partial<ColumnSetting>) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...updates } : c))
    );
  };

  const handleSetAllRoles = (role: WizardColumnRole) => {
    setColumns((prev) => prev.map((c) => ({ ...c, role })));
  };

  const ignoredCount = columns.filter((c) => c.role === 'ignored').length;
  const measureCount = columns.filter((c) => c.role === 'measure').length;
  const dimensionCount = columns.filter((c) => c.role === 'dimension').length;
  const dateCount = columns.filter((c) => c.role === 'date').length;
  const excelErrorsTotal = columns.reduce((acc, c) => acc + c.excelErrorsCount, 0);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Columns className="w-6 h-6 text-[#ff284d]" />
          Typage, rôles et libellés des colonnes
        </h2>
        <p className="text-sm text-slate-400">
          Chaque colonne est analysée automatiquement. Ajustez les types de données, les rôles analytiques
          (dimension, mesure, date, identifiant) et personnalisez les libellés.
        </p>
      </div>

      {/* Summary stats badge row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Colonnes</div>
          <div className="text-xl font-bold text-white mt-0.5">{columns.length}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-blue-400 uppercase">Dimensions</div>
          <div className="text-xl font-bold text-blue-300 mt-0.5">{dimensionCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase">Mesures / Nombres</div>
          <div className="text-xl font-bold text-emerald-300 mt-0.5">{measureCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-amber-400 uppercase">Dates</div>
          <div className="text-xl font-bold text-amber-300 mt-0.5">{dateCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Ignorées</div>
          <div className="text-xl font-bold text-slate-400 mt-0.5">{ignoredCount}</div>
        </div>
      </div>

      {/* Excel errors alert if any */}
      {excelErrorsTotal > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs text-amber-200">
            <span className="font-bold">{excelErrorsTotal} erreur(s) de calcul Excel (#N/A, #DIV/0!)</span> ont été
            détectées dans les données sources. Elles seront automatiquement converties en valeur{' '}
            <code className="bg-amber-950 px-1.5 py-0.5 rounded text-amber-300">null</code> pour préserver la propreté de la base.
          </div>
        </div>
      )}

      {/* Search and filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une colonne par nom ou en-tête d’origine..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#ff284d]"
          >
            <option value="all">Tous les rôles</option>
            <option value="dimension">Dimensions uniquement</option>
            <option value="measure">Mesures uniquement</option>
            <option value="date">Dates uniquement</option>
            <option value="id">Identifiants uniquement</option>
            <option value="ignored">Ignorées uniquement</option>
          </select>
        </div>
      </div>

      {/* Columns interactive table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0 z-10">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Libellé & En-tête</th>
                <th className="py-3 px-4 min-w-[140px]">Type de données</th>
                <th className="py-3 px-4 min-w-[140px]">Rôle analytique</th>
                <th className="py-3 px-4 min-w-[240px]">Échantillon de valeurs</th>
                <th className="py-3 px-4 min-w-[160px]">Format & Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredColumns.map((col, idx) => {
                const isIgnored = col.role === 'ignored';

                return (
                  <tr
                    key={col.key}
                    className={`transition-colors ${
                      isIgnored ? 'bg-slate-950/40 opacity-50' : 'hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3 px-4 text-center font-mono text-slate-500 font-bold">
                      {idx + 1}
                    </td>

                    {/* Label & Header */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={col.label}
                          onChange={(e) => handleUpdateColumn(col.key, { label: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-[#ff284d]"
                        />
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                          <span>Origine :</span>
                          <span className="font-mono text-slate-400">
                            {col.originalHeader || '(Sans en-tête)'}
                          </span>
                          {col.isUnnamed && (
                            <span className="text-amber-400 font-semibold">[Auto-nommé]</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Data Type */}
                    <td className="py-3 px-4">
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const newType = e.target.value as WizardColumnType;
                          let newRole = col.role;
                          if (newType === 'number' && col.role !== 'ignored') newRole = 'measure';
                          if (newType === 'date' && col.role !== 'ignored') newRole = 'date';
                          if (newType === 'string' && col.role === 'measure') newRole = 'dimension';
                          handleUpdateColumn(col.key, { type: newType, role: newRole });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                      >
                        <option value="string">Texte (string)</option>
                        <option value="number">Nombre (number)</option>
                        <option value="date">Date (date)</option>
                        <option value="boolean">Booléen (boolean)</option>
                      </select>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <select
                        value={col.role}
                        onChange={(e) =>
                          handleUpdateColumn(col.key, { role: e.target.value as WizardColumnRole })
                        }
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#ff284d] ${
                          col.role === 'measure'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                            : col.role === 'dimension'
                            ? 'bg-blue-950/40 text-blue-300 border-blue-700/50'
                            : col.role === 'date'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                            : col.role === 'id'
                            ? 'bg-purple-950/40 text-purple-300 border-purple-700/50'
                            : 'bg-slate-900 text-slate-500 border-slate-700'
                        }`}
                      >
                        <option value="dimension">Dimension (filtre/axe)</option>
                        <option value="measure">Mesure (calcul/somme)</option>
                        <option value="date">Date (chronologique)</option>
                        <option value="id">Identifiant (clé unique)</option>
                        <option value="ignored">Ignorée (ne pas importer)</option>
                      </select>
                    </td>

                    {/* Sample Values */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {col.sampleValues.length > 0 ? (
                          col.sampleValues.slice(0, 3).map((val, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono truncate max-w-[120px]"
                            >
                              {String(val)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Vide</span>
                        )}
                        {col.excelErrorsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            {col.excelErrorsCount} erreurs Excel → null
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Format & Options (e.g. Ambiguous Date toggle) */}
                    <td className="py-3 px-4">
                      {col.type === 'date' ? (
                        <div className="space-y-1">
                          <select
                            value={col.dateFormatChoice || 'auto'}
                            onChange={(e) =>
                              handleUpdateColumn(col.key, {
                                dateFormatChoice: e.target.value as any,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-[#ff284d]"
                          >
                            <option value="auto">Auto-détection</option>
                            <option value="DD/MM/YYYY">Format JJ/MM/AAAA (FR)</option>
                            <option value="MM/DD/YYYY">Format MM/JJ/AAAA (US)</option>
                          </select>
                          {col.isDateAmbiguous && (
                            <div className="text-[10px] text-amber-400 font-medium">
                              ⚠️ Format ambigu (jour & mois &lt; 13)
                            </div>
                          )}
                        </div>
                      ) : col.type === 'number' ? (
                        <div className="text-[11px] text-slate-400">
                          Auto (virgule / point / devises €/$)
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">-</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la structure
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Dépivotage large vers long
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
