import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DataImportPage } from '../data-import/DataImportPage';
import { ImportedFilesList } from '../data-import/ImportedFilesList';

export const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('Importer un fichier');
  const [importedFilesTab, setImportedFilesTab] = useState<'history' | 'datasets'>('history');
  const [importedFilesSelectedId, setImportedFilesSelectedId] = useState<string | undefined>(undefined);

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
          <AnimatePresence mode="wait">
            {activeSidebarItem === 'Fichiers importés' ||
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
