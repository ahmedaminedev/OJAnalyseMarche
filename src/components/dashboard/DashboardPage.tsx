import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { StatCard } from './StatCard';
import { SalesEvolutionChart } from './SalesEvolutionChart';
import { ModelDistributionChart } from './ModelDistributionChart';
import { TunisiaRegionalMap } from './TunisiaRegionalMap';
import { TopModelsList } from './TopModelsList';
import { RecentActivityCard } from './RecentActivityCard';
import { DataImportPage } from '../data-import/DataImportPage';
import { ImportedFilesList } from '../data-import/ImportedFilesList';
import { METRICS_DATA, ASSETS } from '../../data/mockData';

interface DashboardPageProps {
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
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
        onLogout={onLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Layout: Sidebar + Dashboard Content */}
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
            {/* VIEW 1: Importer un fichier */}
            {activeSidebarItem === 'Importer un fichier' ? (
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
            ) : activeSidebarItem === 'Fichiers importés' ||
              activeSidebarItem === 'Historique des imports' ||
              activeSidebarItem === 'Jeux de données' ? (
              /* VIEW 2: Fichiers importés (fusionné avec Historique & Jeux de données) */
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
              /* VIEW DEFAULT: Dashboard original */
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Top Greeting Card with Right Vehicle Showcase Banner */}
                <div className="relative rounded-2xl bg-gradient-to-r from-[#0d1627] via-[#0d1627] to-[#121f38] border border-slate-800/90 overflow-hidden shadow-xl">
                  <div className="flex flex-col md:flex-row items-center justify-between p-6 sm:p-7 relative z-10">
                    {/* Left Welcome Text */}
                    <div className="max-w-xl mb-4 md:mb-0">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Bonjour Administrateur,
                      </h1>
                      <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                        Voici un aperçu global de vos données et analyses automobiles.
                      </p>
                    </div>

                    {/* Right Showcase Image Banner cutout */}
                    <div className="relative w-full md:w-80 lg:w-96 h-28 sm:h-32 rounded-xl overflow-hidden shadow-inner flex-shrink-0 border border-slate-700/50 bg-slate-900">
                      <img
                        src={ASSETS.dashboardHero}
                        alt="OMODA & JAECOO vehicles"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0d1627]/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 right-2 text-[9px] font-mono tracking-widest text-slate-300 uppercase drop-shadow">
                        OMODA | JAECOO TN
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 1: 4 KPI Stat Cards */}
                <section
                  aria-label="Indicateurs clés"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {METRICS_DATA.map((metric) => (
                    <StatCard key={metric.id} data={metric} />
                  ))}
                </section>

                {/* Row 2: Sales Evolution (Left) + Model Distribution (Right) */}
                <section
                  aria-label="Graphiques des ventes"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Sales Evolution Line Chart */}
                  <div className="lg:col-span-7">
                    <SalesEvolutionChart />
                  </div>

                  {/* Donut Model Distribution Chart */}
                  <div className="lg:col-span-5">
                    <ModelDistributionChart />
                  </div>
                </section>

                {/* Row 3: Regional Sales (Left) + Top 5 Models (Center) + Recent Activity (Right) */}
                <section
                  aria-label="Analyses régionales et activités"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6"
                >
                  {/* Tunisia Regional Sales */}
                  <TunisiaRegionalMap />

                  {/* Top 5 Best Selling Models */}
                  <TopModelsList />

                  {/* Recent Activity Log */}
                  <RecentActivityCard onNavigate={(item) => setActiveSidebarItem(item)} />
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
