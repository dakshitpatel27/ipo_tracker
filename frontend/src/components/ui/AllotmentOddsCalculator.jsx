import React, { useState } from 'react';
import { Calculator, Percent, Users, TrendingUp } from 'lucide-react';

export default function AllotmentOddsCalculator() {
  const [subRatio, setSubRatio] = useState('15');
  const [numApplications, setNumApplications] = useState('5');
  const [category, setCategory] = useState('Retail');

  const S = Math.max(1, parseFloat(subRatio) || 1);
  const N = Math.max(1, parseInt(numApplications) || 1);

  // Formula: P = 1 - (1 - 1/S)^N
  const pSingle = 1 / S;
  const pNone = Math.pow(1 - pSingle, N);
  const pAtLeastOne = (1 - pNone) * 100;
  const expectedLots = (pSingle * N).toFixed(2);

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
          <Calculator size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Allotment Probability Estimator</h3>
          <p className="text-xs text-[var(--text-muted)]">Calculate mathematical odds of getting at least 1 lot across family accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Quota Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="Retail">Retail (Individual)</option>
            <option value="sHNI">sHNI (Small HNI)</option>
            <option value="bHNI">bHNI (Big HNI)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Subscription Multiple (x)</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={subRatio}
            onChange={e => setSubRatio(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Family Applications (N)</label>
          <input
            type="number"
            min="1"
            value={numApplications}
            onChange={e => setNumApplications(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Result Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
            <Percent size={13} /> Odds of ≥ 1 Lot
          </span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1">
            {pAtLeastOne.toFixed(1)}%
          </span>
          <span className="text-[0.68rem] text-emerald-300/70 mt-1">
            vs {(100 / S).toFixed(1)}% for a single account
          </span>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
            <TrendingUp size={13} /> Expected Allotted Lots
          </span>
          <span className="text-2xl font-extrabold text-indigo-400 mt-1">
            ~{expectedLots}
          </span>
          <span className="text-[0.68rem] text-indigo-300/70 mt-1">
            Expected mean across {N} applications
          </span>
        </div>
      </div>
    </div>
  );
}
