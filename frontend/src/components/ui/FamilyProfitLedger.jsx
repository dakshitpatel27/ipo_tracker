import React from 'react';
import { Users, DollarSign, CheckCircle2, ArrowRight } from 'lucide-react';
import { getRecordProfit } from '../../utils/profitCalculator';

export default function FamilyProfitLedger({ records = [], applicants = [] }) {
  const familyStats = (applicants || []).map(app => {
    const appRecords = records.filter(r => r.applicantName === app.name);
    const totalInvested = appRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const grossProfit = appRecords.reduce((sum, r) => sum + getRecordProfit(r), 0);
    const commPct = parseFloat(app.commissionPct) || 0;
    const commissionShare = grossProfit > 0 ? grossProfit * (commPct / 100) : 0;
    const netReturnToPrimary = grossProfit - commissionShare;

    return {
      name: app.name,
      pan: app.pan,
      commPct,
      grossProfit,
      commissionShare,
      netReturnToPrimary
    };
  });

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Family Internal Profit Settlement Ledger</h3>
            <p className="text-xs text-[var(--text-muted)]">Calculates internal family commission sharing and net return payouts</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {familyStats.map(item => (
          <div key={item.name} className="p-3 bg-[#09090b] border border-white/5 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">{item.name} ({item.pan || 'PAN N/A'})</span>
              <span className="text-[10px] text-emerald-400 font-semibold">{item.commPct}% Agreed Commission Share</span>
            </div>
            <div className="text-right font-mono">
              <span className="text-white block font-bold">Gross P&L: ₹{item.grossProfit.toLocaleString('en-IN')}</span>
              {item.commissionShare > 0 && (
                <span className="text-amber-400 block text-[10px] font-semibold">Comm Payout: ₹{item.commissionShare.toFixed(0)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
