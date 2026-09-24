import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Database } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DataImportPage } from '../data-import/DataImportPage';
import { ImportedFilesList } from '../data-import/ImportedFilesList';
import { AnalyticsPage } from '../analytics/AnalyticsPage';

export const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('Importer un fichier');
  const [importedFilesTab, setImportedFilesTab] = useState<'history' | 'datasets'>('history');
  const [importedFilesSelectedId, setImportedFilesSelectedId] = useState<string | undefined>(undefined);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setDbConnected(Boolean(data?.database?.connected));
      })
      .catch(() => setDbConnected(false));
  }, []);

  const handleNavigateToImportedFiles = (tab?: 'history' | 'datasets', fileId?: string) => {
    if (tab) {
      setImportedFilesTab(tab);
    }
    if (fileId) {
      setImportedFilesSelectedId(fileId);
    }
    setActiveSidebarItem('Fichiers importés');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <DashboardHeader
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        activeItem={activeSidebarItem}
        onSelectItem={(item) => setActiveSidebarItem(item)}
      />

      {/* Main Layout: Sidebar + Import Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          activeItem={activeSidebarItem}
          onSelectItem={(item) => setActiveSidebarItem(item)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {dbConnected === false && (
            <div className="bg-amber-950/70 border border-amber-500/50 rounded-2xl p-4 flex items-start gap-3.5 text-amber-200 text-xs sm:text-sm shadow-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-100 flex items-center gap-2">
                  <span>Base de données MongoDB non connectée (HTTP 503)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-mono border border-amber-500/30">
                    DATABASE_OFFLINE
                  </span>
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  Aucun cluster MongoDB actif n’est détecté. Pour enregistrer et interroger vos fichiers,
                  renseignez votre chaîne de connexion dans la variable <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-100 font-mono">MONGODB_URI</code> dans le fichier <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-100 font-mono">.env</code>.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeSidebarItem === 'Analyse & Graphiques' ? (
              /* VIEW: Analyse & Graphiques (Power BI Universel) */
              <motion.div
                key="analytics-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <AnalyticsPage
                  onNavigateToImport={() => setActiveSidebarItem('Importer un fichier')}
                />
              </motion.div>
            ) : activeSidebarItem === 'Fichiers importés' ||
            activeSidebarItem === 'Historique des imports' ||
            activeSidebarItem === 'Jeux de données' ? (
              /* VIEW: Fichiers importés & Jeux de données */
              <motion.div
                key="files-list-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ImportedFilesList
                  onNavigateToImport={() => setActiveSidebarItem('Importer un fichier')}
                  initialTab={activeSidebarItem === 'Jeux de données' ? 'datasets' : importedFilesTab}
                  initialFileId={importedFilesSelectedId}
                />
              </motion.div>
            ) : (
              /* VIEW DEFAULT: Importer un fichier */
              <motion.div
                key="import-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <DataImportPage
                  onNavigateToImportedFiles={handleNavigateToImportedFiles}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
