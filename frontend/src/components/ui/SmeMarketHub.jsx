import React, { useState } from 'react';
import { Layers, AlertTriangle, DollarSign, Calculator, RefreshCw, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const SmeMarketHub = () => {
  const [smeLotSize, setSmeLotSize] = useState(1200);
  const [smePrice, setSmePrice] = useState(115);

  const minInvestment = smeLotSize * smePrice;

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" /> SME IPO Market Hub & Risk Scorecard
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Dedicated analytics for NSE Emerge & BSE SME platform listings.
          </p>
        </div>
        <span className="badge badge-amber flex items-center gap-1">
          <ShieldAlert size={12} /> High Risk / Higher Reward
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SME Cost Calculator */}
        <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calculator size={14} className="text-indigo-400" /> SME Minimum Lot Cost Calculator
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-secondary mb-1">SME Lot Size (Shares)</label>
              <input
                type="number"
                value={smeLotSize}
                onChange={e => setSmeLotSize(Number(e.target.value))}
                className="input-field py-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-secondary mb-1">Issue Price (₹)</label>
              <input
                type="number"
                value={smePrice}
                onChange={e => setSmePrice(Number(e.target.value))}
                className="input-field py-1 font-mono text-xs"
              />
            </div>
          </div>
          <div className="p-3 bg-black/40 border border-border rounded-lg flex justify-between items-center text-xs">
            <span className="text-secondary font-semibold">Min Application Outlay:</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">₹{minInvestment.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* SME Liquidity Risk Scorecard */}
        <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-2 text-xs">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} /> SME Trading Liquidity Guidelines
          </span>
          <ul className="space-y-1.5 text-secondary pl-4 list-disc">
            <li>SME shares trade only in <strong>full lot sizes</strong> ({smeLotSize} shares/lot). Partial lot sales are prohibited.</li>
            <li>Market Maker inventory is held for 3 years to support bid/ask spreads.</li>
            <li>Lower daily trading volume compared to Mainboard IPOs.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SmeMarketHub;
