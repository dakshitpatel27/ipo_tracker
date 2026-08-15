import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WifiOff, Wifi, RefreshCw, Layers, Wallet, CreditCard, Users, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { syncOfflineMutations } from '../api';
import toast from 'react-hot-toast';

export default function OfflinePage({ onContinueToApp }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [queuedMutations, setQueuedMutations] = useState(0);
  const [syncedCount, setSyncedCount] = useState(null);

  useEffect(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
      setQueuedMutations(Array.isArray(queue) ? queue.length : 0);
    } catch (e) {}

    const handleOnline = async () => {
      setIsOnline(true);
      const count = await syncOfflineMutations();
      setSyncedCount(count);
      toast.success('⚡ Connection Restored! Offline updates synced to cloud.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncedCount(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch('/api/settings/public', { signal: controller.signal });
      clearTimeout(timeoutId);
      setIsOnline(true);
      const count = await syncOfflineMutations();
      setSyncedCount(count);
      toast.success('Connection restored successfully!');
      if (onContinueToApp) onContinueToApp();
    } catch (e) {
      if (!navigator.onLine) {
        setIsOnline(false);
        toast.error('Still offline. Please check your Wi-Fi / Data connection.');
      } else {
        toast.success('Network active!');
        setIsOnline(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const quickLinks = [
    { title: 'Cached Dashboard', path: '/', icon: Layers, desc: 'View offline portfolio metrics' },
    { title: 'Offline Bids & Records', path: '/records', icon: Layers, desc: 'Manage local application entries' },
    { title: 'Offline Bank Accounts', path: '/accounts', icon: Wallet, desc: 'Passbook balances & ASBA' },
    { title: 'Expense Tracker', path: '/expenses', icon: CreditCard, desc: 'Personal expenses & budgets' },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#09090b] cyber-grid-bg flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-y-auto select-none">
      {/* Top Brand Header */}
      <div className="w-full flex items-center justify-between sm:justify-start gap-2.5 mb-4 sm:mb-0 sm:absolute sm:top-6 sm:left-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 border border-white/10">
            <TrendingUp size={18} />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">IPO Tracker</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl w-full text-center space-y-6 sm:space-y-8 my-auto py-4 sm:py-8"
      >
        <AnimatePresence mode="wait">
          {!isOnline ? (
            /* OFFLINE STATE */
            <motion.div
              key="offline-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 sm:space-y-6"
            >
              {/* Animated Glowing Offline Hero */}
              <div className="relative flex flex-col items-center justify-center">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 rounded-full blur-3xl opacity-70 animate-pulse" />
                
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl backdrop-blur-md mb-3 shrink-0">
                  <WifiOff size={36} className="sm:hidden text-amber-400 animate-pulse" />
                  <WifiOff size={48} className="hidden sm:block text-amber-400 animate-pulse" />
                </div>

                <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono uppercase font-bold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  No Internet Connection
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 sm:space-y-2 max-w-lg mx-auto px-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Operating in Offline Mode
                </h1>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  Your device is currently disconnected from the network. You can safely browse your locally cached portfolio records and queue updates offline.
                </p>
              </div>

              {/* Offline Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-w-lg mx-auto text-left text-xs">
                <div className="p-3 sm:p-3.5 rounded-xl bg-surface-2 border border-border flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Local Cache Active</span>
                    <span className="text-[11px] text-secondary">Viewing saved portfolio records</span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-surface-2 border border-border flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Queued Mutations</span>
                    <span className="text-[11px] text-indigo-300 font-mono font-bold">{queuedMutations} update(s) ready to sync</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md mx-auto pt-1">
                <button
                  onClick={handleRetryConnection}
                  disabled={isChecking}
                  className="w-full sm:w-auto btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 bg-amber-600 hover:bg-amber-500 border-amber-500"
                >
                  <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
                  {isChecking ? 'Checking Network...' : 'Retry Connection'}
                </button>

                {onContinueToApp && (
                  <button
                    onClick={onContinueToApp}
                    className="w-full sm:w-auto btn-outline py-2.5 px-5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    Continue to Cached App
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            /* RESTORED CONNECTION STATE */
            <motion.div
              key="restored-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-5 sm:space-y-6"
            >
              {/* Animated Glowing Emerald Hero */}
              <div className="relative flex flex-col items-center justify-center">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-emerald-500/30 rounded-full blur-3xl opacity-80 animate-pulse" />
                
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-2xl backdrop-blur-md mb-3 shrink-0">
                  <Wifi size={36} className="sm:hidden text-emerald-400" />
                  <Wifi size={48} className="hidden sm:block text-emerald-400" />
                </div>

                <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Connection Restored
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 sm:space-y-2 max-w-lg mx-auto px-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Back Online & Synced!
                </h1>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  Your internet connection is active. All local offline changes have been automatically synchronized with the cloud server.
                </p>
              </div>

              {/* Synced Info Pill */}
              {syncedCount !== null && syncedCount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 max-w-md mx-auto text-xs text-emerald-300 flex items-center justify-between font-mono font-bold">
                  <span>Synced Offline Items:</span>
                  <span className="text-white bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {syncedCount} Item(s) Uploaded
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md mx-auto pt-1">
                <button
                  onClick={() => {
                    if (onContinueToApp) onContinueToApp();
                    else navigate('/');
                  }}
                  className="w-full sm:w-auto btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                >
                  <CheckCircle2 size={16} /> Return to IPO Tracker
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Navigation Cards */}
        <div className="pt-6 border-t border-border/60">
          <p className="text-[11px] sm:text-xs font-bold text-secondary uppercase tracking-wider mb-3 sm:mb-4">
            Browse Locally Cached Workspace Modules
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (onContinueToApp) onContinueToApp();
                    navigate(item.path);
                  }}
                  className="p-3 sm:p-3.5 rounded-xl bg-surface-2 border border-border hover:border-amber-500/40 hover:bg-surface-1 transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-1 sm:mb-1.5">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                      <Icon size={16} />
                    </div>
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="h-2 shrink-0 sm:hidden" />
    </div>
  );
}
