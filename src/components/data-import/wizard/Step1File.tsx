import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Hash,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { FileConfig } from '../../../types/wizard';

interface Step1FileProps {
  fileConfig: FileConfig;
  onFileSelected: (file: File) => void;
  onCsvConfigChange: (delimiter: string, encoding: string) => void;
  isProcessing: boolean;
  processingMessage?: string;
  errorMessage?: string | null;
  onNext: () => void;
}

export const Step1File: React.FC<Step1FileProps> = ({
  fileConfig,
  onFileSelected,
  onCsvConfigChange,
  isProcessing,
  processingMessage,
  errorMessage,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const name = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      alert('Veuillez sélectionner un fichier au format Excel (.xlsx, .xls) ou CSV (.csv).');
      return;
    }
    onFileSelected(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-[#ff284d]" />
          Sélection du fichier de données
        </h2>
        <p className="text-sm text-slate-400">
          Importez n’importe quel fichier tabulaire. Le système est 100% générique (type Power BI) :
          il s’adapte automatiquement à votre structure sans imposer aucun schéma prédéfini.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-rose-300">Erreur lors de la lecture du fichier</div>
            <div className="text-xs text-rose-200/80 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 group ${
          isDragOver
            ? 'border-[#ff284d] bg-[#ff284d]/5 scale-[1.01]'
            : fileConfig.file
            ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              fileConfig.file
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 group-hover:text-white group-hover:border-slate-600'
            }`}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-3 border-[#ff284d] border-t-transparent rounded-full animate-spin" />
            ) : fileConfig.file ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <UploadCloud className="w-8 h-8 text-slate-300 group-hover:scale-110 transition-transform" />
            )}
          </div>

          <div>
            <div className="text-base font-semibold text-white">
              {fileConfig.file
                ? fileConfig.fileName
                : 'Glissez-déposez votre fichier ici, ou cliquez pour parcourir'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Formats acceptés : <span className="text-slate-300 font-medium">Excel (.xlsx, .xls)</span> et{' '}
              <span className="text-slate-300 font-medium">CSV (.csv)</span>. Aucune limite stricte de taille.
            </div>
          </div>

          {isProcessing && (
            <div className="text-xs text-[#ff284d] font-medium animate-pulse">
              {processingMessage || 'Traitement en cours...'}
            </div>
          )}
        </div>
      </div>

      {/* Selected file info card & CSV controls */}
      {fileConfig.file && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                {fileConfig.fileType === 'csv' ? (
                  <FileText className="w-6 h-6 text-amber-400" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{fileConfig.fileName}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{formatFileSize(fileConfig.fileSizeBytes)}</span>
                  <span>•</span>
                  <span className="uppercase text-[11px] font-semibold text-slate-300">
                    Format {fileConfig.fileType}
                  </span>
                  <span>•</span>
                  <span>
                    {fileConfig.availableSheets.length}{' '}
                    {fileConfig.availableSheets.length > 1 ? 'feuilles' : 'feuille'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Changer de fichier
            </button>
          </div>

          {/* SHA-256 fingerprint */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                Empreinte SHA-256 (garantie d’unicité et d’intégrité)
              </div>
              <div className="text-xs font-mono text-slate-300 truncate mt-0.5 select-all">
                {fileConfig.fileHash || 'Calcul en cours...'}
              </div>
            </div>
          </div>

          {/* CSV Specific Controls: Delimiter and Encoding */}
          {fileConfig.fileType === 'csv' && (
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <SlidersHorizontal className="w-4 h-4" />
                Paramètres de détection CSV
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Delimiter */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Séparateur de colonnes :
                  </label>
                  <select
                    value={fileConfig.csvDelimiter}
                    onChange={(e) => onCsvConfigChange(e.target.value, fileConfig.csvEncoding)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  >
                    <option value=";">Point-virgule ( ; ) [Standard européen]</option>
                    <option value=",">Virgule ( , ) [Standard anglo-saxon]</option>
                    <option value="	">Tabulation ( \t ) [TSV]</option>
                    <option value="|">Pipe ( | )</option>
                  </select>
                </div>

                {/* Encoding */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Encodage du texte :
                  </label>
                  <select
                    value={fileConfig.csvEncoding}
                    onChange={(e) => onCsvConfigChange(fileConfig.csvDelimiter, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff284d]"
                  >
                    <option value="UTF-8">UTF-8 (Recommandé, accents universels)</option>
                    <option value="ISO-8859-1">Windows-1252 / ISO-8859-1 (Excel ANSI classique)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 validation button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
            >
              Étape suivante : Structure des données
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
