import React from 'react';
import { Clock, UploadCloud, BarChart3, FileText, User, ArrowRight } from 'lucide-react';
import { RECENT_ACTIVITIES } from '../../data/mockData';

interface RecentActivityCardProps {
  onNavigate?: (item: string) => void;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ onNavigate }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
        );
      case 'analytics':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      case 'report':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-950/40 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'user':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-950/40 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ff284d]" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Dernières activités
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.('Fichiers importés')}
          className="text-xs font-semibold text-[#ff284d] hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Voir tout</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Activities List */}
      <div className="divide-y divide-slate-800/60 flex-1 flex flex-col justify-around">
        {RECENT_ACTIVITIES.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 py-2 px-1 hover:bg-slate-800/30 rounded-xl transition-colors cursor-pointer"
          >
            {getActivityIcon(activity.type)}

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {activity.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                <span className="font-medium text-slate-300">{activity.category}</span>
                <span className="mx-1.5">•</span>
                <span>{activity.timestamp}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
