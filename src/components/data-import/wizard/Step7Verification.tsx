import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  Table,
  FileCheck2,
  Database,
  Search,
  Filter,
} from 'lucide-react';
import {
  QualitySummary,
  ColumnStatSummary,
  FileConfig,
  StructureConfig,
} from '../../../types/wizard';

interface Step7VerificationProps {
  fileConfig: FileConfig;
  structureConfig: StructureConfig;
  verificationData: {
    previewRows: Record<string, any>[];
    totalRowCount: number;
    columnStats: ColumnStatSummary[];
    qualityReport: QualitySummary;
  };
  onNext: () => void;
  onPrev: () => void;
}

export const Step7Verification: React.FC<Step7VerificationProps> = ({
  fileConfig,
  structureConfig,
  verificationData,
  onNext,
  onPrev,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'columns' | 'issues'>('preview');
  const [searchTerm, setSearchTerm] = useState('');

  const { previewRows, totalRowCount, columnStats, qualityReport } = verificationData;

  const filteredPreview = previewRows.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-[#ff284d]" />
          Vérification de l’intégrité & Rapport qualité
        </h2>
        <p className="text-sm text-slate-400">
          Contrôlez les données transformées avant leur injection dans MongoDB Atlas.
          Toutes les conversions, dépivotages et règles de nettoyage sont ici répercutés fidèlement.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Rows */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Lignes à insérer
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {totalRowCount.toLocaleString('fr-FR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">100% stockées dans la base</div>
        </div>

        {/* Quality Errors */}
        <div className={`border rounded-2xl p-4 ${
          qualityReport.errors > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Erreurs bloquantes
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1">
            {qualityReport.errors}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {qualityReport.errors === 0 ? 'Aucune erreur bloquante' : 'À corriger avant envoi'}
          </div>
        </div>

        {/* Quality Warnings */}
        <div className={`border rounded-2xl p-4 ${
          qualityReport.warnings > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Avertissements
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {qualityReport.warnings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cellules vides ou #N/A</div>
        </div>

        {/* Colonnes prêtes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Colonnes finalisées
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">
            {columnStats.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dimensions & Mesures prêtes</div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'border-[#ff284d] text-white'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Aperçu des 50 premières lignes transformées
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('columns')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'columns'
              ? 'border-[#ff284d] text-white'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Statistiques par colonne ({columnStats.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'issues'
              ? 'border-[#ff284d] text-white'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Rapport d’anomalies ({qualityReport.issues.length})
        </button>
      </div>

      {/* TAB 1: 50 Rows Preview */}
      {activeTab === 'preview' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Affichage des 50 premières lignes après application de l'ensemble des règles.
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer dans l'aperçu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff284d]"
              />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0 z-10">
                    <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800 font-mono">
                      #
                    </th>
                    {columnStats.map((col) => (
                      <th
                        key={col.key}
                        className="py-2.5 px-3 whitespace-nowrap min-w-[130px] border-r border-slate-800/60"
                      >
                        <div className="font-semibold text-slate-200">{col.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {col.type} • {col.role}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPreview.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 px-3 text-center border-r border-slate-800/60 text-slate-500">
                        {rIdx + 1}
                      </td>
                      {columnStats.map((col) => {
                        const val = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className="py-2 px-3 border-r border-slate-800/40 max-w-[220px] truncate"
                          >
                            {val !== null && val !== undefined ? (
                              typeof val === 'number' ? (
                                <span className="text-emerald-400">{val.toLocaleString('fr-FR')}</span>
                              ) : (
                                <span className="text-slate-300">{String(val)}</span>
                              )
                            ) : (
                              <span className="text-slate-600 italic font-sans text-[11px]">null</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Column Statistics */}
      {activeTab === 'columns' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                  <th className="py-3 px-4">Colonne</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Cellules Vides (Null)</th>
                  <th className="py-3 px-4">Valeurs Distinctes</th>
                  <th className="py-3 px-4">Contrôle (Somme / Min - Max)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {columnStats.map((col) => (
                  <tr key={col.key} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {col.label}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                        {col.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                        {col.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300">{col.nullCount}</span>
                        <span className="text-[11px] text-slate-500">
                          ({col.nullPercentage}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {col.distinctCount}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {col.sum !== undefined ? (
                        <span className="text-emerald-400 font-bold">
                          Somme : {col.sum.toLocaleString('fr-FR')}
                        </span>
                      ) : col.min !== null && col.min !== undefined ? (
                        <span className="text-amber-400">
                          {String(col.min)} → {String(col.max)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Quality Issues List */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          {qualityReport.issues.length === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Parfait ! Aucun avertissement ni anomalie de données détectée.
            </div>
          ) : (
            <div className="space-y-2">
              {qualityReport.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    issue.severity === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : issue.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      issue.severity === 'error'
                        ? 'text-rose-400'
                        : issue.severity === 'warning'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{issue.title}</span>
                      <span className="uppercase text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                        {issue.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">{issue.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au mapping
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff284d] to-red-600 hover:from-[#ff284d]/90 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-[#ff284d]/20 transition-all hover:scale-[1.02]"
        >
          Étape suivante : Téléversement vers MongoDB Atlas
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
