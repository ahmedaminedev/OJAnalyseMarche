import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, Eye, EyeOff, LogIn, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('admin@omoda-jaecoo.tn');
  const [password, setPassword] = useState('Admin2025!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against the OMODA | JAECOO analytics server
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 650);
  };

  const handleQuickDemoFill = () => {
    setEmail('admin@omoda-jaecoo.tn');
    setPassword('Admin2025!');
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="login-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#0b1220] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-red-950/40 z-10 overflow-hidden"
          >
            {/* Top decorative red glowing accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#ff284d] to-rose-500" />
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              id="close-login-modal-btn"
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fermer la fenêtre de connexion"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6 pt-1">
              <div className="flex justify-center mb-3">
                <BrandLogo size="sm" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Connexion Plateforme Analytics
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Accédez aux analyses exclusives du marché automobile tunisien
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/60 flex items-center gap-2 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Identifiant ou Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@omoda-jaecoo.tn"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#070b14] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Veuillez contacter le support IT Omoda | Jaecoo pour réinitialiser votre accès.')}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#070b14] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    id="login-remember-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-red-600 focus:ring-red-500 bg-[#070b14] accent-[#ff284d]"
                  />
                  <span>Mémoriser ma session</span>
                </label>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Accès Sécurisé SSL</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="submit-login-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-[#e5243b] hover:from-red-500 hover:to-red-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Vérification des droits...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Se connecter au tableau de bord</span>
                  </>
                )}
              </button>

              {/* Demo quick fill helper */}
              <div className="pt-3 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-800/50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Remplir les identifiants Administrateur (Démo)</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
