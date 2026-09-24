import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  StopCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  BarChart2,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  UploadChunkState,
  ReconciliationReportUI,
  FileConfig,
  StructureConfig,
} from '../../../types/wizard';
import { DuplicateFileConflict } from '../../../services/importService';

interface Step8UploadProps {
  fileConfig: FileConfig;
  structureConfig: StructureConfig;
  uploadState: UploadChunkState;
  isUploading: boolean;
  reconciliationResult: ReconciliationReportUI | null;
  duplicateConflict: DuplicateFileConflict | null;
  uploadedDatasetId: string | null;
  errorMessage: string | null;
  onStartUpload: (forceReplace?: boolean) => void;
  onCancelUpload: () => void;
  onReset: () => void;
  onViewData?: (datasetId: string) => void;
  onViewAnalytics?: (datasetId: string) => void;
}

export const Step8Upload: React.FC<Step8UploadProps> = ({
  fileConfig,
  structureConfig,
  uploadState,
  isUploading,
  reconciliationResult,
  duplicateConflict,
  uploadedDatasetId,
  errorMessage,
  onStartUpload,
  onCancelUpload,
  onReset,
  onViewData,
  onViewAnalytics,
}) => {
  const isFinished = reconciliationResult && reconciliationResult.ok;
  const isFailed = !isUploading && ((reconciliationResult && !reconciliationResult.ok) || errorMessage);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[#ff284d]" />
          Téléversement par lots & Réconciliation d’intégrité
        </h2>
        <p className="text-sm text-slate-400">
          Les lignes sont transmises par lots sécurisés de 2000 lignes vers MongoDB Atlas.
          Dès réception, le serveur vérifie automatiquement le nombre de lignes et les totaux de contrôle (checksums).
        </p>
      </div>

      {/* 409 DUPLICATE CONFLICT BANNER / DIALOG */}
      {duplicateConflict && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300">
                Fichier déjà importé (Conflit SHA-256)
              </h3>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                Ce fichier identique (même nom et même empreinte SHA-256) a déjà été importé précédemment
                dans la base de données.
              </p>
              <div className="mt-2 text-[11px] font-mono text-amber-300/80 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-amber-500/30">
                Fichier : {duplicateConflict.existingFileName} • Date : {duplicateConflict.existingImportedAt}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Annuler et importer un autre fichier
            </button>
            <button
              type="button"
              onClick={() => onStartUpload(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Écraser et remplacer le jeu de données
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && !duplicateConflict && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold text-rose-300">Échec du téléversement</div>
            <div className="text-xs text-rose-200/80 mt-1">{errorMessage}</div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onStartUpload(false)}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors"
              >
                Réessayer le téléversement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PROGRESS UPLOAD CARD */}
      {isUploading && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#ff284d]/10 text-[#ff284d] flex items-center justify-center animate-pulse">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Transfert par lots en cours...</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Lot <span className="font-semibold text-slate-200">{uploadState.chunkIndex}</span> sur{' '}
                  <span className="font-semibold text-slate-200">{uploadState.totalChunks}</span>
                  {uploadState.retries > 0 && (
                    <span className="text-amber-400 font-bold ml-2">
                      (Tentative {uploadState.retries}/3)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCancelUpload}
              disabled={uploadState.isCancelled}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
              {uploadState.isCancelled ? 'Annulation...' : 'Annuler l’envoi'}
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">
                {uploadState.sentRows.toLocaleString('fr-FR')} / {uploadState.totalRows.toLocaleString('fr-FR')} lignes transmises
              </span>
              <span className="text-sm font-black text-white font-mono">{uploadState.percent}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-[#ff284d] via-amber-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,40,77,0.5)]"
                style={{ width: `${uploadState.percent}%` }}
              />
            </div>

            <div className="text-xs text-slate-400 animate-pulse pt-1">
              {uploadState.statusText || 'Envoi en cours...'}
            </div>
          </div>
        </div>
      )}

      {/* IDLE READY TO UPLOAD CARD */}
      {!isUploading && !isFinished && !duplicateConflict && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-5 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#ff284d]/20 to-amber-500/10 border border-[#ff284d]/30 text-[#ff284d] flex items-center justify-center mx-auto shadow-lg">
            <Database className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Prêt pour l’injection des données</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Toutes les étapes de préparation sont validées. Cliquez ci-dessous pour démarrer le téléversement
              par lots de 2000 lignes avec réconciliation d'intégrité sur MongoDB Atlas.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => onStartUpload(false)}
              className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff284d] via-red-600 to-amber-600 hover:from-[#ff284d]/90 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-[#ff284d]/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <UploadCloud className="w-5 h-5" />
              Lancer l’importation définitive
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS & RECONCILIATION REPORT */}
      {isFinished && reconciliationResult && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 space-y-6 shadow-2xl">
          {/* Success Banner */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-300">
                Import vérifié : {reconciliationResult.actualRows.toLocaleString('fr-FR')} lignes enregistrées, totaux identiques !
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Le serveur a certifié l’exactitude de chaque lot. Les index composés et les méta-statistiques sont calculés.
              </div>
            </div>
          </div>

          {/* Checksums Details Table */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Rapport de réconciliation serveur (Totaux de contrôle certifiés)
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Mesure / Contrôle</th>
                    <th className="py-2.5 px-4 font-mono text-center">Valeur attendue (Client)</th>
                    <th className="py-2.5 px-4 font-mono text-center">Valeur enregistrée (MongoDB)</th>
                    <th className="py-2.5 px-4 text-center">Statut d'intégrité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {/* Row count check */}
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-white">
                      Nombre total de lignes insérées
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-300">
                      {reconciliationResult.expectedRows.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">
                      {reconciliationResult.actualRows.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Conforme (100%)
                      </span>
                    </td>
                  </tr>

                  {/* Column checksums */}
                  {reconciliationResult.checksums.map((cs, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4 font-sans text-slate-300">
                        Somme : {cs.label}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-400">
                        {typeof cs.expected === 'number'
                          ? cs.expected.toLocaleString('fr-FR')
                          : String(cs.expected)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">
                        {typeof cs.actual === 'number'
                          ? cs.actual.toLocaleString('fr-FR')
                          : String(cs.actual)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {cs.ok ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Exact
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Écart détecté
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons after successful import */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Importer un autre fichier
            </button>

            <div className="flex items-center gap-3">
              {uploadedDatasetId && onViewData && (
                <button
                  type="button"
                  onClick={() => onViewData(uploadedDatasetId)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  Consulter les données
                </button>
              )}

              {uploadedDatasetId && onViewAnalytics && (
                <button
                  type="button"
                  onClick={() => onViewAnalytics(uploadedDatasetId)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
                >
                  <BarChart2 className="w-4 h-4" />
                  Analyser dans le tableau de bord
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
