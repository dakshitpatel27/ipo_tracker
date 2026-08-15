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
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gradient-to-r from-amber-950/95 via-[#09090b]/98 to-amber-950/95 backdrop-blur-md text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-2xl sticky top-0 z-50 border-b border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff size={15} className="text-amber-400 shrink-0" />
                <span className="text-white text-xs">
                  <strong className="text-amber-400 font-bold">Offline Mode Active</strong> — Browsing cached portfolio records & local offline queue
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                ⚡ Local Cache Active
              </span>
            </div>
          </motion.div>
        )}

        {isOnline && showReconnected && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gradient-to-r from-emerald-950/95 via-[#09090b]/98 to-emerald-950/95 backdrop-blur-md text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-2xl sticky top-0 z-50 border-b border-emerald-500/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Wifi size={14} />
              </div>
              <span className="text-white text-xs">
                <strong className="text-emerald-400 font-bold">Connection Restored!</strong>{' '}
                {syncedCount > 0
                  ? `Automatically synced ${syncedCount} offline record(s) with cloud server.`
                  : 'Portfolio synced with cloud server.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold hidden sm:inline">Synced</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Offline Status Indicator Badge */}
      {!isOnline && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
          <div className="px-3 py-1.5 rounded-full bg-[#121215]/90 border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <WifiOff size={13} />
            <span>Offline Mode</span>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineSyncBanner;
