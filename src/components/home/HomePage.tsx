import React from 'react';
import { motion } from 'motion/react';
import {
  Home,
  User,
  ArrowRight,
  BarChart2,
  Car,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { ASSETS } from '../../data/mockData';

interface HomePageProps {
  onOpenLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  const featureCards = [
    {
      id: 'feature-market',
      title: 'Analyses du marché',
      description:
        'Suivez les tendances, les évolutions et les opportunités du marché automobile tunisien.',
      icon: BarChart2,
    },
    {
      id: 'feature-brands',
      title: 'Marques et modèles',
      description:
        'Explorez les performances des marques, les modèles les plus populaires et les parts de marché.',
      icon: Car,
    },
    {
      id: 'feature-reports',
      title: 'Rapports et statistiques',
      description:
        'Accédez à des rapports détaillés et à des indicateurs clés pour éclairer vos décisions.',
      icon: FileText,
    },
    {
      id: 'feature-trends',
      title: 'Tendances du secteur',
      description:
        'Restez informé des dernières évolutions du marché et des perspectives d\'avenir.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#070b14] text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background Hero Image with atmospheric overlays matching the original design */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src={ASSETS.homeHero}
          alt="OMODA and JAECOO luxury automotive flagship showcase"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center lg:object-right"
          loading="eager"
        />
        {/* Dark Vignette & Gradient Overlays to match Image 1's dark high contrast background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-[#070b14]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/85 md:via-[#070b14]/65 to-transparent w-full lg:w-4/5" />
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070b14]/90 to-transparent" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full border-b border-slate-800/40 bg-[#070b14]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center">
            <BrandLogo size="md" />
          </div>

          {/* Center Navigation: Accueil (Active) */}
          <nav className="flex items-center" aria-label="Navigation principale">
            <div className="relative flex items-center gap-2 px-4 py-2 text-white font-medium text-sm">
              <Home className="w-5 h-5 text-[#ff284d]" aria-hidden="true" />
              <span>Accueil</span>
              {/* Active Red Underline Bar matching design */}
              <div className="absolute -bottom-2.5 left-2 right-2 h-0.5 bg-[#ff284d] rounded-full" />
            </div>
          </nav>

          {/* Right Action: Se connecter */}
          <div className="flex items-center">
            <button
              id="header-login-btn"
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-300" />
              <span>Se connecter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 flex flex-col justify-center w-full">
        <div className="max-w-2xl lg:max-w-3xl">
          {/* Eyebrow Label with red dash */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5 mb-4"
          >
            <span className="w-6 h-0.5 bg-[#ff284d] rounded-full inline-block" />
            <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-slate-300 uppercase font-tech">
              Plateforme d'analyse automobile
            </span>
          </motion.div>

          {/* Big Bold Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-[1.12] text-white"
          >
            Bienvenue sur votre
            <br />
            plateforme d'analyse automobile
            <br />
            <span className="text-[#ff284d] inline-block mt-1">
              Le marché automobile tunisien
              <br />
              à portée de main
            </span>
          </motion.h1>

          {/* Subtitle description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl"
          >
            Notre plateforme centralise les données du marché automobile tunisien et
            vous offre des outils puissants pour explorer, analyser et mieux comprendre
            les tendances du secteur.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <button
              id="hero-explore-btn"
              onClick={onOpenLogin}
              className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-[#e5243b] hover:from-red-500 hover:to-red-600 text-white font-medium text-sm md:text-base shadow-xl shadow-red-600/30 transition-all transform hover:translate-x-0.5 active:scale-[0.98] cursor-pointer"
            >
              <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" />
              <span>Explorer la plateforme</span>
            </button>
          </motion.div>
        </div>
      </main>

      {/* Bottom 4 Feature Cards (exact layout from Image 1) */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                id={card.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                onClick={onOpenLogin}
                className="group relative bg-[#091122]/75 hover:bg-[#0d1830]/90 backdrop-blur-md border border-slate-800/80 hover:border-red-500/40 rounded-2xl p-5 md:p-6 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-red-950/20 flex flex-col justify-between"
              >
                <div>
                  {/* Circular Icon with Red Ring */}
                  <div className="w-12 h-12 rounded-full border border-red-500/40 bg-red-950/20 flex items-center justify-center text-[#ff284d] mb-4 group-hover:border-red-500 group-hover:scale-105 transition-all">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Card Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {card.title}
                  </h3>

                  {/* Card Description */}
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Red Accent & Arrow */}
                <div className="mt-6 pt-2 flex items-center justify-between">
                  <div className="w-10 h-0.5 bg-red-600/80 rounded-full group-hover:w-16 transition-all duration-300" />
                  <ArrowRight className="w-4 h-4 text-[#ff284d] transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
