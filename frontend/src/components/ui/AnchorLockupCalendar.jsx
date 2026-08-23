import React from 'react';
import { Calendar, Lock, Unlock, ShieldAlert } from 'lucide-react';

export default function AnchorLockupCalendar({ ipoName = '', listingDate }) {
  const listDateObj = listingDate ? new Date(listingDate) : new Date();

  // 30-Day Lock-in Expiry (50% anchor shares released)
  const lockup30 = new Date(listDateObj);
  lockup30.setDate(lockup30.getDate() + 30);

  // 90-Day Lock-in Expiry (Remaining 50% anchor shares released)
  const lockup90 = new Date(listDateObj);
  lockup90.setDate(lockup90.getDate() + 90);

  const today = new Date();
  const daysTo30 = Math.ceil((lockup30 - today) / (1000 * 60 * 60 * 24));
  const daysTo90 = Math.ceil((lockup90 - today) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
          <Lock size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Anchor Investor Lock-in Expiry Monitor</h3>
          <p className="text-xs text-[var(--text-muted)]">Tracks 30-day and 90-day SEBI anchor lock-in release dates for {ipoName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-[#09090b] p-3.5 rounded-xl border border-amber-500/20 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">30-Day Lock-in Release (50% Anchor Shares)</span>
            <Unlock size={14} className="text-amber-400" />
          </div>
          <div className="text-sm font-extrabold text-white font-mono">{lockup30.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="text-[10px] text-amber-300/70 font-semibold">
            {daysTo30 > 0 ? `Releases in ${daysTo30} days` : 'Released (Potential supply pressure)'}
          </div>
        </div>

        <div className="bg-[#09090b] p-3.5 rounded-xl border border-indigo-500/20 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">90-Day Lock-in Release (100% Anchor Shares)</span>
            <Unlock size={14} className="text-indigo-400" />
          </div>
          <div className="text-sm font-extrabold text-white font-mono">{lockup90.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="text-[10px] text-indigo-300/70 font-semibold">
            {daysTo90 > 0 ? `Releases in ${daysTo90} days` : 'Full Lock-in Expired'}
          </div>
        </div>
      </div>
    </div>
  );
}
