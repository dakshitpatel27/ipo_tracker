import React from 'react';
import { AlertTriangle, ShieldAlert, Layers, Scale, TrendingUp, Info } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';

const SmeRiskCard = ({ ipo }) => {
  const { maskAmount } = usePrivacy();

  if (!ipo) return null;

  const isSme =
    ipo.category === 'SME' ||
    ipo.type === 'SME' ||
    ipo.isSme === true ||
    (ipo.name && ipo.name.toLowerCase().includes('sme')) ||
    (ipo.symbol && ipo.symbol.toLowerCase().includes('sme'));

  if (!isSme) return null;

  const price = Number(ipo.priceBand?.split('-')?.[1] || ipo.price || ipo.cutOffPrice || 100);
  const lotSize = Number(ipo.lotSize || ipo.lotsize || 1200);
  const minInvestment = price * lotSize;

  return (
    <div className="bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-slate-900/50 border border-amber-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-lg shadow-amber-500/5">
      {/* Risk Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-amber-300">SME IPO Risk & Liquidity Warning</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          High Liquidity Risk
        </span>
      </div>

      {/* Warning Text */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        SME issues trade in fixed lot sizes on NSE Emerge / BSE SME post-listing. You cannot sell single shares; you must trade in full minimum lots of <strong className="text-amber-300">{lotSize} shares</strong>.
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)]">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Min. Lot Capital</div>
          <div className="text-sm font-extrabold text-amber-400">{maskAmount(minInvestment)}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)]">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Trading Lot Size</div>
          <div className="text-sm font-extrabold text-[var(--text-primary)]">{lotSize} Shares</div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Circuit Filter Limit</div>
          <div className="text-sm font-bold text-indigo-400">5% - 20% Daily</div>
        </div>
      </div>

      {/* Risk Notice */}
      <div className="flex items-center gap-2 text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
        <Info size={14} className="shrink-0 text-amber-400" />
        <span>Ensure you have adequate post-listing liquidity before applying for SME allotments.</span>
      </div>
    </div>
  );
};

export default SmeRiskCard;
