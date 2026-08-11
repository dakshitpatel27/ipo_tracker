import React from 'react';
import { TrendingUp, BarChart2, ShieldAlert, Award } from 'lucide-react';

export default function BenchmarkRadar({ records = [] }) {
  const totalInvested = records.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalProfit = records.reduce((s, r) => s + (parseFloat(r.profit) || 0), 0);
  const portfolioYield = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

  // Static market benchmark benchmarks for comparison
  const nifty50Return = 14.2;
  const bseSmeIndexReturn = 38.6;

  const smeRecords = records.filter(r => (r.quota || '').toLowerCase().includes('sme') || (r.type || '').toLowerCase().includes('sme'));
  const mainboardRecords = records.filter(r => !smeRecords.includes(r));

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">SME vs Mainboard Benchmark Radar</h3>
            <p className="text-xs text-[var(--text-muted)]">Portfolio return comparative performance against BSE SME Index & Nifty 50</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono">
          Portfolio Yield: {portfolioYield}%
        </span>
      </div>

      {/* Benchmark Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#09090b] p-3.5 rounded-xl border border-indigo-500/20 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Your Portfolio Return</span>
          <div className="text-xl font-extrabold text-white font-mono">{portfolioYield}%</div>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, parseFloat(portfolioYield)))}%` }} />
          </div>
        </div>

        <div className="bg-[#09090b] p-3.5 rounded-xl border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">BSE SME Index (Benchmark)</span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">+{bseSmeIndexReturn}%</div>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${bseSmeIndexReturn}%` }} />
          </div>
        </div>

        <div className="bg-[#09090b] p-3.5 rounded-xl border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Nifty 50 Index</span>
          <div className="text-xl font-extrabold text-blue-400 font-mono">+{nifty50Return}%</div>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${nifty50Return * 2}%` }} />
          </div>
        </div>
      </div>

      {/* Liquidity Risk Indicator */}
      <div className="p-3 bg-[#09090b] rounded-xl border border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-400" />
          <span className="text-white/80 font-medium">SME Liquidity Risk Index:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">{smeRecords.length} SME Holdings</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
            Moderate Lot-Depth Risk
          </span>
        </div>
      </div>
    </div>
  );
}
