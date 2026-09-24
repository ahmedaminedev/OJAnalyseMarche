import React from 'react';
import {
  Upload,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { ASSETS } from '../../data/mockData';

interface DashboardSidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isOpen,
  onCloseMobile,
  activeItem = 'Importer un fichier',
  onSelectItem,
}) => {
  const handleItemClick = (label: string) => {
    if (onSelectItem) {
      onSelectItem(label);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-[#070b14] border-r border-slate-800/80 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="p-4 space-y-2">
          <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Importation & Données
          </div>

          {/* Importer un fichier */}
          <button
            id="sidebar-import-btn"
            type="button"
            onClick={() => handleItemClick('Importer un fichier')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left ${
              activeItem === 'Importer un fichier'
                ? 'bg-[#1b1522] text-white border-l-4 border-[#ff284d] shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg ${
                activeItem === 'Importer un fichier'
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 bg-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-wide text-white">Importer un fichier</span>
              <span className="text-[11px] text-slate-400">Excel (.xlsx, .xls)</span>
            </div>
          </button>

          {/* Fichiers importés & Jeux de données */}
          <button
            id="sidebar-files-btn"
            type="button"
            onClick={() => handleItemClick('Fichiers importés')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left ${
              activeItem === 'Fichiers importés' || activeItem === 'Historique des imports' || activeItem === 'Jeux de données'
                ? 'bg-[#1b1522] text-white border-l-4 border-[#ff284d] shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg ${
                activeItem === 'Fichiers importés' || activeItem === 'Historique des imports' || activeItem === 'Jeux de données'
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-wide text-white">Fichiers importés</span>
              <span className="text-[11px] text-slate-400">Historique & Tables</span>
            </div>
          </button>
        </div>

        {/* Bottom Sidebar Promotional Card: OMODA | JAECOO - DRIVE YOUR FUTURE */}
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-800/90 group shadow-lg">
            {/* Background car preview */}
            <div className="h-32 w-full relative bg-slate-900">
              <img
                src={ASSETS.dashboardHero}
                alt="OMODA JAECOO banner"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/75 to-transparent" />
              {/* Neon red bottom accent glow */}
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff284d] to-transparent" />
            </div>

            {/* Poster Overlay Text */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 text-center">
              <div className="font-brand font-black text-xs tracking-[0.18em] text-white">
                OMODA <span className="text-[#ff284d]">|</span> JAECOO
              </div>
              <div className="text-[9px] font-bold tracking-[0.25em] text-slate-400 mt-0.5 uppercase">
                Plateforme d'Importation
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
