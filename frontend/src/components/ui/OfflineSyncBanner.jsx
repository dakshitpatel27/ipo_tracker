import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineSyncBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="animate-pulse shrink-0" />
            <span>Offline Mode Active — You are browsing cached portfolio records.</span>
          </div>
          <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
            Local Cache Active
          </span>
        </motion.div>
      )}

      {isOnline && showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-emerald-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50"
        >
          <div className="flex items-center gap-2">
            <Wifi size={16} className="shrink-0" />
            <span>Connection Restored! Data automatically synced with server.</span>
          </div>
          <RefreshCw size={14} className="animate-spin text-black/70" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineSyncBanner;
