import React from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  TableProperties,
} from 'lucide-react';
import { ColumnSetting, UnpivotConfig } from '../../../types/wizard';
import { isPeriodHeader } from '../../../utils/unpivotHelper';

interface Step4UnpivotProps {
  columns: ColumnSetting[];
  unpivotConfig: UnpivotConfig;
  setUnpivotConfig: React.Dispatch<React.SetStateAction<UnpivotConfig>>;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Unpivot: React.FC<Step4UnpivotProps> = ({
  columns,
  unpivotConfig,
  setUnpivotConfig,
  onNext,
  onPrev,
}) => {
  const activeColumns = columns.filter((c) => c.role !== 'ignored');

  const handleToggleColumn = (key: string, isUnpivotTarget: boolean) => {
    setUnpivotConfig((prev) => {
      let unpivotKeys = [...prev.unpivotColumnKeys];
      let fixedKeys = [...prev.fixedColumnKeys];

      if (isUnpivotTarget) {
        // Add to unpivot, remove from fixed
        if (!unpivotKeys.includes(key)) unpivotKeys.push(key);
        fixedKeys = fixedKeys.filter((k) => k !== key);
      } else {
        // Add to fixed, remove from unpivot
        if (!fixedKeys.includes(key)) fixedKeys.push(key);
        unpivotKeys = unpivotKeys.filter((k) => k !== key);
      }

      return {
        ...prev,
        fixedColumnKeys: fixedKeys,
        unpivotColumnKeys: unpivotKeys,
      };
    });
  };

  const handleAutoSelectPeriods = () => {
    const periodKeys: string[] = [];
    const fixedKeys: string[] = [];

    for (const c of activeColumns) {
      if (isPeriodHeader(c.label) || isPeriodHeader(c.originalHeader)) {
        periodKeys.push(c.key);
      } else {
        fixedKeys.push(c.key);
      }
    }

    setUnpivotConfig((prev) => ({
      ...prev,
      enabled: periodKeys.length > 0,
      fixedColumnKeys: fixedKeys,
      unpivotColumnKeys: periodKeys,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <GitFork className="w-6 h-6 text-[#ff284d]" />
              Format large vers long (Dépivotage / Unpivot)
            </h2>
            <p className="text-sm text-slate-400">
              Transformez les tableaux croisés (colonnes par mois ou trimestres) en modèle tabulaire normalisé
              compatible Power BI.
            </p>
          </div>

          {/* Toggle enable switch */}
          <label className="flex items-center gap-3 cursor-pointer bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-700">
            <span className="text-xs font-semibold text-slate-300">Activer le dépivotage</span>
            <input
              type="checkbox"
              checked={unpivotConfig.enabled}
              onChange={(e) =>
                setUnpivotConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="w-5 h-5 rounded accent-[#ff284d] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {!unpivotConfig.enabled ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <TableProperties className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-white">Le dépivotage est actuellement désactivé</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vos données seront conservées dans leur format d'origine (1 ligne dans le fichier = 1 ligne dans la base).
            Si votre fichier contient des colonnes répétées par période (ex : <code>Jan-26</code>, <code>Fév-26</code>, <code>2026-03</code>),
            activez le dépivotage pour les convertir en une colonne temporelle continue.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setUnpivotConfig((prev) => ({ ...prev, enabled: true }));
                handleAutoSelectPeriods();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Détecter et configurer automatiquement
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Auto-detection banner */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Détection automatique :</span>{' '}
                {unpivotConfig.unpivotColumnKeys.length} colonne(s) de période(s) actuellement sélectionnée(s).
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoSelectPeriods}
              className="text-xs text-[#ff284d] hover:text-[#ff284d]/80 font-semibold px-3 py-1.5 rounded-lg bg-[#ff284d]/10 hover:bg-[#ff284d]/15 border border-[#ff284d]/20 transition-colors"
            >
              Ré-exécuter la détection intelligente
            </button>
          </div>

          {/* Configuration columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Names Configuration */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Noms des 2 nouvelles colonnes
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">
                    Colonne attribut / période :
                  </label>
                  <input
                    type="text"
                    value={unpivotConfig.attributeColumnName}
                    onChange={(e) =>
                      setUnpivotConfig((prev) => ({ ...prev, attributeColumnName: e.target.value }))
                    }
                    placeholder="Ex: Période, Mois, Année..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">
                    Colonne valeur / mesure :
                  </label>
                  <input
                    type="text"
                    value={unpivotConfig.valueColumnName}
                    onChange={(e) =>
                      setUnpivotConfig((prev) => ({ ...prev, valueColumnName: e.target.value }))
                    }
                    placeholder="Ex: Volume, Ventes, Immatriculations..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  />
                </div>

                <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unpivotConfig.attributeIsDate}
                    onChange={(e) =>
                      setUnpivotConfig((prev) => ({ ...prev, attributeIsDate: e.target.checked }))
                    }
                    className="w-4 h-4 rounded accent-[#ff284d] cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    Convertir automatiquement les en-têtes de période en vraies dates (ex: Jan-26 → 2026-01-01)
                  </span>
                </label>
              </div>
            </div>

            {/* Selection of columns */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>2. Répartition des colonnes</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Cochez pour dépivoter
                </span>
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-2">
                {activeColumns.map((col) => {
                  const isUnpivot = unpivotConfig.unpivotColumnKeys.includes(col.key);

                  return (
                    <div
                      key={col.key}
                      onClick={() => handleToggleColumn(col.key, !isUnpivot)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border text-xs transition-all ${
                        isUnpivot
                          ? 'bg-[#ff284d]/10 border-[#ff284d]/30 text-white font-medium'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isUnpivot}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded accent-[#ff284d] cursor-pointer"
                        />
                        <span className="truncate">{col.label}</span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isUnpivot
                            ? 'bg-[#ff284d] text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isUnpivot ? 'À dépivoter' : 'Fixe'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Before vs After comparison card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-400" />
              Schéma de transformation (Power BI Unpivot)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <div className="text-[11px] font-sans font-semibold text-slate-400 mb-1">
                  Format large actuel (matrice) :
                </div>
                <div className="text-slate-300">
                  [Colonnes fixes] | <span className="text-amber-400">Jan-26</span> | <span className="text-amber-400">Fév-26</span> | <span className="text-amber-400">Mar-26</span> ...
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <div className="text-[11px] font-sans font-semibold text-emerald-400 mb-1">
                  Format long après dépivotage :
                </div>
                <div className="text-slate-300">
                  [Colonnes fixes] | <span className="text-emerald-400 font-bold">{unpivotConfig.attributeColumnName || 'Période'}</span> | <span className="text-emerald-400 font-bold">{unpivotConfig.valueColumnName || 'Valeur'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux colonnes
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Nettoyage & Casse
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
