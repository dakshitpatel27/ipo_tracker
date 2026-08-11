import React from 'react';
import { ShieldAlert, TrendingDown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getRecordProfit } from '../../utils/profitCalculator';

export default function TaxHarvestingPlanner({ records = [] }) {
  // Realized STCG (Sold)
  const realizedStcg = records
    .filter(r => r.holdingStatus === 'Sold')
    .reduce((sum, r) => sum + getRecordProfit(r), 0);

  // Held IPOs with unrealized loss (Hold)
  const lossHoldings = records
    .filter(r => r.holdingStatus === 'Hold')
    .map(r => {
      const p = getRecordProfit(r);
      return { ...r, unrealizedPnl: p };
    })
    .filter(r => r.unrealizedPnl < 0);

  const totalHarvestableLoss = lossHoldings.reduce((sum, r) => sum + Math.abs(r.unrealizedPnl), 0);
  const potentialTaxSaved = Math.min(realizedStcg > 0 ? realizedStcg : 0, totalHarvestableLoss) * 0.20;

  if (realizedStcg <= 0 || lossHoldings.length === 0) {
    return (
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">STCG Tax Loss Harvesting Assistant</h3>
            <p className="text-xs text-[var(--text-muted)]">No loss harvesting opportunities required for current fiscal year.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141418] border border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Tax Loss Harvesting & STCG Balancer</h3>
            <p className="text-xs text-[var(--text-muted)]">Offset realized STCG (@ 20%) by booking unrealized IPO losses before March 31</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold font-mono">
          Save ~₹{potentialTaxSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Tax
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-[#09090b] p-3 rounded-xl border border-white/5 space-y-1">
          <span className="text-white/50 block">Realized Short-Term Capital Gain:</span>
          <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{realizedStcg.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-white/40 block">Taxable liability @ 20%: ₹{(realizedStcg * 0.20).toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-[#09090b] p-3 rounded-xl border border-white/5 space-y-1">
          <span className="text-white/50 block">Harvestable Loss Available:</span>
          <span className="text-lg font-extrabold text-rose-400 font-mono">₹{totalHarvestableLoss.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-white/40 block">Across {lossHoldings.length} underperforming holding IPOs</span>
        </div>
      </div>

      {/* Recommended Sell Actions */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-bold text-white/80 block">Recommended Tax Loss Sales:</span>
        <div className="space-y-2">
          {lossHoldings.map(item => (
            <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-rose-400" />
                <div>
                  <span className="font-bold text-white block">{item.ipoName}</span>
                  <span className="text-[10px] text-white/50">{item.applicantName} • {item.shares} shares</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-rose-400 block">-₹{Math.abs(item.unrealizedPnl).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Saves ~₹{(Math.abs(item.unrealizedPnl) * 0.20).toFixed(0)} Tax</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
