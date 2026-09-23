import React from 'react';
import {
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { SheetAnalysis } from '../../types/import';

interface ImportValidationProps {
  sheetAnalysis: SheetAnalysis;
  canConfirm: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportValidation: React.FC<ImportValidationProps> = ({
  sheetAnalysis,
  canConfirm,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  const hasBlockingErrors = sheetAnalysis.issues.some((i) => i.severity === 'error');
  const hasWarnings = sheetAnalysis.issues.some((i) => i.severity === 'warning');

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left message */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            hasBlockingErrors
              ? 'bg-red-950/40 text-red-400 border border-red-800/60'
              : hasWarnings
              ? 'bg-amber-950/40 text-amber-400 border border-amber-800/60'
              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
          }`}
        >
          {hasBlockingErrors ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            {hasBlockingErrors
              ? 'Des erreurs bloquantes empêchent l’enregistrement'
              : 'Prêt pour l’enregistrement dans la base de données'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasBlockingErrors
              ? 'Veuillez corriger la feuille ou choisir une autre feuille valide.'
              : `${sheetAnalysis.rowCount.toLocaleString(
                  'fr-FR'
                )} lignes et ${sheetAnalysis.columnCount} colonnes seront sauvegardées dans la base backend omoda_jaecoo_stats_db.`}
          </p>
        </div>
      </div>

      {/* Right buttons */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/90 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          <span>Annuler</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm || hasBlockingErrors || isSubmitting}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
            canConfirm && !hasBlockingErrors && !isSubmitting
              ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-red-600/30 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Enregistrement en base...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>Enregistrer dans la base de données</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

