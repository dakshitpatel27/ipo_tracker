import React, { useState } from 'react';
import { Sparkles, TrendingUp, Target, ShieldAlert, Award, ChevronRight } from 'lucide-react';

export default function AllotmentPredictor({ ipoName = 'Sample IPO', retailSub = 12.5, qibSub = 45.2, niiSub = 28.0, issuePrice = 500, expectedGmp = 150 }) {
  const [lots, setLots] = useState(1);

  // Math probability calculation
  const retailOdds = retailSub > 0 ? (100 / retailSub).toFixed(2) : 100;
  const multiLotOdds = retailSub > 0 ? Math.min((1 - Math.pow(1 - (1 / retailSub), Math.min(lots, 1))) * 100, 99.9).toFixed(2) : 100;
  
  // Listing Day Strategy Math
  const numIssuePrice = parseFloat(issuePrice) || 500;
  const numGmp = parseFloat(expectedGmp) || 150;
  const estListingPrice = numIssuePrice + numGmp;
  const expectedGainPercent = ((numGmp / numIssuePrice) * 100).toFixed(1);

  // Strategy triggers
  const stopLossPrice = (estListingPrice * 0.92).toFixed(1); // 8% trailing stop
  const targetPrice = (estListingPrice * 1.15).toFixed(1);  // 15% upside target

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-6 space-y-6 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">AI Allotment Probability & Exit Strategy</h3>
            <p className="text-xs text-zinc-400">{ipoName} • Subscription Multiples & Target Signals</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
          {expectedGainPercent}% Est. Gain
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Allotment Odds Predictor */}
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Award size={14} /> Retail Allotment Probability
          </h4>
          
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-zinc-400">Retail Demand</span>
            <span className="font-mono text-sm font-bold text-white">{retailSub}x Oversubscribed</span>
          </div>

          <div className="bg-black/40 border border-[#27272a] rounded-lg p-4 text-center space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">Estimated Win Odds (1 Application)</span>
            <div className="text-3xl font-black font-mono text-emerald-400">{retailOdds}%</div>
            <span className="text-[11px] text-zinc-500 block">1 in ~{Math.round(retailSub)} applications allotted</span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-zinc-400">Simulate Applications across Family Members ({lots} Lots)</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={lots} 
              onChange={e => setLots(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-zinc-800"
            />
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>{lots} Family App(s)</span>
              <span className="text-indigo-300 font-bold">Cumulative Odds: {multiLotOdds}%</span>
            </div>
          </div>
        </div>

        {/* Section 2: Listing Day Strategy Assistant */}
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Target size={14} /> 9:45 AM Pre-Open Exit Strategy
          </h4>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-black/30 border border-[#27272a]">
              <span className="text-zinc-400 text-[10px] block font-sans">Est. Listing Price</span>
              <span className="text-white font-bold text-sm">₹{estListingPrice}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/30 border border-[#27272a]">
              <span className="text-zinc-400 text-[10px] block font-sans">Issue Price</span>
              <span className="text-zinc-300 font-bold text-sm">₹{numIssuePrice}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <span className="flex items-center gap-1.5"><ShieldAlert size={14} /> Trailing Stop-Loss</span>
              <span className="font-mono font-bold">₹{stopLossPrice} (-8%)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="flex items-center gap-1.5"><TrendingUp size={14} /> Profit Target Trigger</span>
              <span className="font-mono font-bold">₹{targetPrice} (+15%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
