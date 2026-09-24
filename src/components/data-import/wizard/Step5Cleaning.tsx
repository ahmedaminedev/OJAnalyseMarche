import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckSquare,
  Square,
  Wand2,
  Scissors,
  Type,
  Merge,
  Info,
} from 'lucide-react';
import { CleaningConfig, VariantMergeRule } from '../../../types/wizard';

interface Step5CleaningProps {
  cleaningConfig: CleaningConfig;
  setCleaningConfig: React.Dispatch<React.SetStateAction<CleaningConfig>>;
  onNext: () => void;
  onPrev: () => void;
}

export const Step5Cleaning: React.FC<Step5CleaningProps> = ({
  cleaningConfig,
  setCleaningConfig,
  onNext,
  onPrev,
}) => {
  const handleToggleRule = (id: string) => {
    setCleaningConfig((prev) => ({
      ...prev,
      variantMerges: prev.variantMerges.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  };

  const handleUpdateTargetValue = (id: string, targetCanonicalValue: string) => {
    setCleaningConfig((prev) => ({
      ...prev,
      variantMerges: prev.variantMerges.map((r) =>
        r.id === id ? { ...r, targetCanonicalValue } : r
      ),
    }));
  };

  const handleSelectAllRules = (enabled: boolean) => {
    setCleaningConfig((prev) => ({
      ...prev,
      variantMerges: prev.variantMerges.map((r) => ({ ...r, enabled })),
    }));
  };

  const enabledRulesCount = cleaningConfig.variantMerges.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-[#ff284d]" />
          Nettoyage des données & Harmonisation de la casse
        </h2>
        <p className="text-sm text-slate-400">
          Supprimez les espaces superflus, standardisez la casse et fusionnez automatiquement les variantes
          orthographiques ou typographiques détectées.
        </p>
      </div>

      {/* Global Text Cleaning Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trim */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            Nettoyage des espaces (Trim)
          </div>

          <label className="flex items-start gap-3 cursor-pointer group pt-1">
            <input
              type="checkbox"
              checked={cleaningConfig.autoTrim}
              onChange={(e) =>
                setCleaningConfig((prev) => ({ ...prev, autoTrim: e.target.checked }))
              }
              className="w-4 h-4 mt-0.5 rounded accent-[#ff284d] cursor-pointer"
            />
            <div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                Activer le Trim automatique (Recommandé)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Supprime les espaces au début, à la fin et réduit les espaces consécutifs multiples
                (ex: <code>"&nbsp;OMODA&nbsp;&nbsp;5&nbsp;"</code> → <code>"OMODA 5"</code>).
              </div>
            </div>
          </label>
        </div>

        {/* Text Case */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-400" />
            Unification de la casse des textes
          </div>

          <select
            value={cleaningConfig.textCase}
            onChange={(e) =>
              setCleaningConfig((prev) => ({ ...prev, textCase: e.target.value as any }))
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
          >
            <option value="preserve">Conserver la casse d’origine telle quelle</option>
            <option value="upper">TOUT EN MAJUSCULES (ex: OMODA 5)</option>
            <option value="lower">tout en minuscules (ex: omoda 5)</option>
            <option value="title">Première Lettre Majuscule (ex: Omoda 5)</option>
          </select>
          <div className="text-[11px] text-slate-500">
            S’applique aux colonnes dimensionnelles (texte) pour éviter les doublons dus à la casse.
          </div>
        </div>
      </div>

      {/* Near-Variants Detection & Interactive Fusion Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Merge className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Détection des variantes proches & Fusion proposée
              </div>
              <div className="text-[11px] text-slate-400">
                L’algorithme compare les valeurs textuelles et propose d’harmoniser les écarts mineurs
                (ex: "OMODA" vs "Omoda " vs "omoda").
              </div>
            </div>
          </div>

          {cleaningConfig.variantMerges.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAllRules(true)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
              >
                Tout cocher ({cleaningConfig.variantMerges.length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllRules(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 px-2.5 py-1 rounded bg-slate-800 border border-slate-700"
              >
                Tout décocher
              </button>
            </div>
          )}
        </div>

        {cleaningConfig.variantMerges.length === 0 ? (
          <div className="bg-slate-950/60 rounded-xl p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            Aucune variante orthographique discordante n’a été détectée dans l’échantillon analysé.
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                    <th className="py-2.5 px-3 w-12 text-center">Actif</th>
                    <th className="py-2.5 px-3">Colonne</th>
                    <th className="py-2.5 px-3">Valeur d'origine détectée</th>
                    <th className="py-2.5 px-3 w-16 text-center">Occurr.</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Valeur canonique cible (modifiable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cleaningConfig.variantMerges.map((rule) => (
                    <tr
                      key={rule.id}
                      className={`transition-colors ${
                        rule.enabled ? 'bg-slate-900/40 text-slate-200' : 'opacity-40 text-slate-500'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="w-4 h-4 rounded accent-[#ff284d] cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-300">
                        {rule.columnName}
                      </td>
                      <td className="py-2.5 px-3 text-rose-300">
                        "{rule.variantValue}"
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {rule.count}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={rule.targetCanonicalValue}
                          onChange={(e) => handleUpdateTargetValue(rule.id, e.target.value)}
                          disabled={!rule.enabled}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-mono focus:outline-none focus:border-[#ff284d] disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-900/80 p-2.5 text-[11px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
              <span>{enabledRulesCount} fusion(s) validée(s) par l’utilisateur</span>
              <span className="text-slate-500">Seules les lignes cochées seront remplacées</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au format large/long
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Mapping sémantique (optionnel)
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
