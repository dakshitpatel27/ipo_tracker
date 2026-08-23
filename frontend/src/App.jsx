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
import Watchlist from './pages/Watchlist';
import Timeline from './pages/Timeline';
import FamilyPortfolio from './pages/FamilyPortfolio';
import ExpenseTracker from './pages/ExpenseTracker';
import ApplicationMatrix from './pages/ApplicationMatrix';
import NotFound from './pages/NotFound';
import OfflinePage from './pages/OfflinePage';
import { useAuth } from './context/AuthContext';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import { requestForToken } from './firebase';
import { api } from './api';
import { Menu, X, TrendingUp, UserCircle, LogOut, Eye, EyeOff } from 'lucide-react';
import CommandPalette from './components/ui/CommandPalette';
import TradingTicker from './components/ui/TradingTicker';
import AnimatedPage from './components/ui/AnimatedPage';
import MobileBottomNav from './components/layout/MobileBottomNav';
import OfflineSyncBanner from './components/ui/OfflineSyncBanner';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import HomeScreenWidget from './components/ui/HomeScreenWidget';
import ConfirmModal from './components/ui/ConfirmModal';
import PendingApproval from './pages/PendingApproval';

const GlobalLoader = ({ text, brandName }) => {
  return (
    <div className="fixed inset-0 bg-[#09090b] z-[9999] flex flex-col items-center justify-center select-none" style={{ pointerEvents: 'all' }}>
      <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-indigo-500/20 border border-white/10 mb-4 animate-pulse" />
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
    document.documentElement.classList.remove('light');
    try { localStorage.removeItem('ipo_theme'); } catch (e) {}
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
    if (user && user.status === 'approved') {
      requestForToken().then((token) => {
        if (token) {
          api.registerFcmToken(token).catch(err => console.error('Failed to register FCM token', err));
        }
      });
    }
  }, [user]);

  if (loading) {
    return (
      <GlobalLoader text="Loading your portfolio..." brandName={brandName} />
    );
  }

  if (!user) return <Auth />;

  if (user.status === 'pending') {
    return <PendingApproval pendingUser={user} />;
  }

  if (user.status === 'rejected') {
    return (
      <div className="fixed inset-0 bg-[#09090b] z-[9999] flex items-center justify-center p-4">
        <div className="glass-card max-w-sm w-full p-8 text-center space-y-4 border-rose-500/30">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <X size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Account Registration Rejected</h2>
          <p className="text-xs text-zinc-400">Your registration request was rejected by an administrator.</p>
          <button onClick={logout} className="btn-primary w-full py-2.5 bg-rose-600 hover:bg-rose-700">Log Out & Return to Login</button>
        </div>
      </div>
    );
  }

  const isValidRoute = (pathname) => {
    const validPaths = [
      '/',
      '/records',
      '/application-matrix',
      '/accounts',
      '/party-ledger',
      '/expenses',
      '/applicants',
      '/ipo-master',
      '/calendar',
      '/allotment',
      '/allotted',
      '/analytics',
      '/watchlist',
      '/timeline',
      '/family',
      '/settings',
      '/profile',
      '/widget',
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
    <div key="main-app" className="flex h-screen bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden font-sans relative">
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
          <span>Impersonating <strong>{user?.username}</strong></span>
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
          <img
            src="/app-icon.png"
            alt="IPO Tracker Logo"
            className="w-7 h-7 rounded-lg object-cover shadow-md shadow-indigo-500/20 border border-indigo-500/30"
          />
          <span className="font-bold text-[0.9375rem] text-[var(--text-primary)] tracking-tight">{brandName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StealthHeaderButton />
          <button
            onClick={() => navigate('/profile')}
            className="p-1.5 text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all border border-[var(--border)] flex items-center justify-center"
            title="My Profile"
          >
            <UserCircle size={18} />
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-[var(--border)] flex items-center justify-center"
            title="Log Out"
          >
            <LogOut size={17} />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 rounded-lg transition-all border border-[var(--border)] ml-0.5"
            title="Menu"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} brandName={brandName} />

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto relative z-10 flex flex-col bg-[var(--bg)] ${globalBanner || localStorage.getItem('ipo_master_token') ? 'pt-[92px] md:pt-0' : 'pt-[56px] md:pt-0'
        } cyber-grid-bg`}>
        <TradingTicker />
        <div className="flex-1 p-3 sm:p-4 md:p-8 pb-28 md:pb-8">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/records" element={<AnimatedPage><Records /></AnimatedPage>} />
              <Route path="/application-matrix" element={<AnimatedPage><ApplicationMatrix /></AnimatedPage>} />
              <Route path="/accounts" element={<AnimatedPage><Accounts /></AnimatedPage>} />
              <Route path="/party-ledger" element={<AnimatedPage><PartyLedger /></AnimatedPage>} />
              <Route path="/expenses" element={<AnimatedPage><ExpenseTracker /></AnimatedPage>} />
              <Route path="/applicants" element={<AnimatedPage><Applicants /></AnimatedPage>} />
              <Route path="/ipo-master" element={<AnimatedPage><IpoMaster /></AnimatedPage>} />
              <Route path="/calendar" element={<AnimatedPage><Calendar /></AnimatedPage>} />
              <Route path="/allotment" element={<AnimatedPage><AllotmentChecker /></AnimatedPage>} />
              <Route path="/allotted" element={<AnimatedPage><AllottedPortfolio /></AnimatedPage>} />
              <Route path="/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
              <Route path="/watchlist" element={<AnimatedPage><Watchlist /></AnimatedPage>} />
              <Route path="/timeline" element={<AnimatedPage><Timeline /></AnimatedPage>} />
              <Route path="/family" element={<AnimatedPage><FamilyPortfolio /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
              <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
              <Route path="/widget" element={<AnimatedPage><HomeScreenWidget standalone={true} /></AnimatedPage>} />
              <Route path="/admin" element={user?.role === 'admin' || user?.role === 'master' ? <AnimatedPage><AdminPanel /></AnimatedPage> : <AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/offline" element={<AnimatedPage><OfflinePage /></AnimatedPage>} />
              <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
            </Routes>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="px-8 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface)] mb-14 md:mb-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs">
              <TrendingUp size={14} />
              <span className="tracking-tight">{brandName}</span>
            </div>
            <div className="flex gap-4 text-[0.75rem] text-[var(--text-muted)]">
              <a href="#" className="hover:text-indigo-500 transition-colors">Privacy</a>
              <a href="#" className="hover:text-indigo-500 transition-colors">Terms</a>
              <a href="https://github.com/dakshit" target="_blank" rel="noreferrer" className="hover:text-indigo-500 transition-colors">Support</a>
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

const StealthHeaderButton = () => {
  const { isStealth, toggleStealth } = usePrivacy();
  return (
    <button
      onClick={toggleStealth}
      className={`p-1.5 rounded-lg transition-all border flex items-center justify-center ${
        isStealth
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          : 'text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 border-[var(--border)]'
      }`}
      title={isStealth ? 'Stealth Mode Active (Click to Unmask)' : 'Toggle Stealth Mode (Mask Values)'}
    >
      {isStealth ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
};

export default function AppWithPrivacy() {
  return (
    <PrivacyProvider>
      <App />
    </PrivacyProvider>
  );
}

