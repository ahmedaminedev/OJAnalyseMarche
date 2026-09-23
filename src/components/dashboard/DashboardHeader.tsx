import React, { useState } from 'react';
import { Bell, ChevronDown, User, LogOut, Settings, ShieldCheck, Menu, X, Check, Sparkles, Bot } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface DashboardHeaderProps {
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
  activeItem,
  onSelectItem,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    {
      id: 'n1',
      title: 'Importation terminée avec succès',
      desc: 'ventes_septembre.xlsx a été indexé (1 420 lignes)',
      time: 'Il y a 10 min',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Alerte Quota OMODA C5',
      desc: 'Seuil mensuel des précommandes dépassé à 120%',
      time: 'Il y a 1 h',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Nouveau rapport exporté',
      desc: 'Le rapport Q3 du marché tunisien est prêt',
      time: 'Il y a 3 h',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#070b14] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle + Logo */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            id="mobile-sidebar-toggle-btn"
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Basculer le menu latéral"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <BrandLogo size="sm" subtitle="PLATEFORME ANALYTICS" />
      </div>

      {/* Center Navigation Bar (Desktop) */}
      {onSelectItem && (
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => onSelectItem('Dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeItem === 'Dashboard'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Tableau de bord
          </button>
          <button
            type="button"
            onClick={() => onSelectItem('Analyse de Marché')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeItem === 'Analyse de Marché'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Analyse de Marché
          </button>
          <button
            type="button"
            onClick={() => onSelectItem('Assistant IA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeItem === 'Assistant IA'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Assistant IA</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 font-mono font-bold">
              Chatbot
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelectItem('Fichiers importés')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeItem === 'Fichiers importés' || activeItem === 'Importer un fichier'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Données & Imports
          </button>
        </nav>
      )}

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            id="notifications-toggle-btn"
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            aria-label="Afficher les notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Red badge with notification count '3' */}
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#ff284d] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#070b14]">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              id="notifications-dropdown-menu"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0c1424] border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-bold text-white">Notifications (3)</span>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Tout marquer comme lu</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800/60 mt-2 max-h-72 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="py-3 px-2 hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-200">
                        {notif.title}
                      </h4>
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{notif.desc}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {notif.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 py-1.5 px-3 rounded-xl hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition-colors cursor-pointer text-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline-block">
              Administrateur
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showUserMenu && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-56 bg-[#0c1424] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3 py-2 border-b border-slate-800/80">
                <p className="text-xs font-bold text-white">Administrateur OMODA | JAECOO</p>
                <p className="text-[11px] text-slate-400 truncate">admin@omoda-jaecoo.tn</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Accès Superviseur Actif</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paramètres du compte</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-800/80">
                <button
                  id="dashboard-logout-btn"
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Se déconnecter (Retour à l'accueil)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
