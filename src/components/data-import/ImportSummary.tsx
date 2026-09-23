import React from 'react';
import {
  FileText,
  Table,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Type,
  ToggleLeft,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { SheetAnalysis, DetectedDataType } from '../../types/import';
import { formatFileSize } from '../../utils/security';

interface ImportSummaryProps {
  fileName: string;
  fileSize: number;
  sheetAnalysis: SheetAnalysis;
}

const TYPE_ICONS: Record<DetectedDataType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  empty: HelpCircle,
  mixed: HelpCircle,
};

const TYPE_LABELS: Record<DetectedDataType, string> = {
  text: 'texte',
  number: 'nombre',
  date: 'date',
  boolean: 'booléen',
  empty: 'vide',
  mixed: 'mixte',
};

const TYPE_BADGE_COLORS: Record<DetectedDataType, string> = {
  text: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  number: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  date: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  boolean: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  empty: 'bg-slate-800 text-slate-400 border-slate-700',
  mixed: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
};

export const ImportSummary: React.FC<ImportSummaryProps> = ({
  fileName,
  fileSize,
  sheetAnalysis,
}) => {
  const {
    sheetName,
    rowCount,
    columnCount,
    columns,
    totalEmptyCells,
    issues,
  } = sheetAnalysis;

  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const infoIssues = issues.filter((i) => i.severity === 'info');

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Fichier */}
        <div className="p-3.5 rounded-xl bg-[#0d1627] border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Fichier</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white truncate" title={fileName}>
              {fileName}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {formatFileSize(fileSize)}
            </div>
          </div>
        </div>

        {/* Feuille */}
        <div className="p-3.5 rounded-xl bg-[#0d1627] border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Feuille active</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white truncate" title={sheetName}>
              {sheetName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Feuille de calcul</div>
          </div>
        </div>

        {/* Lignes */}
        <div className="p-3.5 rounded-xl bg-[#0d1627] border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lignes analysées</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {rowCount.toLocaleString('fr-FR')}
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-0.5">Données prêtes</div>
          </div>
        </div>

        {/* Colonnes */}
        <div className="p-3.5 rounded-xl bg-[#0d1627] border border-slate-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Hash className="w-3.5 h-3.5 text-blue-400" />
            <span>Colonnes</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {columnCount}
            </div>
            <div className="text-[11px] text-blue-400/90 mt-0.5">
              {columns.filter((c) => !c.isUnnamed).length} nommées
            </div>
          </div>
        </div>

        {/* Cellules vides */}
        <div className="p-3.5 rounded-xl bg-[#0d1627] border border-slate-800/90 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                totalEmptyCells > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            />
            <span>Cellules vides</span>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-extrabold font-mono ${
                totalEmptyCells > 0 ? 'text-amber-300' : 'text-slate-300'
              }`}
            >
              {totalEmptyCells.toLocaleString('fr-FR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalEmptyCells > 0 ? 'À surveiller' : 'Aucune cellule vide'}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Detail: Detected Column Types (Left) + Health / Validation Signals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Types Détectés */}
        <div className="lg:col-span-7 rounded-xl bg-[#0d1627] border border-slate-800/90 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Types de colonnes détectés ({columns.length})
            </h4>
            <span className="text-[11px] text-slate-400">Détection automatique</span>
          </div>

          <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {columns.map((col) => {
              const Icon = TYPE_ICONS[col.detectedType] || HelpCircle;
              const badgeStyle = TYPE_BADGE_COLORS[col.detectedType];
              const typeLabel = TYPE_LABELS[col.detectedType];

              return (
                <div
                  key={col.key}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-[11px] text-slate-500 w-6">
                      #{col.index + 1}
                    </span>
                    <span
                      className={`font-semibold truncate ${
                        col.isUnnamed ? 'italic text-amber-300' : 'text-slate-200'
                      }`}
                      title={col.name}
                    >
                      {col.name}
                    </span>
                    {col.emptyCount > 0 && (
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        ({col.emptyCount} vides)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-slate-500 text-[11px]">→</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 uppercase tracking-wider ${badgeStyle}`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{typeLabel}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Validation / Diagnostic Summary */}
        <div className="lg:col-span-5 rounded-xl bg-[#0d1627] border border-slate-800/90 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Diagnostic préliminaire
              </h4>
              <span className="text-[11px] text-slate-400">Avant intégration</span>
            </div>

            <div className="space-y-2">
              {/* Positive checks */}
              <div className="flex items-start gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Fichier Excel lisible et intègre</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  Structure tabulaire détectée ({columnCount} colonnes identifiées)
                </span>
              </div>

              {/* Warning or error items */}
              {errorIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-xs text-red-300 bg-red-950/30 p-2 rounded-lg border border-red-900/40"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{issue.title}</span>
                    <span className="text-red-300/80 text-[11px]">{issue.description}</span>
                  </div>
                </div>
              ))}

              {warningIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/20 p-2 rounded-lg border border-amber-900/30"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{issue.title}</span>
                    <span className="text-amber-200/80 text-[11px]">{issue.description}</span>
                  </div>
                </div>
              ))}

              {infoIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block text-slate-200">{issue.title}</span>
                    <span className="text-slate-400 text-[11px]">{issue.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Contrôle préventif</span>
            <span className="text-emerald-400 font-medium">Prêt pour validation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
