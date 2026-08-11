import React, { useState } from 'react';
import { DollarSign, Tag, TrendingUp, Handshake } from 'lucide-react';

export default function KostakCalculator() {
  const [kostakRate, setKostakRate] = useState('500');
  const [saudaRate, setSaudaRate] = useState('4500');
  const [applicationsCount, setApplicationsCount] = useState('5');

  const kostak = parseFloat(kostakRate) || 0;
  const sauda = parseFloat(saudaRate) || 0;
  const N = parseInt(applicationsCount) || 1;

  const totalKostakReturn = kostak * N;
  const totalSaudaReturn = sauda * N;

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
          <Handshake size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Kostak & Subject-to-Sauda Calculator</h3>
          <p className="text-xs text-[var(--text-muted)]">Calculate guaranteed return deals before listing across family applications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-white/50 mb-1">Kostak Rate / Application (₹)</label>
          <input
            type="number"
            value={kostakRate}
            onChange={e => setKostakRate(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Subject-to-Sauda Rate / Lot (₹)</label>
          <input
            type="number"
            value={saudaRate}
            onChange={e => setSaudaRate(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Family Applications (N)</label>
          <input
            type="number"
            value={applicationsCount}
            onChange={e => setApplicationsCount(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
        <div className="bg-[#09090b] p-3.5 rounded-xl border border-purple-500/20">
          <span className="text-purple-300 font-semibold block">Total Kostak Income (Guaranteed):</span>
          <span className="text-xl font-extrabold text-purple-400 font-mono mt-1 block">
            ₹{totalKostakReturn.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-white/40 block mt-0.5">Regardless of allotment outcome</span>
        </div>

        <div className="bg-[#09090b] p-3.5 rounded-xl border border-emerald-500/20">
          <span className="text-emerald-300 font-semibold block">Total Subject-to-Sauda Income:</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">
            ₹{totalSaudaReturn.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-white/40 block mt-0.5">Payable only upon allotment</span>
        </div>
      </div>
    </div>
  );
}
