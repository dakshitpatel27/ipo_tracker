import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { syncOfflineMutations } from '../../api';
import toast from 'react-hot-toast';

const OfflineSyncBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowReconnected(true);

      const count = await syncOfflineMutations();
      if (count > 0) {
        setSyncedCount(count);
        toast.success(`⚡ Internet connection restored! Automatically synced ${count} offline item(s) to server.`);
      }

      const timer = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      toast.error('📶 Internet Connection Lost! Operating in Offline Mode with local cache.', { duration: 4000 });
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
          className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-amber-600"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="animate-pulse shrink-0 text-black" />
            <span>Offline Mode Active — You are browsing cached portfolio records & local queue.</span>
          </div>
          <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-black tracking-wider">
            Local Cache Active
          </span>
        </motion.div>
      )}

      {isOnline && showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-emerald-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-emerald-600"
        >
          <div className="flex items-center gap-2">
            <Wifi size={16} className="shrink-0" />
            <span>Connection Restored! {syncedCount > 0 ? `Synced ${syncedCount} offline record(s) with cloud server.` : 'Data synced with server.'}</span>
          </div>
          <RefreshCw size={14} className="animate-spin text-black/70" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineSyncBanner;
