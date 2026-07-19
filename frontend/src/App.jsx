import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Applicants from './pages/Applicants';
import IpoMaster from './pages/IpoMaster';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import { useAuth } from './context/AuthContext';
import { motion } from 'framer-motion';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import { requestForToken, onMessageListener } from './firebase';
import { api } from './api';
import { Menu, Download } from 'lucide-react';

function App() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [globalBanner, setGlobalBanner] = useState('');

  const [brandName, setBrandName] = useState('IPO Tracker');
  const [brandColor, setBrandColor] = useState('');

  // Listen for PWA install prompt
  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    if (!deferredPrompt) {
      toast('To install, open this site in Chrome on Android or Safari on iOS, and select "Add to Home Screen".', { icon: '📱' });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('ipo_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  // Fetch public settings for branding and banner
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/settings/public');
        const json = await res.json();
        if (json.data) {
          if (json.data.globalBanner) setGlobalBanner(json.data.globalBanner);
          if (json.data.brandName) {
             setBrandName(json.data.brandName);
             document.title = json.data.brandName;
          }
          if (json.data.brandColor) setBrandColor(json.data.brandColor);
        }
      } catch(e) {}
    };
    fetchSettings();
  }, []);

  React.useEffect(() => {
    if (user) {
      // Request FCM Token on login
      requestForToken().then((token) => {
        if (token) {
          api.registerFcmToken(token).catch(err => console.error('Failed to register FCM token', err));
        }
      });

      // Listen for foreground messages
      onMessageListener((payload) => {
        // Trigger native OS notification even when tab is open
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'Notification', {
            body: payload.notification?.body,
            icon: '/vite.svg'
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

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-emerald-500">Loading...</div>;

  if (!user) {
    return <Auth />;
  }

  return (
    <div key="main-app" className="flex flex-col md:flex-row h-screen bg-background text-gray-100 overflow-hidden font-sans relative">
      {brandColor && (
        <style>{`
          :root {
            --color-emerald-400: ${brandColor} !important;
            --color-emerald-500: ${brandColor} !important;
            --color-emerald-600: ${brandColor} !important;
          }
        `}</style>
      )}
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[15%] -right-[8%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[150px]"
        />
      </div>

      {/* Global Banner */}
      {globalBanner && (
        <div className="absolute top-0 left-0 w-full z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-center py-2 px-4 shadow-lg flex justify-between items-center text-sm font-medium">
           <span className="flex-1">{globalBanner}</span>
           <button onClick={() => setGlobalBanner('')} className="text-white/80 hover:text-white ml-4" title="Dismiss">✕</button>
        </div>
      )}

      {/* Impersonation Banner */}
      {localStorage.getItem('ipo_master_token') && (
        <div className="absolute top-0 left-0 w-full z-[60] bg-blue-600 text-white text-center py-2 px-4 shadow-lg flex justify-center items-center text-sm font-bold animate-pulse">
           <span>You are currently impersonating {user.username}.</span>
           <button onClick={() => {
              localStorage.setItem('ipo_token', localStorage.getItem('ipo_master_token'));
              localStorage.removeItem('ipo_master_token');
              window.location.href = '/admin';
           }} className="ml-4 bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition-colors">
              Stop Impersonating
           </button>
        </div>
      )}

      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 glass-card m-4 z-20 mt-[40px]">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
           </div>
           <div className="font-bold text-lg text-white">{brandName}</div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-emerald-500 bg-black/20 rounded-md border border-border">
          <Menu size={20} />
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} brandName={brandName} />
      
      <main className="flex-1 overflow-y-auto relative z-10 px-4 md:px-8 py-4 md:py-6 flex flex-col">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/applicants" element={<Applicants />} />
          <Route path="/ipo-master" element={<IpoMaster />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={user?.role === 'admin' || user?.role === 'master' ? <AdminPanel /> : <Dashboard />} />
        </Routes>
        
        {/* App Footer */}
        <footer className="mt-auto pt-8 pb-4 text-center border-t border-border/50 mt-12">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
              <span>IPO Tracker Terminal Pro</span>
            </div>
            <div className="flex gap-4 text-xs text-secondary/70">
              <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
              <span>&bull;</span>
              <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
              <span>&bull;</span>
              <a href="https://github.com/dakshit" target="_blank" className="hover:text-emerald-400 transition-colors">Contact Support</a>
            </div>
            <p className="text-[10px] text-secondary/50 mt-1">&copy; 2026 IPO Tracker. All rights reserved.</p>
          </div>
        </footer>
      </main>
      
      {/* Floating APK Download Button */}
      <a 
        href="#"
        onClick={handleInstallClick}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-lg shadow-emerald-500/30 flex items-center gap-2 z-50 transition-all hover:scale-105 active:scale-95"
        title="Install App"
      >
        <Download size={24} />
        <span className="font-bold hidden sm:block">Install App</span>
      </a>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface, #1e293b)',
            color: 'var(--text-primary, #fff)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))'
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
                  <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-md hover:bg-white/10 ml-2 transition-colors">
                    ✕
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </div>
  );
}

export default App;
