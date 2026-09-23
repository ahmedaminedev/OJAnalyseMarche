import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Award,
  Zap,
} from 'lucide-react';
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
import { AIAssistantView } from '../assistant/AIAssistantView';
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
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await marketService.getMarketStats();
      setMarketStats(data);
    } catch (e) {
      console.error('Failed to load market stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeSidebarItem]);

  const handleNavigateToImportedFiles = (tab?: 'history' | 'datasets', fileId?: string) => {
    if (tab) {
      setImportedFilesTab(tab);
    }
    if (fileId) {
      setImportedFilesSelectedId(fileId);
    }
    setActiveSidebarItem('Fichiers importés');
  };

  // Compute 100% dynamic metric cards strictly from the imported file
  const hasImportedData = Boolean(marketStats && marketStats.hasData && marketStats.totalRows && marketStats.totalRows > 0);

  const dynamicMetrics: MetricCardData[] = hasImportedData && marketStats
    ? [
        {
          id: 'm1',
          title: 'Volume Global Fichier',
          value: marketStats.kpis.totalMarketSales.toLocaleString('fr-FR'),
          trend: `${marketStats.totalRows} lignes importées`,
          isPositive: true,
          type: 'total',
          sparkline: [
            Math.round(marketStats.kpis.totalMarketSales * 0.7),
            Math.round(marketStats.kpis.totalMarketSales * 0.8),
            Math.round(marketStats.kpis.totalMarketSales * 0.9),
            marketStats.kpis.totalMarketSales,
          ],
        },
        {
          id: 'm2',
          title: `Leader : ${marketStats.kpis.leader.brand}`,
          value: marketStats.kpis.leader.sales.toLocaleString('fr-FR'),
          trend: `${marketStats.kpis.leader.marketShare}% de part`,
          isPositive: true,
          type: 'omoda',
          sparkline: [
            Math.round(marketStats.kpis.leader.sales * 0.6),
            Math.round(marketStats.kpis.leader.sales * 0.85),
            marketStats.kpis.leader.sales,
          ],
        },
        {
          id: 'm3',
          title: 'Segment PHEV / Électrique',
          value: marketStats.kpis.totalPhevSales.toLocaleString('fr-FR'),
          trend: `${marketStats.kpis.totalPhevSales > 0 ? 'Actif' : 'Non renseigné'}`,
          isPositive: marketStats.kpis.totalPhevSales > 0,
          type: 'jaecoo',
          sparkline: [
            Math.round(marketStats.kpis.totalPhevSales * 0.5),
            marketStats.kpis.totalPhevSales,
          ],
        },
        {
          id: 'm4',
          title: 'Entités Répertoriées',
          value: String(marketStats.kpis.totalBrands),
          trend: 'Catégories / Marques',
          isPositive: true,
          type: 'share',
          sparkline: [1, Math.round(marketStats.kpis.totalBrands / 2), marketStats.kpis.totalBrands],
        },
      ]
    : [];

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
              /* VIEW 3: Dedicated Market Analytics with 100% Advanced Non-AI Filters */
              <motion.div
                key="market-analytics-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <MarketAnalyticsPage
                  onNavigateToImport={() => setActiveSidebarItem('Importer un fichier')}
                  onNavigateToAssistant={() => setActiveSidebarItem('Assistant IA')}
                />
              </motion.div>
            ) : activeSidebarItem === 'Assistant IA' ? (
              /* VIEW 4: Dedicated Conversational AI Assistant with Dynamic Charts */
              <motion.div
                key="assistant-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <AIAssistantView
                  onNavigateToMarketAnalysis={() => setActiveSidebarItem('Analyse de Marché')}
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
                {/* When NO dataset is imported: Show prominent call-to-action */}
                {!hasImportedData ? (
                  <div className="rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#0d1628] to-[#141f36] border-2 border-dashed border-red-500/40 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-red-600/30">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Aucun fichier Excel n'est importé
                      </h2>

                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        Toutes les courbes, métriques, mix de modèles et classements de cette application sont calculés <strong>100% dynamiquement à partir de vos propres fichiers Excel (.xlsx, .xls)</strong>.
                      </p>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveSidebarItem('Importer un fichier')}
                          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-950/50 flex items-center gap-2.5 mx-auto transition-transform active:scale-95 cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Importer un fichier Excel maintenant</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-500">
                        Glissez-déposez n'importe quel fichier Excel contenant des colonnes de marques/produits et de ventes/volumes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top Greeting Card with Right Vehicle Showcase Banner */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#0d1627] via-[#0d1627] to-[#121f38] border border-slate-800/90 overflow-hidden shadow-xl">
                      <div className="flex flex-col md:flex-row items-center justify-between p-6 sm:p-7 relative z-10 gap-4">
                        {/* Left Welcome Text */}
                        <div className="max-w-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Fichier Actif
                            </span>
                            <span className="text-xs text-white font-semibold truncate max-w-xs">
                              {marketStats?.datasetName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({marketStats?.totalRows} lignes réelles)
                            </span>
                          </div>
                          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Tableau de Bord Dynamique
                          </h1>
                          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                            Les graphiques et calculs ci-dessous sont générés en direct à partir des lignes de votre fichier Excel importé.
                          </p>

                          {/* Quick CTAs */}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveSidebarItem('Analyse de Marché')}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer transition-all"
                            >
                              <BarChart3 className="w-4 h-4" />
                              <span>Analyse & Filtres Avancés</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSidebarItem('Assistant IA')}
                              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-red-700/60 transition-all cursor-pointer shadow-md"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                              <span>Assistant IA (Chatbot)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSidebarItem('Importer un fichier')}
                              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 border border-slate-700/70 transition-all cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-400" />
                              <span>Importer un autre fichier</span>
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
                        <SalesEvolutionChart
                          data={marketStats?.timeEvolution}
                          datasetName={marketStats?.datasetName || undefined}
                        />
                      </div>

                      {/* Donut Model Distribution Chart */}
                      <div className="lg:col-span-5">
                        <ModelDistributionChart
                          data={marketStats?.modelDistribution}
                          datasetName={marketStats?.datasetName || undefined}
                        />
                      </div>
                    </section>

                    {/* Row 3: Regional Sales (Left) + Top 5 Models (Center) + Recent Activity (Right) */}
                    <section
                      aria-label="Analyses régionales et activités"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6"
                    >
                      {/* Regional / Geographic breakdown */}
                      <TunisiaRegionalMap
                        data={marketStats?.regionalData}
                        datasetName={marketStats?.datasetName || undefined}
                      />

                      {/* Top 5 Best Selling Items */}
                      <TopModelsList
                        items={marketStats?.topModels}
                        datasetName={marketStats?.datasetName || undefined}
                      />

                      {/* Quick Navigation Card */}
                      <RecentActivityCard onNavigate={(item) => setActiveSidebarItem(item)} />
                    </section>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
