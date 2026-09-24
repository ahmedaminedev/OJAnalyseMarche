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
  isMongoConnected?: boolean;
  databaseName?: string;
  onOpenMongoModal?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportValidation: React.FC<ImportValidationProps> = ({
  sheetAnalysis,
  canConfirm,
  isSubmitting,
  isMongoConnected = false,
  databaseName = 'omoda_jaecoo_stats_db',
  onOpenMongoModal,
  onConfirm,
  onCancel,
}) => {
  const hasBlockingErrors = sheetAnalysis.issues.some((i) => i.severity === 'error');
  const hasWarnings = sheetAnalysis.issues.some((i) => i.severity === 'warning');

  const handleConfirmClick = () => {
    if (!isMongoConnected && onOpenMongoModal) {
      onOpenMongoModal();
      return;
    }
    onConfirm();
  };

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
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-tight">
              {hasBlockingErrors
                ? 'Des erreurs bloquantes empêchent l’enregistrement'
                : 'Prêt pour l’enregistrement dans la base de données'}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isMongoConnected
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-700/60'
              }`}
            >
              {isMongoConnected ? 'MongoDB Connecté' : 'MongoDB Déconnecté'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasBlockingErrors
              ? 'Veuillez corriger la feuille ou choisir une autre feuille valide.'
              : `${sheetAnalysis.rowCount.toLocaleString(
                  'fr-FR'
                )} lignes et ${sheetAnalysis.columnCount} colonnes seront sauvegardées dans la base backend ${databaseName}.`}
          </p>
          {!isMongoConnected && onOpenMongoModal && (
            <button
              type="button"
              onClick={onOpenMongoModal}
              className="mt-1.5 text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer inline-flex items-center gap-1"
            >
              <span>Connecter votre base MongoDB (Atlas / Distante)</span>
            </button>
          )}
        </div>
      </div>

      {/* Right buttons */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
        {!isMongoConnected && onOpenMongoModal && (
          <button
            type="button"
            onClick={onOpenMongoModal}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Connecter MongoDB</span>
          </button>
        )}

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
          onClick={handleConfirmClick}
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

