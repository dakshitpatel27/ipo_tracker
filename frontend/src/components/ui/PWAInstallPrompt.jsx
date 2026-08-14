import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user snoozed prompt
      const snoozed = localStorage.getItem('ipo_pwa_prompt_snoozed');
      if (!snoozed || Date.now() - Number(snoozed) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ipo_pwa_prompt_snoozed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#121218] border border-indigo-500/30 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                Install IPO Tracker App
                <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                  <Sparkles size={9} /> App
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">Fast offline access & instant allotment updates</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-secondary hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
          >
            <Download size={14} /> Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="btn-outline text-xs px-3 py-2"
          >
            Snooze
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
