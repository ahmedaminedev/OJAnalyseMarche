import React, { useState } from 'react';
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
} from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { SheetSelector } from './SheetSelector';
import { ImportSummary } from './ImportSummary';
import { FilePreviewTable } from './FilePreviewTable';
import { ImportValidation } from './ImportValidation';
import { ExcelParseResult, ImportedFileRecord, ImportStatus } from '../../types/import';
import { parseExcelFile } from '../../utils/excelParser';
import { importService } from '../../services/importService';

interface DataImportPageProps {
  onNavigateToImportedFiles: (tab?: 'history' | 'datasets', fileId?: string) => void;
  currentUserEmail?: string;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({
  onNavigateToImportedFiles,
  currentUserEmail = 'ahmedaminenafti76@gmail.com',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<ImportedFileRecord | null>(null);

  // Handle file selection and initiate parsing
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParseResult(null);
    setConfirmedRecord(null);
    setIsParsing(true);
    setProgressPercent(10);
    setProgressStatus('Préparation du fichier...');

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
      console.error('Erreur lors de la lecture du fichier Excel:', err);
      setParseError(
        err instanceof Error
          ? err.message
          : 'Impossible de lire le fichier Excel. Vérifiez qu’il n’est pas corrompu.'
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
    setIsParsing(false);
    setProgressPercent(0);
    setProgressStatus('');
  };

  const activeSheetAnalysis = parseResult && activeSheetName ? parseResult.sheets[activeSheetName] : null;

  // Handle final import confirmation
  const handleConfirmImport = async () => {
    if (!parseResult || !activeSheetAnalysis || !selectedFile) return;

    setIsSubmitting(true);
    try {
      const issuesSummary = {
        errors: activeSheetAnalysis.issues.filter((i) => i.severity === 'error').length,
        warnings: activeSheetAnalysis.issues.filter((i) => i.severity === 'warning').length,
        info: activeSheetAnalysis.issues.filter((i) => i.severity === 'info').length,
      };

      const status: ImportStatus =
        issuesSummary.errors > 0 ? 'PARTIAL' : 'SUCCESS';

      const sheetSummaries = parseResult.sheetNames.map((name) => ({
        name,
        rows: parseResult.sheets[name]?.rowCount || 0,
        columns: parseResult.sheets[name]?.columnCount || 0,
      }));

      const newRecord = await importService.createImport({
        fileName: parseResult.fileName,
        fileSize: parseResult.fileSize,
        fileSizeBytes: selectedFile.size,
        importedBy: currentUserEmail,
        status,
        availableSheets: parseResult.sheetNames,
        activeSheetName,
        totalRows: activeSheetAnalysis.rowCount,
        totalColumns: activeSheetAnalysis.columnCount,
        totalEmptyCells: activeSheetAnalysis.totalEmptyCells,
        issuesCount: issuesSummary,
        sheetSummaries,
        previewData: {
          columns: activeSheetAnalysis.columns,
          rows: activeSheetAnalysis.previewRows,
        },
        issues: activeSheetAnalysis.issues,
      });

      setConfirmedRecord(newRecord);
      setParseError(null);
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement dans la base de données backend:", err);
      setParseError(
        err?.message ||
          "Erreur lors de l'enregistrement dans la base de données backend. Le fichier n'a pas été enregistré."
      );
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
            Import de données Excel
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Chargez vos fichiers Excel OMODA | JAECOO (.xlsx, .xls). Le système détecte
            automatiquement la structure, les feuilles et contrôle les données avant intégration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToImportedFiles('history')}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Voir les fichiers importés</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SUCCESS CONFIRMATION STATE */}
        {confirmedRecord ? (
          <motion.div
            key="success-banner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#0a1b1a] to-[#071317] p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistré avec succès dans la base de données</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {confirmedRecord.fileName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Le fichier a été validé et enregistré dans le backend sur la base <span className="font-mono text-emerald-400 font-semibold">omoda_jaecoo_stats_db</span>. Les données sont désormais accessibles dans vos jeux de données et l'historique.
                </p>
              </div>
            </div>

            {/* Metric badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 block">Lignes analysées</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {confirmedRecord.totalRows.toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 block">Colonnes détectées</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {confirmedRecord.totalColumns}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400 block">Signaux informatifs</span>
                <span className="text-2xl font-black text-amber-300 font-mono mt-1 block">
                  {confirmedRecord.issuesCount.warnings + confirmedRecord.issuesCount.errors}
                </span>
              </div>
            </div>

            {/* Actions: Explorer le jeu de données, Voir l'historique ou Importer un autre */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onNavigateToImportedFiles('datasets', confirmedRecord.id)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>Explorer le jeu de données</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToImportedFiles('history')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
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
                      Les données ci-dessous sont extraites pour votre contrôle préalable. Conformément à vos règles de sécurité, elles ne seront enregistrées et affichées dans vos fichiers importés et jeux de données <strong>qu'après confirmation et enregistrement réussi dans la base de données backend (omoda_jaecoo_stats_db)</strong>.
                    </span>
                  </div>
                </div>

                {/* Header bar with Sheet Selector and Total Sheet stats */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d1627] border border-slate-800/90 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Aperçu de la structure du fichier</span>
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
                  onConfirm={handleConfirmImport}
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
