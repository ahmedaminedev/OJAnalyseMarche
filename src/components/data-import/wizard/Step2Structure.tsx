import React from 'react';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Table,
  Sliders,
  Filter,
  ArrowDownToLine,
  HelpCircle,
} from 'lucide-react';
import { StructureConfig, FileConfig } from '../../../types/wizard';

interface Step2StructureProps {
  fileConfig: FileConfig;
  structureConfig: StructureConfig;
  setStructureConfig: React.Dispatch<React.SetStateAction<StructureConfig>>;
  rawSheetPreview: unknown[][];
  onSheetChange: (sheetName: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2Structure: React.FC<Step2StructureProps> = ({
  fileConfig,
  structureConfig,
  setStructureConfig,
  rawSheetPreview,
  onSheetChange,
  onNext,
  onPrev,
}) => {
  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#ff284d]" />
          Structure et délimitation des données
        </h2>
        <p className="text-sm text-slate-400">
          Définissez la feuille à traiter, la ligne contenant vos en-têtes de colonnes, et la plage utile de données.
        </p>
      </div>

      {/* Main configuration grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sheet & Rows settings */}
        <div className="lg:col-span-1 space-y-5">
          {/* Sheet selection (if multiple) */}
          {fileConfig.availableSheets.length > 1 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                Feuille active
              </label>
              <select
                value={structureConfig.activeSheetName}
                onChange={(e) => onSheetChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff284d]"
              >
                {fileConfig.availableSheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Vous pouvez traiter les autres feuilles dans des imports ultérieurs indépendants.
              </p>
            </div>
          )}

          {/* Row delimiters */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#ff284d]" />
              Délimitation des lignes
            </div>

            {/* Header row index */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Ligne des en-têtes (1-indexé) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, rawSheetPreview.length)}
                  value={structureConfig.headerRowIndex + 1}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) - 1 || 0);
                    setStructureConfig((prev) => ({
                      ...prev,
                      headerRowIndex: val,
                      firstDataRowIndex: Math.max(val + 1, prev.firstDataRowIndex),
                    }));
                  }}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#ff284d]"
                />
                <span className="text-xs text-slate-500">
                  (ligne {structureConfig.headerRowIndex + 1} dans le fichier)
                </span>
              </div>
            </div>

            {/* First data row index */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Première ligne de données :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={structureConfig.headerRowIndex + 2}
                  value={structureConfig.firstDataRowIndex + 1}
                  onChange={(e) => {
                    const val = Math.max(structureConfig.headerRowIndex + 1, parseInt(e.target.value, 10) - 1 || 0);
                    setStructureConfig((prev) => ({
                      ...prev,
                      firstDataRowIndex: val,
                    }));
                  }}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#ff284d]"
                />
                <span className="text-xs text-slate-500">
                  (commence après l'en-tête)
                </span>
              </div>
            </div>

            {/* Last data row index (optional) */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Dernière ligne (optionnel) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Fin du fichier"
                  value={structureConfig.lastDataRowIndex !== null ? structureConfig.lastDataRowIndex + 1 : ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) - 1 : null;
                    setStructureConfig((prev) => ({
                      ...prev,
                      lastDataRowIndex: val,
                    }));
                  }}
                  className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#ff284d]"
                />
                <span className="text-xs text-slate-500">
                  {structureConfig.lastDataRowIndex !== null ? 'Ligne max fixée' : 'Jusqu’à la fin'}
                </span>
              </div>
            </div>
          </div>

          {/* Special transformation options */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3.5">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              Options de filtrage & fusion
            </div>

            {/* Ignore empty rows */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={structureConfig.ignoreEmptyRows}
                onChange={(e) =>
                  setStructureConfig((prev) => ({ ...prev, ignoreEmptyRows: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#ff284d] cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Ignorer les lignes entièrement vides
                </div>
                <div className="text-[11px] text-slate-500">
                  Évite d’importer des lignes blanches ou des espaces orphelins.
                </div>
              </div>
            </label>

            {/* Ignore total rows */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={structureConfig.ignoreTotalRows}
                onChange={(e) =>
                  setStructureConfig((prev) => ({ ...prev, ignoreTotalRows: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#ff284d] cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Ignorer les lignes de total / sous-total
                </div>
                <div className="text-[11px] text-slate-500">
                  Ignore les lignes contenant « Total », « Somme », etc., pour ne pas fausser les agrégations.
                </div>
              </div>
            </label>

            {/* Fill down merged cells */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={structureConfig.fillDownMergedCells}
                onChange={(e) =>
                  setStructureConfig((prev) => ({ ...prev, fillDownMergedCells: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#ff284d] cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
                  Remplir vers le bas (Fill Down)
                </div>
                <div className="text-[11px] text-slate-500">
                  Propager la valeur précédente vers les cellules vides consécutives (idéal pour les cellules fusionnées Excel).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column: Visual raw sheet preview */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-400" />
              Aperçu des premières lignes du fichier
            </div>
            <div className="text-xs text-slate-400">
              Feuille : <span className="font-semibold text-slate-300">{structureConfig.activeSheetName}</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3 w-16 text-center border-r border-slate-800 font-semibold">
                      Ligne #
                    </th>
                    <th className="py-2.5 px-3 w-28 text-center border-r border-slate-800 font-semibold">
                      Statut
                    </th>
                    {rawSheetPreview[0] &&
                      (rawSheetPreview[0] as unknown[]).map((_, cIdx) => (
                        <th key={cIdx} className="py-2.5 px-3 font-semibold text-slate-400 whitespace-nowrap min-w-[120px]">
                          Col {cIdx + 1}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {rawSheetPreview.map((row, rIdx) => {
                    const isHeaderRow = rIdx === structureConfig.headerRowIndex;
                    const isDataRow = rIdx >= structureConfig.firstDataRowIndex;

                    return (
                      <tr
                        key={rIdx}
                        onClick={() => {
                          setStructureConfig((prev) => ({
                            ...prev,
                            headerRowIndex: rIdx,
                            firstDataRowIndex: rIdx + 1,
                          }));
                        }}
                        className={`transition-colors cursor-pointer ${
                          isHeaderRow
                            ? 'bg-[#ff284d]/15 hover:bg-[#ff284d]/20 text-white font-bold'
                            : isDataRow
                            ? 'bg-slate-900/40 hover:bg-slate-900/80 text-slate-300'
                            : 'bg-slate-950/40 opacity-40 hover:opacity-70 text-slate-500'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center border-r border-slate-800/80 font-bold">
                          {rIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-800/80 whitespace-nowrap">
                          {isHeaderRow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff284d] text-white">
                              <Check className="w-3 h-3 stroke-[3]" /> En-têtes
                            </span>
                          ) : isDataRow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Données
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-800">
                              Ignorée
                            </span>
                          )}
                        </td>

                        {(row as unknown[]).map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-2.5 px-3 max-w-[200px] truncate border-r border-slate-800/40"
                          >
                            {cell !== null && cell !== undefined && String(cell).trim() !== '' ? (
                              String(cell)
                            ) : (
                              <span className="text-slate-600 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-900/80 border-t border-slate-800 p-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                💡 Cliquez directement sur une ligne du tableau pour la définir comme ligne d'en-têtes.
              </span>
              <span className="font-semibold text-slate-300">
                Ligne {structureConfig.headerRowIndex + 1} sélectionnée
              </span>
            </div>
          </div>
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
          Retour au fichier
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Configuration des colonnes
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
