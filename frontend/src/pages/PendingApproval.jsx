import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, LogOut, Clock, CheckCircle2, Mail, User, Sparkles, ShieldCheck, ArrowRight, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';

const PendingApproval = ({ pendingUser, onApproved }) => {
  const { logout, setUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date().toLocaleTimeString());

  const checkStatus = async (showToastMessage = true) => {
    setChecking(true);
    try {
      const meRes = await api.getMe();
      setLastChecked(new Date().toLocaleTimeString());
      if (meRes?.user) {
        if (meRes.user.status === 'approved') {
          toast.success('🎉 Account approved by Admin! Opening Dashboard...');
          if (onApproved) onApproved(meRes.user);
          else {
            setUser(meRes.user);
            localStorage.setItem('ipo_user', JSON.stringify(meRes.user));
          }
          return;
        } else if (showToastMessage) {
          toast.custom((t) => (
            <div className="bg-zinc-900 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
              <Clock size={16} className="animate-spin text-amber-400 shrink-0" />
              <span>Status: Account is awaiting Master Admin approval.</span>
            </div>
          ));
        }
      }
    } catch (e) {
      if (showToastMessage) {
        toast.error(e.message || 'Status check failed. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Auto-poll approval status every 6 seconds
    const interval = setInterval(() => {
      checkStatus(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#08080c] text-white flex flex-col justify-between p-6 sm:p-10 md:p-12 overflow-y-auto font-sans select-none custom-scrollbar">
      {/* Background Animated Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/10 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[0%] right-[5%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-amber-500/20 border border-amber-500/30" />
          <div>
            <div className="font-extrabold text-white text-base tracking-tight">IPO Tracker</div>
            <div className="text-[0.65rem] text-amber-400 font-bold tracking-widest uppercase">Portfolio Pro</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ⌛ Admin Approval Pending
          </span>
        </div>
      </div>

      {/* Center Main Content */}
      <div className="relative z-10 max-w-2xl mx-auto w-full my-auto py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-8 text-center"
        >
          {/* Animated Hero Badge Icon */}
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-indigo-500/10 text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.25)]">
              <Clock size={48} className="animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black font-extrabold p-1.5 rounded-xl border border-black text-xs flex items-center justify-center shadow-lg">
              <ShieldAlert size={14} />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Account Registration Under Review
            </h1>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Your account request has been successfully submitted to Master Admin. Full access to your IPO Tracker portfolio dashboard will unlock as soon as your account is approved.
            </p>
          </div>

          {/* Verification Timeline Steps */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between border-b border-white/5 pb-3">
              <span className="flex items-center gap-1.5"><Activity size={14} /> Live Account Status Timeline</span>
              <span className="text-[10px] text-zinc-500 font-mono">Last Checked: {lastChecked}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 text-zinc-300">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span className="font-semibold">Step 1: Account Information Registered</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span className="font-semibold">Step 2: Notification Dispatched to Master Admin</span>
              </div>
              <div className="flex items-center gap-3 text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <Clock size={18} className="text-amber-400 animate-spin shrink-0" />
                <span className="font-bold">Step 3: Master Admin Approval Review (In Progress)</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-500 opacity-60">
                <ShieldCheck size={18} className="shrink-0" />
                <span>Step 4: Full App Access & Portfolio Dashboard</span>
              </div>
            </div>
          </div>

          {/* User Profile Info Card */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <User size={18} />
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase text-zinc-400 font-bold">Registered User</div>
                <div className="font-bold text-white text-sm truncate">{pendingUser?.name || pendingUser?.username || 'New User'}</div>
              </div>
            </div>

            {pendingUser?.email && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Mail size={18} />
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Email Address</div>
                  <div className="font-mono text-zinc-200 text-xs truncate">{pendingUser.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => checkStatus(true)}
              disabled={checking}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Checking Status...' : 'Re-Check Approval Status'}
            </button>

            <button
              onClick={logout}
              className="py-3.5 px-6 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 text-center border-t border-white/10 pt-4 max-w-5xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 gap-2">
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-400" /> Auto-checking approval status every 6 seconds in background.
        </span>
        <span>© 2026 IPO Tracker · All Rights Reserved</span>
      </div>
    </div>
  );
};

export default PendingApproval;
