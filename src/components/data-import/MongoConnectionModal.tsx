import React, { useState } from 'react';
import {
  Database,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Server,
  ExternalLink,
  Copy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { importService } from '../../services/importService';

interface MongoConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  isConnected?: boolean;
  currentHost?: string;
  databaseName?: string;
}

export const MongoConnectionModal: React.FC<MongoConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  isConnected = false,
  currentHost = 'Non configuré',
  databaseName = 'omoda_jaecoo_stats_db',
}) => {
  const [uri, setUri] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleTestAndConnect = async () => {
    if (!uri.trim()) return;
    setIsTesting(true);
    setResult(null);

    try {
      const res = await importService.testMongoConnection(uri.trim());
      if (res.success) {
        setResult({
          success: true,
          message: res.message || `Connecté avec succès à MongoDB (Base: ${databaseName}) !`,
        });
        if (onConnected) {
          onConnected();
        }
      } else {
        setResult({
          success: false,
          message:
            res.error ||
            "Échec de connexion : vérifiez les identifiants, le mot de passe et l'autorisation IP (0.0.0.0/0 sur Atlas).",
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Erreur réseau lors de la tentative de connexion.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#0b1222] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0d1627] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Connexion Base de Données MongoDB
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isConnected
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                  }`}
                >
                  {isConnected ? 'Connecté' : 'Déconnecté (HTTP 503)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Nécessaire pour enregistrer et persister vos fichiers avec réconciliation exacte
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-xs uppercase tracking-wider">
              <Server className="w-4 h-4 text-[#ff284d]" />
              <span>Pourquoi la base doit être connectée ?</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              L’application s’exécute sur le Cloud et applique une <strong>stricte politique de persistance réelle</strong> : aucune donnée simulée ou fictive n’est acceptée. Pour que le bouton <em>« Enregistrer dans la base de données »</em> insère vos lots et vérifie la réconciliation mathématique à 100%, vous devez fournir l’URI de votre base MongoDB accessible depuis le web (ex: cluster gratuit <strong>MongoDB Atlas M0</strong>).
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span>Base cible : <strong className="text-white font-mono">{databaseName}</strong></span>
              <span>Hôte actuel : <strong className="text-slate-300 font-mono">{currentHost}</strong></span>
            </div>
          </div>

          {/* Form input */}
          <div className="p-4 rounded-xl bg-[#091120] border border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Chaîne de connexion MongoDB (URI)</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setUri(
                    `mongodb+srv://utilisateur:motdepasse@cluster0.mongodb.net/${databaseName}?retryWrites=true&w=majority`
                  )
                }
                className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Insérer modèle Atlas</span>
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder={`mongodb+srv://user:pass@cluster.mongodb.net/${databaseName}`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d]"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <span className="text-[11px] text-slate-400">
                  La connexion est testée et appliquée instantanément sans redémarrage.
                </span>

                <button
                  type="button"
                  onClick={handleTestAndConnect}
                  disabled={isTesting || !uri.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex-shrink-0"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Test & Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Tester & Connecter en direct</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test result message */}
            {result && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 mt-2 ${
                  result.success
                    ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
                    : 'bg-red-950/70 border border-red-800 text-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{result.message}</p>
                  {result.success && (
                    <p className="text-[11px] text-emerald-300/80 mt-1">
                      Vous pouvez maintenant fermer cette fenêtre et cliquer sur « Enregistrer dans la base de données ».
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Guide: Atlas Free Tier */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span>Guide rapide : Obtenir une base MongoDB gratuite en 2 minutes</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>
                Rendez-vous sur{' '}
                <a
                  href="https://www.mongodb.com/cloud/atlas/register"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold"
                >
                  MongoDB Atlas (Free M0) <ExternalLink className="w-3 h-3" />
                </a>{' '}
                et créez un cluster gratuit.
              </li>
              <li>
                Dans <strong>Network Access</strong>, ajoutez l’adresse IP <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">0.0.0.0/0</code> pour autoriser les requêtes Cloud.
              </li>
              <li>
                Dans <strong>Database Access</strong>, créez un utilisateur avec nom et mot de passe.
              </li>
              <li>
                Cliquez sur <strong>Connect</strong> &gt; <strong>Drivers</strong> &gt; copiez l’URI et collez-la dans le champ ci-dessus.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0d1627] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>

          {result?.success && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terminé, continuer l'importation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
