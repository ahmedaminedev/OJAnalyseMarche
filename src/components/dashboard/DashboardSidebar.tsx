import React, { useState } from 'react';
import {
  LayoutDashboard,
  Folder,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Bot,
} from 'lucide-react';
import { ASSETS } from '../../data/mockData';

interface DashboardSidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isOpen,
  onCloseMobile,
  activeItem = 'Dashboard',
  onSelectItem,
}) => {
  // Collapsible state for accordion sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    donnees: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const navSections: NavSection[] = [
    {
      id: 'donnees',
      label: 'Données',
      icon: Folder,
      items: [
        'Importer un fichier',
        'Fichiers importés',
      ],
    },
  ];

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
        <div className="p-4 space-y-1">
          {/* Main Dashboard item */}
          <button
            id="sidebar-dashboard-btn"
            type="button"
            onClick={() => handleItemClick('Dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeItem === 'Dashboard'
                ? 'bg-[#1b1522] text-white border-l-4 border-[#ff284d] shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg ${
                activeItem === 'Dashboard'
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-wide">Tableau de bord</span>
          </button>

          {/* Market Analytics section */}
          <button
            id="sidebar-analytics-btn"
            type="button"
            onClick={() => handleItemClick('Analyse de Marché')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeItem === 'Analyse de Marché'
                ? 'bg-[#1b1522] text-white border-l-4 border-[#ff284d] shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg ${
                  activeItem === 'Analyse de Marché'
                    ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-semibold tracking-wide">Analyse de Marché</span>
            </div>
          </button>

          {/* Assistant IA Chatbot section */}
          <button
            id="sidebar-assistant-btn"
            type="button"
            onClick={() => handleItemClick('Assistant IA')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeItem === 'Assistant IA'
                ? 'bg-[#1b1522] text-white border-l-4 border-[#ff284d] shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg ${
                  activeItem === 'Assistant IA'
                    ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400'
                }`}
              >
                <Bot className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-semibold tracking-wide">Assistant IA</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 font-mono">
              <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
              Chatbot
            </span>
          </button>

          {/* Collapsible Sections */}
          <div className="pt-2 space-y-1">
            {navSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = openSections[section.id];

              return (
                <div key={section.id} className="py-1">
                  {/* Section Trigger Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{section.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {/* Accordion Sub-items */}
                  {isExpanded && (
                    <div className="mt-1 pl-9 pr-2 space-y-1">
                      {section.items.map((subItem) => {
                        const isSubActive = activeItem === subItem;
                        return (
                          <button
                            key={subItem}
                            type="button"
                            onClick={() => handleItemClick(subItem)}
                            className={`w-full text-left text-xs py-1.5 px-2 rounded-md transition-colors truncate ${
                              isSubActive
                                ? 'text-[#ff284d] font-semibold bg-red-950/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                            }`}
                          >
                            {subItem}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                Drive Your Future
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
