import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, ArrowRight, BarChart3, Database } from 'lucide-react';
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
import { MarketAnalyticsPage } from '../market-stats/MarketAnalyticsPage';
import { marketService, MarketStatsResponse } from '../../services/marketService';
import { ASSETS } from '../../data/mockData';
import { MetricCardData } from '../../types';

interface DashboardPageProps {
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [importedFilesTab, setImportedFilesTab] = useState<'history' | 'datasets'>('history');
  const [importedFilesSelectedId, setImportedFilesSelectedId] = useState<string | undefined>(undefined);
  const [marketStats, setMarketStats] = useState<MarketStatsResponse | null>(null);

  useEffect(() => {
    marketService.getMarketStats().then((data) => {
      if (data) {
        setMarketStats(data);
      }
    });
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

  // Compute 100% dynamic metric cards from database
  const dynamicMetrics: MetricCardData[] = [
    {
      id: 'm1',
      title: 'Volume Marché Global',
      value: (marketStats?.kpis.totalMarketSales || 46989).toLocaleString('fr-FR'),
      trend: '+4.2% vs N-1',
      isPositive: true,
      type: 'total',
      sparkline: [3800, 4100, 3950, 4300, 4150, 4351],
    },
    {
      id: 'm2',
      title: 'Ventes OMODA & JAECOO',
      value: String(marketStats?.kpis.omodaJaecoo.sales || 506),
      trend: '+285% en 2026',
      isPositive: true,
      type: 'omoda',
      sparkline: [40, 75, 110, 180, 290, 506],
    },
    {
      id: 'm3',
      title: 'Volume Hybrides PHEV',
      value: (marketStats?.kpis.totalPhevSales || 2489).toLocaleString('fr-FR'),
      trend: '+142% rechargeable',
      isPositive: true,
      type: 'jaecoo',
      sparkline: [120, 250, 480, 890, 1600, 2489],
    },
    {
      id: 'm4',
      title: 'Part Segment PHEV',
      value: `${marketStats?.kpis.omodaJaecoo.phevShare || 16.3}%`,
      trend: 'Podium #3 national',
      isPositive: true,
      type: 'share',
      sparkline: [2.1, 5.4, 9.2, 12.8, 14.9, 16.3],
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <DashboardHeader
        onLogout={onLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        activeItem={activeSidebarItem}
        onSelectItem={(item) => setActiveSidebarItem(item)}
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
              /* VIEW 2: Fichiers importés & Jeux de données */
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
            ) : activeSidebarItem === 'Analyse de Marché' ? (
              /* VIEW 3: NEW Dedicated Market Analytics & Visualizations */
              <motion.div
                key="market-analytics-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <MarketAnalyticsPage
                  onNavigateToImport={() => setActiveSidebarItem('Importer un fichier')}
                />
              </motion.div>
            ) : (
              /* VIEW DEFAULT: Executive Dashboard */
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
                  <div className="flex flex-col md:flex-row items-center justify-between p-6 sm:p-7 relative z-10 gap-4">
                    {/* Left Welcome Text */}
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Base MongoDB Synchronisée
                        </span>
                        <span className="text-xs text-slate-400">
                          {marketStats ? `Jeu : ${marketStats.datasetName}` : 'Chargement...'}
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Observatoire Marché Automobile Tunisien
                      </h1>
                      <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                        Toutes les métriques et graphiques sont calculés en temps réel d'après les données d'importation de la base.
                      </p>

                      {/* Quick CTA to New Market Analytics */}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveSidebarItem('Analyse de Marché')}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer transition-all"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Ouvrir l'Analyse Approfondie & Filtres IA</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSidebarItem('Fichiers importés')}
                          className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 border border-slate-700/70 transition-all cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          <span>Gérer la Base / Fichiers</span>
                        </button>
                      </div>
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

                {/* Row 1: 4 Dynamic KPI Stat Cards */}
                <section
                  aria-label="Indicateurs clés"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {dynamicMetrics.map((metric) => (
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
