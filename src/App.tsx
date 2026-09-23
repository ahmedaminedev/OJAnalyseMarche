import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PageView } from './types';
import { HomePage } from './components/home/HomePage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { LoginModal } from './components/auth/LoginModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-[#ff284d] selection:text-white">
      <AnimatePresence mode="wait">
        {currentPage === 'home' ? (
          <motion.div
            key="home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomePage onOpenLogin={handleOpenLogin} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardPage onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessible Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseLogin}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
