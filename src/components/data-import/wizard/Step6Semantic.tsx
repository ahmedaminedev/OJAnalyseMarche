import React from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Car,
  Layers,
  Fuel,
  MapPin,
  Calendar,
  BarChart3,
  Info,
} from 'lucide-react';
import { ColumnSetting, SemanticMappingConfig } from '../../../types/wizard';
import { suggestSemanticMapping } from '../../../utils/semanticDetector';

interface Step6SemanticProps {
  columns: ColumnSetting[];
  semanticMapping: SemanticMappingConfig;
  setSemanticMapping: React.Dispatch<React.SetStateAction<SemanticMappingConfig>>;
  onNext: () => void;
  onPrev: () => void;
}

export const Step6Semantic: React.FC<Step6SemanticProps> = ({
  columns,
  semanticMapping,
  setSemanticMapping,
  onNext,
  onPrev,
}) => {
  const activeColumns = columns.filter((c) => c.role !== 'ignored');

  const handleSuggest = () => {
    const suggestions = suggestSemanticMapping(columns);
    setSemanticMapping(suggestions);
  };

  const handleClear = () => {
    setSemanticMapping({});
  };

  const semanticFields = [
    {
      key: 'brand' as const,
      label: 'Marque automobile',
      desc: 'Constructeur (ex: OMODA, JAECOO, CHERY...)',
      icon: Car,
      color: 'text-rose-400',
    },
    {
      key: 'model' as const,
      label: 'Modèle de véhicule',
      desc: 'Désignation commerciale (ex: OMODA 5, J7, J8...)',
      icon: Layers,
      color: 'text-blue-400',
    },
    {
      key: 'energy' as const,
      label: 'Motorisation / Énergie',
      desc: 'Carburant ou groupe motopropulseur (Essence, EV, PHEV, Hybride...)',
      icon: Fuel,
      color: 'text-amber-400',
    },
    {
      key: 'region' as const,
      label: 'Région / Territoire',
      desc: 'Zone géographique, gouvernorat ou pays de vente',
      icon: MapPin,
      color: 'text-emerald-400',
    },
    {
      key: 'date' as const,
      label: 'Date de référence',
      desc: 'Axe temporel chronologique (jour, mois, année)',
      icon: Calendar,
      color: 'text-cyan-400',
    },
    {
      key: 'volume' as const,
      label: 'Volume / Ventes',
      desc: 'Quantité d’immatriculations ou volume numérique des ventes',
      icon: BarChart3,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Compass className="w-6 h-6 text-[#ff284d]" />
          Mapping sémantique suggéré (100% Optionnel)
        </h2>
        <p className="text-sm text-slate-400">
          Cette étape permet d’associer des rôles standards du marché automobile aux colonnes détectées.
          C’est une <strong className="text-slate-200">simple suggestion</strong> modifiable :
          l'application Power BI reste totalement générique même si vous ne renseignez aucun mapping.
        </p>
      </div>

      {/* Toolbar actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSuggest}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#ff284d]/10 hover:bg-[#ff284d]/20 text-xs font-semibold text-[#ff284d] border border-[#ff284d]/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Recalculer les suggestions automatiques
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tout effacer
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          Vous pouvez passer cette étape sans rien sélectionner.
        </div>
      </div>

      {/* Semantic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {semanticFields.map((field) => {
          const Icon = field.icon;
          const currentValue = semanticMapping[field.key];
          const matchedCol = activeColumns.find((c) => c.key === currentValue);

          return (
            <div
              key={field.key}
              className={`p-5 rounded-2xl border transition-all ${
                currentValue
                  ? 'bg-slate-900/90 border-[#ff284d]/30 shadow-md'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${field.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{field.label}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{field.desc}</div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Colonne source associée :
                </label>
                <select
                  value={currentValue || ''}
                  onChange={(e) =>
                    setSemanticMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value || undefined,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                >
                  <option value="">(Non attribué / Aucun)</option>
                  {activeColumns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label} ({col.type})
                    </option>
                  ))}
                </select>
              </div>

              {matchedCol && matchedCol.sampleValues.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-500 mb-1">Échantillon :</div>
                  <div className="flex flex-wrap gap-1">
                    {matchedCol.sampleValues.slice(0, 2).map((val, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 truncate max-w-[140px]"
                      >
                        {String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au nettoyage
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Vérification & Qualité
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
