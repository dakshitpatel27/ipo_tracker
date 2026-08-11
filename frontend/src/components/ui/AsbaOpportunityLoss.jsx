import React, { useState } from 'react';
import { DollarSign, Landmark, TrendingUp } from 'lucide-react';

export default function AsbaOpportunityLoss() {
  const [blockedCapital, setBlockedCapital] = useState('75000');
  const [interestRate, setInterestRate] = useState('7.25'); // SB / Liquid fund rate
  const [blockedDays, setBlockedDays] = useState('4');

  const capital = parseFloat(blockedCapital) || 0;
  const rate = parseFloat(interestRate) || 0;
  const days = parseInt(blockedDays) || 1;

  // Simple interest earned on savings account while funds are ASBA blocked
  const interestEarned = (capital * (rate / 100) * (days / 365)).toFixed(2);

  return (
    <div className="bg-[#141418] border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
          <Landmark size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">ASBA Interest Opportunity Loss / Earned Calculator</h3>
          <p className="text-xs text-[var(--text-muted)]">Calculates savings account interest earned during funds blockage (RBI ASBA mandate rule)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-white/50 mb-1">Total Blocked Capital (₹)</label>
          <input
            type="number"
            value={blockedCapital}
            onChange={e => setBlockedCapital(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Bank SB Rate / Liquid Yield (%)</label>
          <input
            type="number"
            step="0.05"
            value={interestRate}
            onChange={e => setInterestRate(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Blocked Days (N)</label>
          <input
            type="number"
            value={blockedDays}
            onChange={e => setBlockedDays(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-[#09090b] p-3.5 rounded-xl border border-emerald-500/20 flex items-center justify-between text-xs">
        <div>
          <span className="text-white/50 block">Interest Earned While Funds Blocked:</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">+₹{interestEarned}</span>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
          ASBA Interest Advantage (RBI Compliant)
        </span>
      </div>
    </div>
  );
}
