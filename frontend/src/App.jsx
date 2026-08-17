import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Applicants from './pages/Applicants';
import IpoMaster from './pages/IpoMaster';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Accounts from './pages/Accounts';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import AllotmentChecker from './pages/AllotmentChecker';
import AllottedPortfolio from './pages/AllottedPortfolio';
import PartyLedger from './pages/PartyLedger';
import ExpenseTracker from './pages/ExpenseTracker';
import NotFound from './pages/NotFound';
import OfflinePage from './pages/OfflinePage';
import { useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import { requestForToken, onMessageListener } from './firebase';
import { api } from './api';
import { Menu, X, TrendingUp, UserCircle, LogOut } from 'lucide-react';
import CommandPalette from './components/ui/CommandPalette';
import RealtimeNotificationListener from './components/ui/RealtimeNotificationListener';
import TradingTicker from './components/ui/TradingTicker';
import AnimatedPage from './components/ui/AnimatedPage';
import MobileBottomNav from './components/layout/MobileBottomNav';
import OfflineSyncBanner from './components/ui/OfflineSyncBanner';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import ConfirmModal from './components/ui/ConfirmModal';

const GlobalLoader = ({ text, brandName }) => {
  return (
    <div className="fixed inset-0 bg-[#09090b] z-[9999] flex flex-col items-center justify-center select-none" style={{ pointerEvents: 'all' }}>
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 border border-white/10 mb-4">
        <TrendingUp size={28} />
      </div>
      <div className="text-xs uppercase tracking-widest font-bold text-indigo-400 animate-pulse">
        {brandName}
      </div>
      <div className="text-[0.75rem] text-[var(--text-muted)] mt-2 font-medium">
        {text}
      </div>
    </div>
  );
};

function App() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [globalBanner, setGlobalBanner] = useState('');
  const [brandName, setBrandName] = useState('IPO Tracker');
  const [brandColor, setBrandColor] = useState('');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('ipo_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const json = { data: await api.getPublicSettings() };
        if (json.data) {
          if (json.data.globalBanner) setGlobalBanner(json.data.globalBanner);
          if (json.data.brandName) {
            setBrandName(json.data.brandName);
            document.title = json.data.brandName;
          }
          if (json.data.brandColor) setBrandColor(json.data.brandColor);
        }
      } catch (e) { }
    };
    fetchSettings();
  }, []);

  React.useEffect(() => {
    if (user) {
      requestForToken().then((token) => {
        if (token) {
          api.registerFcmToken(token).catch(err => console.error('Failed to register FCM token', err));
        }
      });

      onMessageListener((payload) => {
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'Notification', {
            body: payload.notification?.body,
            icon: '/app-icon.png'
          });
        }
        toast((t) => (
          <div>
            <b>{payload.notification?.title}</b>
            <p>{payload.notification?.body}</p>
          </div>
        ), { duration: 5000 });
      });
    }
  }, [user]);

  if (loading) {
    return (
      <GlobalLoader text="Loading your portfolio..." brandName={brandName} />
    );
  }

  if (!user) return <Auth />;

  const isValidRoute = (pathname) => {
    const validPaths = [
      '/',
      '/records',
      '/accounts',
      '/party-ledger',
      '/expenses',
      '/applicants',
      '/ipo-master',
      '/calendar',
      '/allotment',
      '/allotted',
      '/analytics',
      '/settings',
      '/profile',
      '/admin',
      '/offline'
    ];
    const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    return validPaths.includes(cleanPath);
  };

  if (!isValidRoute(location.pathname)) {
    return <NotFound />;
  }

  return (
    <div key="main-app" className="flex h-screen bg-[#09090b] text-[#f4f4f5] overflow-hidden font-sans relative">
      {/* Brand color override */}
      {brandColor && (
        <style>{`
          :root {
            --color-primary: ${brandColor} !important;
          }
        `}</style>
      )}

      {/* Global Banner */}
      <AnimatePresence>
        {globalBanner && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-center py-2 px-4 shadow-lg flex justify-between items-center text-[0.8125rem] font-medium"
          >
            <span className="flex-1">{globalBanner}</span>
            <button onClick={() => setGlobalBanner('')} className="text-white/70 hover:text-white ml-4 transition-colors">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <OfflineSyncBanner />
      <PWAInstallPrompt />

      {/* Impersonation Banner */}
      {localStorage.getItem('ipo_master_token') && (
        <div className="fixed top-0 left-0 w-full z-[60] bg-indigo-600 text-white text-center py-2 px-4 flex justify-center items-center text-[0.8125rem] font-medium gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>Impersonating <strong>{user.username}</strong></span>
          <button
            onClick={() => {
              localStorage.setItem('ipo_token', localStorage.getItem('ipo_master_token'));
              localStorage.removeItem('ipo_master_token');
              window.location.href = '/admin';
            }}
            className="ml-2 bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded transition-colors text-xs font-semibold"
          >
            Stop Impersonating
          </button>
        </div>
      )}

      {/* Mobile Topbar */}
      <div
        className={`md:hidden fixed left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 ${globalBanner || localStorage.getItem('ipo_master_token') ? 'top-9' : 'top-0'
          }`}
        style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <TrendingUp size={15} />
          </div>
          <span className="font-bold text-[0.9375rem] text-white tracking-tight">{brandName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/profile')}
            className="p-1.5 text-zinc-300 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all border border-zinc-800 flex items-center justify-center"
            title="My Profile"
          >
            <UserCircle size={18} />
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-zinc-800 flex items-center justify-center"
            title="Log Out"
          >
            <LogOut size={17} />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/8 rounded-lg transition-all border border-[var(--border)] ml-0.5"
            title="Menu"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} brandName={brandName} />

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto relative z-10 flex flex-col ${globalBanner || localStorage.getItem('ipo_master_token') ? 'pt-[92px] md:pt-0' : 'pt-[56px] md:pt-0'
        } cyber-grid-bg`}>
        <TradingTicker />
        <div className="flex-1 p-3 sm:p-4 md:p-8 pb-28 md:pb-8">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/records" element={<AnimatedPage><Records /></AnimatedPage>} />
              <Route path="/accounts" element={<AnimatedPage><Accounts /></AnimatedPage>} />
              <Route path="/party-ledger" element={<AnimatedPage><PartyLedger /></AnimatedPage>} />
              <Route path="/expenses" element={<AnimatedPage><ExpenseTracker /></AnimatedPage>} />
              <Route path="/applicants" element={<AnimatedPage><Applicants /></AnimatedPage>} />
              <Route path="/ipo-master" element={<AnimatedPage><IpoMaster /></AnimatedPage>} />
              <Route path="/calendar" element={<AnimatedPage><Calendar /></AnimatedPage>} />
              <Route path="/allotment" element={<AnimatedPage><AllotmentChecker /></AnimatedPage>} />
              <Route path="/allotted" element={<AnimatedPage><AllottedPortfolio /></AnimatedPage>} />
              <Route path="/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
              <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
              <Route path="/admin" element={user?.role === 'admin' || user?.role === 'master' ? <AnimatedPage><AdminPanel /></AnimatedPage> : <AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/offline" element={<AnimatedPage><OfflinePage /></AnimatedPage>} />
              <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
            </Routes>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="px-8 py-4 border-t border-[var(--border)] shrink-0 bg-[#09090b] mb-14 md:mb-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
              <TrendingUp size={14} />
              <span className="tracking-tight">{brandName}</span>
            </div>
            <div className="flex gap-4 text-[0.75rem] text-[var(--text-muted)]">
              <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-indigo-400 transition-colors">Terms</a>
              <a href="https://github.com/dakshit" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">Support</a>
              <span className="text-[var(--text-muted)]">© 2026</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar (Android & iOS) */}
      <MobileBottomNav />

      {/* Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontFamily: 'Inter, sans-serif',
            padding: '10px 14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-2 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
      <CommandPalette />
      <RealtimeNotificationListener />
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Log Out"
        message="Are you sure you want to log out of your session?"
        confirmText="Log Out"
      />
    </div>
  );
}

export default App;
