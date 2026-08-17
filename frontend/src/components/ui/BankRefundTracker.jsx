import React, { useState } from 'react';
import { Clock, Landmark, AlertCircle, RefreshCw, CheckCircle2, ArrowRight, Wallet, Calendar, ShieldAlert } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';

const BANK_SCHEDULES = [
  {
    name: 'HDFC Bank',
    code: 'HDFC',
    avgUnblockTime: 'Allotment Night (10:00 PM - 2:00 AM)',
    speedRating: 'Fastest',
    speedColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    notes: 'Auto-unblocks mandate within hours of registrar allotment publishing.',
  },
  {
    name: 'ICICI Bank',
    code: 'ICICI',
    avgUnblockTime: 'Allotment Night / Next Morning (8:00 AM)',
    speedRating: 'Fast',
    speedColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    notes: 'Very reliable SMS alerts sent upon mandate revocation.',
  },
  {
    name: 'State Bank of India',
    code: 'SBI',
    avgUnblockTime: 'Day after Allotment (11:00 AM - 4:00 PM)',
    speedRating: 'Moderate',
    speedColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    notes: 'ASBA unblock may take up to 24-48 hours. Check INB portal if delayed.',
  },
  {
    name: 'Axis Bank',
    code: 'AXIS',
    avgUnblockTime: 'Allotment Night (11:30 PM)',
    speedRating: 'Fast',
    speedColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    notes: 'Instant push notification on mobile banking app.',
  },
  {
    name: 'Kotak Mahindra Bank',
    code: 'KOTAK',
    avgUnblockTime: 'Next Morning (9:00 AM)',
    speedRating: 'Fast',
    speedColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    notes: '811 accounts unblock mandates seamlessly.',
  },
  {
    name: 'Bank of Baroda / PNB',
    code: 'BOB_PNB',
    avgUnblockTime: '48 Hours Post-Allotment',
    speedRating: 'Slower',
    speedColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    notes: 'If unblock is pending post-listing, raise grievance with UPI app.',
  },
];

const BankRefundTracker = ({ activeRecords = [] }) => {
  const { maskAmount } = usePrivacy();
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [testAmount, setTestAmount] = useState(15000);
  const [testLots, setTestLots] = useState(1);

  // Filter pending allotment applications
  const pendingApplications = activeRecords.filter(
    (r) => r.status === 'Applied' || r.status === 'Pending' || r.status === 'Submitted'
  );

  const totalBlockedCapital = pendingApplications.reduce(
    (sum, r) => sum + (Number(r.amount) || Number(r.cutOffPrice * r.lotsize) || 15000),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
              <RefreshCw size={24} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Capital Recycling & Refund Tracker</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Live Bank Timelines</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Track ASBA/UPI fund unblocks across Indian banks to reuse liquidity for upcoming IPOs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[var(--surface-3)] px-4 py-2.5 rounded-xl border border-[var(--border)] shrink-0">
            <Wallet size={20} className="text-indigo-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Blocked Liquidity</div>
              <div className="text-sm font-extrabold text-emerald-400">{maskAmount(totalBlockedCapital)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Bank Schedule + Capital Reuse Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bank Unblock Timelines (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Landmark size={17} className="text-indigo-400" />
              Major Indian Banks Refund Speed Guide
            </h3>
            <span className="text-xs text-[var(--text-muted)]">Updated 2026 Batch Cycle</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BANK_SCHEDULES.map((bank) => (
              <div
                key={bank.code}
                onClick={() => setSelectedBank(bank.code)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedBank === bank.code
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-indigo-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-[var(--text-primary)]">{bank.name}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${bank.speedColor}`}>
                    {bank.speedRating}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-medium">
                  <Clock size={13} className="text-indigo-400 shrink-0" />
                  <span>{bank.avgUnblockTime}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{bank.notes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Interactive Capital Reuse Calculator */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Calendar size={17} className="text-emerald-400" />
            Capital Reuse Simulator
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Calculate if unblocked funds from your current IPO will be ready in time for the next IPO opening.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Blocked Amount Per Lot (₹)</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Number of Lots / Accounts</label>
              <input
                type="number"
                min="1"
                max="50"
                value={testLots}
                onChange={(e) => setTestLots(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)]">Total Recycling Capital:</span>
                <span className="font-extrabold text-emerald-400">{maskAmount(testAmount * testLots)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)]">Est. Re-usability Window:</span>
                <span className="font-bold text-indigo-300">Within 24 Hours</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <ShieldAlert size={15} className="shrink-0 mt-0.5" />
              <span>Tip: If your bank delays unblocking post-allotment, submit a quick UPI revoke request via your bank app using your Application Number.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankRefundTracker;
