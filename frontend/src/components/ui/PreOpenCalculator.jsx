import React, { useState } from 'react';
import { Calculator, Copy, Check, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreOpenCalculator({ issuePrice = 100, gmp = 30, lotSize = 15 }) {
  const [indicativeGmp, setIndicativeGmp] = useState(String(gmp));
  const [copied, setCopied] = useState(false);

  const price = parseFloat(issuePrice) || 100;
  const gmpVal = parseFloat(indicativeGmp) || 0;
  const lot = parseInt(lotSize) || 1;

  // Expected Pre-Open Listing Price Range (±5% buffer)
  const estListingPrice = price + gmpVal;
  const recommendedLimitLow = (estListingPrice * 0.96).toFixed(1);
  const recommendedLimitHigh = (estListingPrice * 1.04).toFixed(1);
  const totalGain = gmpVal * lot;

  const orderString = `SELL ${lot} SHARES @ LIMIT ₹${recommendedLimitHigh} (PRE-OPEN 9:00-9:45 AM)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(orderString);
    setCopied(true);
    toast.success('Pre-Open Order parameters copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#141418] border border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
          <Calculator size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Pre-Open Session Order Calculator (9:00 - 9:45 AM)</h3>
          <p className="text-xs text-[var(--text-muted)]">Calculates optimal limit order prices for pre-open listing discovery</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-white/50 mb-1">Issue Price (₹)</label>
          <input
            type="number"
            value={price}
            readOnly
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white opacity-70"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Live GMP (₹)</label>
          <input
            type="number"
            value={indicativeGmp}
            onChange={e => setIndicativeGmp(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Lot Size (Shares)</label>
          <input
            type="number"
            value={lot}
            readOnly
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-white opacity-70"
          />
        </div>
      </div>

      {/* Pre-Open Recommendations */}
      <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
        <div className="bg-[#09090b] p-3 rounded-xl border border-emerald-500/20">
          <span className="text-white/50 block">Est. Pre-Open Match Price:</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">₹{estListingPrice.toFixed(1)}</span>
          <span className="text-[10px] text-emerald-300/70 block mt-0.5">+{( (gmpVal/price)*100 ).toFixed(1)}% Listing Gain</span>
        </div>

        <div className="bg-[#09090b] p-3 rounded-xl border border-indigo-500/20">
          <span className="text-white/50 block">Recommended Pre-Open Limit Range:</span>
          <span className="text-sm font-extrabold text-indigo-400 font-mono">₹{recommendedLimitLow} – ₹{recommendedLimitHigh}</span>
          <span className="text-[10px] text-indigo-300/70 block mt-0.5">Captures max pre-open demand depth</span>
        </div>
      </div>

      {/* Copy Order String */}
      <div className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-xl text-xs">
        <span className="font-mono text-white/80 truncate mr-2">{orderString}</span>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1 shrink-0"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy Parameters'}
        </button>
      </div>
    </div>
  );
}
