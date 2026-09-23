import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { validateExcelFile, formatFileSize } from '../../utils/security';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onReset: () => void;
  selectedFile: File | null;
  isLoading: boolean;
  progressPercent: number;
  progressStatus: string;
  errorMessage: string | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  onReset,
  selectedFile,
  isLoading,
  progressPercent,
  progressStatus,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setLocalError(null);
    const validation = validateExcelFile(file);
    if (!validation.isValid) {
      setLocalError(validation.error || 'Fichier invalide');
      return;
    }
    onFileSelected(file);
  };

  const handleTriggerSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const activeError = errorMessage || localError;

  return (
    <div className="w-full space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileChange}
        className="hidden"
        id="excel-file-upload-input"
        aria-label="Sélectionner un fichier Excel"
      />

      {/* Main Dropzone Container */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleTriggerSelect}
          className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragOver
              ? 'border-[#ff284d] bg-red-950/20 shadow-lg shadow-red-900/20 scale-[1.005]'
              : 'border-slate-700/70 hover:border-slate-600 bg-[#0d1424]/60 hover:bg-[#0f172a]/80'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
            {/* Animated Icon */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isDragOver
                  ? 'bg-[#ff284d] text-white shadow-lg shadow-red-600/40 scale-110'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              <UploadCloud className="w-8 h-8" />
            </div>

            {/* Instruction titles */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Glissez votre fichier Excel ici
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Le système analysera automatiquement les feuilles et colonnes
              </p>
            </div>

            {/* Visual separator */}
            <div className="flex items-center w-36 gap-2 my-1">
              <div className="flex-1 h-[1px] bg-slate-700/60" />
              <span className="text-[11px] font-medium text-slate-500 uppercase">ou</span>
              <div className="flex-1 h-[1px] bg-slate-700/60" />
            </div>

            {/* Choose button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSelect();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-sm shadow-md shadow-red-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Sélectionner un fichier</span>
            </button>

            {/* Allowed formats reminder */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[11px] font-medium text-slate-400 tracking-wider">
                Formats acceptés :
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                .XLSX
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                .XLS
              </span>
              <span className="text-[11px] text-slate-500">Max 50 Mo</span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="rounded-2xl border border-slate-700/80 bg-[#0d1627] p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white truncate tracking-tight">
                    {selectedFile.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex-shrink-0">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 text-red-400 animate-spin" />
                      <span className="text-red-300">{progressStatus}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Fichier chargé et prêt pour la validation</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Actions: Re-select or Cancel */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isLoading && (
                <>
                  <button
                    type="button"
                    onClick={handleTriggerSelect}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                  >
                    Changer de fichier
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 transition-colors"
                    title="Supprimer / Annuler"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar during parsing */}
          {isLoading && (
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{progressStatus}</span>
                <span className="font-mono text-red-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error alert banner */}
      {activeError && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 flex items-start gap-3 text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold block text-red-300">Erreur d'import :</span>
            {activeError}
          </div>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-red-400 hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
