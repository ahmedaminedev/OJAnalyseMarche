import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Eye,
  Calendar,
  Layers,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  X,
  Server,
  Database,
  Table,
  Download,
  FileJson,
  Hash,
  Type,
  ToggleLeft,
  ChevronRight,
  Info,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ImportedFileRecord, ImportStatus, ColumnInfo, DetectedDataType } from '../../types/import';
import { importService, BackendStats } from '../../services/importService';
import { formatFileSize } from '../../utils/security';
import { FilePreviewTable } from './FilePreviewTable';
import { exportToCsv, exportToJson } from '../../utils/exportDataset';

interface ImportedFilesListProps {
  onNavigateToImport: () => void;
  initialTab?: 'history' | 'datasets';
  initialFileId?: string;
}

const STATUS_BADGES: Record<
  ImportStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SUCCESS: {
    label: 'Validé',
    className: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    icon: CheckCircle2,
  },
  PARTIAL: {
    label: 'Partiel',
    className: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    icon: AlertTriangle,
  },
  PROCESSING: {
    label: 'En cours',
    className: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
    icon: RefreshCw,
  },
  PENDING: {
    label: 'En attente',
    className: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
    icon: Clock,
  },
  ERROR: {
    label: 'Erreur',
    className: 'bg-red-950/60 text-red-300 border-red-800/60',
    icon: AlertTriangle,
  },
};

const TYPE_ICONS: Record<DetectedDataType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  empty: Info,
  mixed: Info,
};

export const ImportedFilesList: React.FC<ImportedFilesListProps> = ({
  onNavigateToImport,
  initialTab = 'history',
  initialFileId,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'datasets'>(initialTab);
  const [files, setFiles] = useState<ImportedFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialFileId || '');
  const [selectedFileForModal, setSelectedFileForModal] = useState<ImportedFileRecord | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ImportedFileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);
  const [showMongoHelpModal, setShowMongoHelpModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testUri, setTestUri] = useState('');
  const [isTestingUri, setIsTestingUri] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!testUri.trim()) return;
    setIsTestingUri(true);
    setTestResult(null);
    try {
      const res = await importService.testMongoConnection(testUri.trim());
      if (res.success) {
        setTestResult({ success: true, message: res.message || 'Connecté avec succès à MongoDB !' });
        await loadFiles();
      } else {
        setTestResult({ success: false, message: res.error || 'Échec de connexion au serveur MongoDB.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Erreur réseau.' });
    } finally {
      setIsTestingUri(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const [records, stats] = await Promise.all([
        importService.getAllImports(),
        importService.getStatsOverview(),
      ]);
      setFiles(records);
      setBackendStats(stats);
      if (records.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(records[0].id);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialFileId) {
      setSelectedDatasetId(initialFileId);
    }
  }, [initialFileId]);

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await importService.deleteImport(fileToDelete.id);
      const remaining = files.filter((f) => f.id !== fileToDelete.id);
      setFiles(remaining);
      if (selectedDatasetId === fileToDelete.id) {
        setSelectedDatasetId(remaining.length > 0 ? remaining[0].id : '');
      }
      setFileToDelete(null);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExploreDataset = (file: ImportedFileRecord) => {
    setSelectedDatasetId(file.id);
    setActiveTab('datasets');
  };

  const filteredFiles = files.filter((f) =>
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDataset = files.find((f) => f.id === selectedDatasetId) || files[0] || null;

  // Compute total consolidated rows across all imported files
  const totalConsolidatedRows = files.reduce((sum, f) => sum + (f.totalRows || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Données</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#ff284d]">Fichiers importés & Jeux de données</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Fichiers importés & Données
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Historique complet des imports et exploration interactive des jeux de données OMODA | JAECOO.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToImport}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Importer un fichier</span>
        </button>
      </div>

      {/* Tabs Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-0">
        <div className="flex items-center gap-2">
          {/* Tab 1: Historique des imports */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#ff284d] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'history' ? 'text-[#ff284d]' : 'text-slate-500'}`} />
            <span>Historique des imports</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'history'
                  ? 'bg-red-950/60 text-[#ff284d] border border-red-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {files.length}
            </span>
          </button>

          {/* Tab 2: Jeux de données & Données consolidées */}
          <button
            type="button"
            onClick={() => setActiveTab('datasets')}
            className={`pb-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'datasets'
                ? 'border-[#ff284d] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className={`w-4 h-4 ${activeTab === 'datasets' ? 'text-[#ff284d]' : 'text-slate-500'}`} />
            <span>Jeux de données & Exploration</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'datasets'
                  ? 'bg-red-950/60 text-[#ff284d] border border-red-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {totalConsolidatedRows.toLocaleString('fr-FR')} lignes
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: HISTORIQUE DES IMPORTS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Backend & Database Status Strip */}
          {backendStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800/90 bg-[#0d1627] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-950/40 text-[#ff284d] border border-red-800/40 flex items-center justify-center flex-shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Backend Node.js
                  </span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>API Express Active</span>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#0d1627] p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                      backendStats.mongoConnected
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Base : <span className="text-emerald-400 font-mono">{backendStats.databaseName || 'omoda_stats'}</span>
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          backendStats.mongoConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      <span>
                        {backendStats.mongoConnected
                          ? `Connecté (${backendStats.cluster || 'MongoDB'})`
                          : 'MongoDB Déconnecté (HTTP 503)'}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                      {backendStats.mongoConnected
                        ? `Hôte: ${backendStats.host}`
                        : 'Aucun fallback simulé • Configurer MONGODB_URI ou tester ci-dessous'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMongoHelpModal(true)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    backendStats.mongoConnected
                      ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 border-amber-500 font-bold shadow'
                  }`}
                  title="Configurer la connexion MongoDB"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{backendStats.mongoConnected ? 'Info Base' : 'Connecter MongoDB'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#0d1627] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-950/40 text-purple-400 border border-purple-800/40 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Données archivées
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono mt-0.5 block">
                    {backendStats.totalRows.toLocaleString('fr-FR')} lignes consolidées
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom de fichier..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d]"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Total : <span className="font-bold text-white">{filteredFiles.length}</span> fichier(s) archivé(s)
            </div>
          </div>

          {/* Files History Table */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] shadow-xl overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <span className="text-sm">Chargement de l'historique des imports...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                  <Database className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Aucun fichier enregistré dans la base de données</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Les données de fichiers Excel importés ne s'affichent ici <strong>qu'après confirmation et enregistrement effectif dans la base de données backend ({backendStats?.databaseName || 'omoda_jaecoo_stats_db'})</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToImport}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Démarrer un import et enregistrer en base</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#070b14]/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Fichier source</th>
                      <th className="px-4 py-3">Taille</th>
                      <th className="px-4 py-3">Feuille / Lignes</th>
                      <th className="px-4 py-3">Date d'import</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Données & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredFiles.map((file) => {
                      const statusConfig = STATUS_BADGES[file.status] || STATUS_BADGES.SUCCESS;
                      const StatusIcon = statusConfig.icon;
                      const formattedDate = new Date(file.importedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr
                          key={file.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Name & ID */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-white group-hover:text-red-400 transition-colors">
                                  {file.fileName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  ID: {file.id.substring(0, 12)}...
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Size */}
                          <td className="px-4 py-3 font-mono text-slate-300">
                            {formatFileSize(file.fileSizeBytes)}
                          </td>

                          {/* Rows & Columns */}
                          <td className="px-4 py-3">
                            <div className="font-mono text-slate-200 font-bold">
                              {file.totalRows.toLocaleString('fr-FR')} lignes
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-[#ff284d]" />
                              <span>
                                {file.activeSheetName} ({file.totalColumns} col.)
                              </span>
                            </div>
                          </td>

                          {/* Date & User */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formattedDate}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[140px]">{file.importedBy}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 uppercase tracking-wider ${statusConfig.className}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusConfig.label}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct Jump to Datasets Explorer */}
                              <button
                                type="button"
                                onClick={() => handleExploreDataset(file)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/50 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                title="Explorer le jeu de données"
                              >
                                <Database className="w-3.5 h-3.5 text-[#ff284d]" />
                                <span>Explorer</span>
                              </button>

                              {/* Quick preview modal */}
                              <button
                                type="button"
                                onClick={() => setSelectedFileForModal(file)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Aperçu rapide"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setFileToDelete(file)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                title="Supprimer de l'historique"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: JEUX DE DONNÉES & EXPLORATION */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          {files.length === 0 ? (
            /* Empty State for Datasets */
            <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-red-950/40 text-[#ff284d] border border-red-800/50 mx-auto flex items-center justify-center">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Aucun jeu de données enregistré dans la base</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Les données de vos fichiers Excel n'apparaissent ici <strong>qu'après confirmation et enregistrement effectif dans la base de données backend ({backendStats?.databaseName || 'omoda_jaecoo_stats_db'})</strong>. Vous pouvez prévisualiser un classeur avant de l'enregistrer.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToImport}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/30 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Importer et enregistrer un fichier en base</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dataset Selection Carousel / Pills */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#ff284d]" />
                    <span>Sélectionner le jeu de données à explorer</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    <strong className="text-white font-mono">{files.length}</strong> jeu(x) de données actif(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {files.map((file) => {
                    const isSelected = activeDataset?.id === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedDatasetId(file.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-red-950/70 to-rose-950/70 border-red-600 text-white shadow-md shadow-red-900/20'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <FileSpreadsheet
                          className={`w-4 h-4 ${isSelected ? 'text-[#ff284d]' : 'text-slate-500'}`}
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold truncate max-w-[200px]">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {file.totalRows.toLocaleString('fr-FR')} lignes • {file.totalColumns} col.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Dataset Overview & Export Header */}
              {activeDataset && (
                <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] p-5 shadow-xl space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          Jeu de données prêt
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Feuille : {activeDataset.activeSheetName}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tight mt-1">
                        {activeDataset.fileName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Importé le{' '}
                        {new Date(activeDataset.importedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        par {activeDataset.importedBy} • Stocké dans la base{' '}
                        <strong className="text-emerald-400 font-mono">
                          {backendStats?.databaseName || 'omoda_jaecoo_stats_db'}
                        </strong>
                      </p>
                    </div>

                    {/* Dataset Actions: Export CSV & JSON + Schema Drawer Toggle */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          showSchemaDrawer
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>{showSchemaDrawer ? 'Masquer le schéma' : 'Schéma des colonnes'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          exportToCsv(
                            activeDataset.fileName,
                            activeDataset.previewData.columns,
                            activeDataset.previewData.rows
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Exporter le jeu de données en CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Exporter CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          exportToJson(
                            activeDataset.fileName,
                            activeDataset.previewData.rows
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Exporter le jeu de données en JSON"
                      >
                        <FileJson className="w-3.5 h-3.5 text-amber-400" />
                        <span>Exporter JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Summary Cards of Active Dataset */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-[#070b14]/70 p-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Lignes totales
                      </span>
                      <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                        {activeDataset.totalRows.toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#070b14]/70 p-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Colonnes actives
                      </span>
                      <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                        {activeDataset.totalColumns}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#070b14]/70 p-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Complétude des données
                      </span>
                      <span className="text-xl font-bold font-mono text-purple-400 mt-0.5 block">
                        {activeDataset.totalRows > 0 && activeDataset.totalColumns > 0
                          ? `${Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  (1 -
                                    (activeDataset.totalEmptyCells || 0) /
                                      (activeDataset.totalRows * activeDataset.totalColumns)) *
                                    100
                                )
                              )
                            )}%`
                          : '100%'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#070b14]/70 p-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Taille du document
                      </span>
                      <span className="text-xl font-bold font-mono text-slate-200 mt-0.5 block">
                        {formatFileSize(activeDataset.fileSizeBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Column Schema Drawer */}
                  {showSchemaDrawer && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Dictionnaire & Schéma des colonnes ({activeDataset.previewData.columns.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Détection automatique des types
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {activeDataset.previewData.columns.map((col: ColumnInfo) => {
                          const Icon = TYPE_ICONS[col.detectedType] || Info;
                          return (
                            <div
                              key={col.key}
                              className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs flex flex-col justify-between"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-semibold text-slate-200 truncate" title={col.name}>
                                  {col.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                                  <Icon className="w-2.5 h-2.5 text-[#ff284d]" />
                                  <span>{col.detectedType}</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-2 flex items-center justify-between">
                                <span>Rempli : {col.totalCount}</span>
                                {col.emptyCount > 0 && (
                                  <span className="text-amber-400">({col.emptyCount} vides)</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main Interactive Table View with Pro Pagination */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Table className="w-4 h-4 text-emerald-400" />
                        <span>Explorateur des données paginé (Tableau de bord de données)</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {activeDataset.totalRows.toLocaleString('fr-FR')} lignes totales dans la base
                      </span>
                    </div>

                    <FilePreviewTable
                      columns={activeDataset.previewData.columns}
                      data={activeDataset.previewData.rows}
                      totalFileRows={activeDataset.totalRows}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick Modal: Full Preview of Selected File from History */}
      {selectedFileForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#070b14] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0d1627] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {selectedFileForModal.fileName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>Feuille : {selectedFileForModal.activeSheetName}</span>
                    <span>•</span>
                    <span>{selectedFileForModal.totalRows.toLocaleString('fr-FR')} lignes</span>
                    <span>•</span>
                    <span>{selectedFileForModal.totalColumns} colonnes</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedFileForModal.fileSizeBytes)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFileForModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Table Preview */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <FilePreviewTable
                columns={selectedFileForModal.previewData.columns}
                data={selectedFileForModal.previewData.rows}
                totalFileRows={selectedFileForModal.totalRows}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0d1627] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const file = selectedFileForModal;
                  setSelectedFileForModal(null);
                  handleExploreDataset(file);
                }}
                className="px-4 py-2 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 hover:text-white text-xs font-semibold flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-[#ff284d]" />
                <span>Ouvrir dans l'explorateur de jeux de données</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1627] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer l'import</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              Êtes-vous sûr de vouloir supprimer l'import{' '}
              <strong className="text-white font-semibold">{fileToDelete.fileName}</strong> ?
              Cette action retirera les données archivées associées de la base{' '}
              <strong className="text-emerald-400 font-mono">
                {backendStats?.databaseName || 'omoda_jaecoo_stats_db'}
              </strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <span>Confirmer la suppression</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Help Modal: Guide de connexion MongoDB Compass */}
      {showMongoHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#070b14] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#0d1627] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/60">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Connexion MongoDB & MongoDB Compass
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comprendre pourquoi la base n'apparaît pas encore dans votre Compass local
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMongoHelpModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-300">
              {/* Diagnostic Box */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Diagnostic de votre situation</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Votre application s'exécute actuellement sur les serveurs distants de Google AI Studio (Cloud Run).
                  Dans les logs, l'adresse <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">127.0.0.1:27017</code> fait référence au conteneur Cloud et <strong>non pas à votre ordinateur personnel</strong> où tourne votre MongoDB Compass (affichant vos bases <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200 font-mono">Gestion_Parc_IT_final</code>, etc.).
                </p>
                <p className="text-xs text-slate-400">
                  Pour préserver votre travail, l'application a automatiquement sauvegardé vos imports dans son <strong>cache mémoire résilient</strong>.
                </p>
              </div>

              {/* Interactive URI Tester */}
              <div className="p-4 rounded-xl bg-[#091120] border border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Tester & Connecter une URI MongoDB en direct</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Sans redémarrage</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testUri}
                    onChange={(e) => setTestUri(e.target.value)}
                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/omoda_jaecoo_stats_db"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingUri || !testUri.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 transition-colors"
                  >
                    {isTestingUri ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Test en cours...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tester & Connecter</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950/60 border border-red-800 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* 3 Solutions */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-200">
                  Comment connecter et visualiser vos données dans MongoDB Compass :
                </h4>

                {/* Solution 1: MongoDB Atlas (Recommended) */}
                <div className="p-4 rounded-xl bg-[#0d1627] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-[10px] text-emerald-300 font-bold">1</span>
                      <span>Option Recommandée : MongoDB Atlas (Cloud Gratuit)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-medium">
                      Sans installation
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Créez une base de données gratuite sur <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">MongoDB Atlas <ExternalLink className="w-3 h-3" /></a>, puis connectez à la fois l'application et votre Compass :
                  </p>

                  <ol className="list-decimal list-inside text-xs space-y-1.5 text-slate-400 pl-1">
                    <li>Créez un cluster gratuit <strong>M0</strong> sur MongoDB Atlas.</li>
                    <li>Cliquez sur <strong>Connect</strong> &gt; <strong>Drivers (Node.js)</strong> et copiez votre URI de connexion :</li>
                  </ol>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-slate-300 truncate">
                      mongodb+srv://utilisateur:motdepasse@cluster0.xxx.mongodb.net/omoda_jaecoo_stats_db
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/omoda_jaecoo_stats_db?retryWrites=true&w=majority', 'atlas')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedText === 'atlas' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'atlas' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Définissez la variable d'environnement <strong className="text-white font-mono">MONGODB_URI</strong> dans le fichier <code className="text-emerald-400 font-mono">.env</code> ou dans les <strong>Settings (Paramètres)</strong> de l'application. Connectez ensuite votre Compass à cette même URL pour voir la base <strong className="text-emerald-400 font-mono">omoda_jaecoo_stats_db</strong> et ses collections !
                  </p>
                </div>

                {/* Solution 2: Exécuter en local */}
                <div className="p-4 rounded-xl bg-[#0d1627] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-sky-950/80 border border-sky-700/60 flex items-center justify-center text-[10px] text-sky-300 font-bold">2</span>
                      <span>Option Locale : Lancer le projet sur votre propre PC</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/60 text-sky-300 border border-sky-800/60 font-medium">
                      Direct Compass local
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Si vous téléchargez le code source de l'application sur votre PC (via le menu Paramètres &gt; Exporter en ZIP ou GitHub) :
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-slate-300">
                      npm install && npm run dev
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm install && npm run dev', 'local')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedText === 'local' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'local' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sur votre machine, le serveur contactera directement votre <strong className="text-white font-mono">localhost:27017</strong> et vous verrez immédiatement apparaître la base <strong className="text-emerald-400 font-mono">omoda_jaecoo_stats_db</strong> dans votre Compass !
                  </p>
                </div>

                {/* Solution 3: Tunnel ngrok */}
                <div className="p-4 rounded-xl bg-[#0d1627] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-[10px] text-purple-300 font-bold">3</span>
                      <span>Option Tunnel : Exposer votre MongoDB local via ngrok</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Exécutez <code className="bg-slate-900 px-1 py-0.5 rounded text-purple-300 font-mono">ngrok tcp 27017</code> sur votre machine, puis renseignez l'adresse TCP générée dans la variable <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-mono">MONGODB_URI</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0d1627] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowMongoHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
