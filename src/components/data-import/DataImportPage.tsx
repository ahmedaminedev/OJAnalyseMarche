import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  Plus,
  Database,
  Layers,
  ShieldAlert,
  X,
} from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { SheetSelector } from './SheetSelector';
import { ImportSummary } from './ImportSummary';
import { FilePreviewTable } from './FilePreviewTable';
import { ImportValidation } from './ImportValidation';
import { ExcelParseResult, ImportedFileRecord, ImportStatus } from '../../types/import';
import { parseExcelFile } from '../../utils/excelParser';
import { importService, ChunkProgress } from '../../services/importService';

interface DataImportPageProps {
  onNavigateToImportedFiles: (tab?: 'history' | 'datasets', fileId?: string) => void;
  currentUserEmail?: string;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({
  onNavigateToImportedFiles,
  currentUserEmail = 'utilisateur@omoda-jaecoo.tn',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Database state
  const [databaseName, setDatabaseName] = useState('omoda_jaecoo_stats_db');

  // Check database status on mount
  const checkMongoStatus = useCallback(async () => {
    try {
      const health = await importService.getHealth();
      if (health && health.database) {
        if (health.database.name) setDatabaseName(health.database.name);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    checkMongoStatus();
  }, [checkMongoStatus]);

  // Submission state & batch progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<ChunkProgress | null>(null);
  const [confirmedRecord, setConfirmedRecord] = useState<ImportedFileRecord | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<{
    existingDatasetId: string;
    existingFileName: string;
    existingImportedAt: string;
    message: string;
  } | null>(null);

  // Handle file selection and initiate client parsing
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParseResult(null);
    setConfirmedRecord(null);
    setDuplicateConflict(null);
    setBatchProgress(null);
    setIsParsing(true);
    setProgressPercent(10);
    setProgressStatus('Préparation et détection de la structure...');

    try {
      const result = await parseExcelFile(file, (percent, status) => {
        setProgressPercent(percent);
        setProgressStatus(status);
      });

      setParseResult(result);
      if (result.sheetNames.length > 0) {
        setActiveSheetName(result.sheetNames[0]);
      }
    } catch (err) {
      console.error('Erreur lors de la lecture du fichier:', err);
      setParseError(
        err instanceof Error
          ? err.message
          : 'Impossible de lire le fichier. Vérifiez qu’il n’est pas corrompu.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setParseError(null);
    setConfirmedRecord(null);
    setDuplicateConflict(null);
    setBatchProgress(null);
    setIsParsing(false);
    setProgressPercent(0);
    setProgressStatus('');
  };

  const activeSheetAnalysis = parseResult && activeSheetName ? parseResult.sheets[activeSheetName] : null;

  // Handle final import confirmation directly to backend local database
  const handleConfirmImport = async (replaceIfExists = false) => {
    if (!parseResult || !activeSheetAnalysis || !selectedFile) return;

    setIsSubmitting(true);
    setParseError(null);
    setDuplicateConflict(null);

    try {
      const newRecord = await importService.importInBatches({
        file: selectedFile,
        parseResult,
        activeSheetName,
        sheetAnalysis: activeSheetAnalysis,
        currentUserEmail,
        replaceIfExists,
        onProgress: (p) => {
          setBatchProgress(p);
        },
      });

      setConfirmedRecord(newRecord);
      setParseError(null);
      setDuplicateConflict(null);
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement dans la base de données backend:", err);

      if (err.isDuplicate) {
        setDuplicateConflict({
          existingDatasetId: err.existingDatasetId,
          existingFileName: err.existingFileName,
          existingImportedAt: err.existingImportedAt,
          message: err.message,
        });
      } else {
        const errorMsg =
          err?.message ||
          "Erreur lors de l'enregistrement dans la base de données backend. Le fichier n'a pas été enregistré.";
        setParseError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Données</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#ff284d]">Importer un fichier</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Import Universel de Données (Power BI Style)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Chargez n'importe quel fichier tabulaire (.xlsx, .xls, .csv). Ingestion par lots,
            contrôle d'intégrité SHA-256, typage dynamique strict et réconciliation en temps réel sur MongoDB.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToImportedFiles('datasets')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-[#ff284d]" />
          <span>Explorer les jeux de données</span>
        </button>
      </div>

      {/* Error Banner */}
      {parseError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-red-950/70 border border-red-700/80 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-900/60 text-red-400 border border-red-700/60 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Erreur lors de l'enregistrement</p>
              <p className="text-xs text-red-200/90 mt-0.5">{parseError}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setParseError(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Duplicate Conflict Resolution Modal / Banner */}
      {duplicateConflict && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-950/50 border border-amber-600/70 text-amber-200 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-900/60 flex items-center justify-center flex-shrink-0 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Doublon détecté (Contrôle d'empreinte SHA-256)
              </h3>
              <p className="text-xs text-amber-200/90 mt-1">
                Ce fichier a déjà été importé le{' '}
                <span className="font-semibold text-white">
                  {duplicateConflict.existingImportedAt
                    ? new Date(duplicateConflict.existingImportedAt).toLocaleString('fr-FR')
                    : 'récemment'}
                </span>
                . Souhaitez-vous écraser et remplacer le jeu de données existant ou annuler ?
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
                <button
                  type="button"
                  onClick={() => handleConfirmImport(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Remplacer le jeu de données existant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateConflict(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Progress Overlay during Batch Import */}
      {isSubmitting && batchProgress && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-2xl bg-slate-900/95 border border-[#ff284d]/40 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#ff284d] animate-spin" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Ingestion par lots en cours
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#ff284d]">
              {batchProgress.percent}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-[#ff284d] to-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${batchProgress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>{batchProgress.statusText}</span>
            <span className="font-mono text-slate-400">
              Lot {batchProgress.currentChunk} / {batchProgress.totalChunks} (
              {batchProgress.insertedRows.toLocaleString('fr-FR')} / {batchProgress.totalRows.toLocaleString('fr-FR')} lignes)
            </span>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {confirmedRecord ? (
          /* SUCCESS VIEW */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 sm:p-8 rounded-2xl bg-[#0b1324] border border-emerald-600/40 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/80 inline-block mb-1">
                  Intégration & Réconciliation Validées
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Toutes les lignes ont été persistées sur MongoDB
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Le fichier <span className="font-semibold text-white">{confirmedRecord.fileName}</span> a été
                  enregistré avec succès ({confirmedRecord.totalRows.toLocaleString('fr-FR')} lignes réelles,{' '}
                  {confirmedRecord.totalColumns} colonnes typées). Les index d'analyse ont été créés.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total lignes</span>
                <p className="text-lg font-bold text-white mt-0.5">
                  {confirmedRecord.totalRows.toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Colonnes indexées</span>
                <p className="text-lg font-bold text-white mt-0.5">{confirmedRecord.totalColumns}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Statut Réconciliation</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">100% Vérifié</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Base active</span>
                <p className="text-lg font-bold text-white mt-0.5 truncate">omoda_jaecoo_stats_db</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => onNavigateToImportedFiles('datasets', confirmedRecord.id)}
                className="px-5 py-2.5 rounded-xl bg-[#ff284d] hover:bg-[#ff4d6d] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <span>Explorer le jeu de données</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToImportedFiles('history', confirmedRecord.id)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Voir l'historique des imports</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Importer un autre fichier</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* WORKFLOW: UPLOAD + PREVIEW + VALIDATION */
          <div className="space-y-6">
            {/* Step 1: Dropzone */}
            <FileDropzone
              onFileSelected={handleFileSelected}
              onReset={handleReset}
              selectedFile={selectedFile}
              isLoading={isParsing}
              progressPercent={progressPercent}
              progressStatus={progressStatus}
              errorMessage={parseError}
            />

            {/* Step 2: If parsed, show Sheet selector + Summary + Table preview + Validation */}
            {parseResult && activeSheetAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Notice: Preview state before backend database save */}
                <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-900/60 flex items-center justify-center flex-shrink-0 text-blue-300">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-white">Mode Aperçu actif : </span>
                    <span>
                      Les colonnes et types ont été détectés dynamiquement. Lors de la confirmation, chaque ligne sera envoyée par lots sécurisés avec calcul d'empreinte SHA-256 et réconciliation exacte des sommes sur MongoDB.
                    </span>
                  </div>
                </div>

                {/* Header bar with Sheet Selector and Total Sheet stats */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d1627] border border-slate-800/90 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Structure détectée dynamiquement</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-800/70">
                        {parseResult.sheetNames.length} feuille(s)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vérifiez les données et le typage automatique avant l’intégration finale.
                    </p>
                  </div>

                  <SheetSelector
                    sheetNames={parseResult.sheetNames}
                    activeSheetName={activeSheetName}
                    sheets={parseResult.sheets}
                    onSelectSheet={(name) => setActiveSheetName(name)}
                  />
                </div>

                {/* Data Information & Diagnostic Summary */}
                <ImportSummary
                  fileName={parseResult.fileName}
                  fileSize={parseResult.fileSize}
                  sheetAnalysis={activeSheetAnalysis}
                />

                {/* Data Preview Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Aperçu des données ({activeSheetAnalysis.previewRows.length} lignes chargées)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Tri & filtrage interactifs
                    </span>
                  </div>

                  <FilePreviewTable
                    columns={activeSheetAnalysis.columns}
                    data={activeSheetAnalysis.previewRows}
                    totalFileRows={activeSheetAnalysis.rowCount}
                  />
                </div>

                {/* Final Validation Action Bar */}
                <ImportValidation
                  sheetAnalysis={activeSheetAnalysis}
                  canConfirm={!isParsing && Boolean(parseResult)}
                  isSubmitting={isSubmitting}
                  databaseName={databaseName}
                  onConfirm={() => handleConfirmImport(false)}
                  onCancel={handleReset}
                />
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
