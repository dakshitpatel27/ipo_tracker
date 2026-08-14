import React, { useState } from 'react';
import { Users, DollarSign, Percent, Calculator, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const FamilyProfitSharingEngine = () => {
  const [totalGrossProfit, setTotalGrossProfit] = useState(85000);
  const [commissionRate, setCommissionRate] = useState(10); // 10% manager fee
  const [asbaInterestCost, setAsbaInterestCost] = useState(1200);
  const [partnerCount, setPartnerCount] = useState(4);

  const managerCommission = (totalGrossProfit * (commissionRate / 100));
  const netPool = Math.max(0, totalGrossProfit - managerCommission - asbaInterestCost);
  const perPartnerShare = partnerCount > 0 ? (netPool / partnerCount) : 0;

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Users size={16} className="text-indigo-400" /> Family Office Profit Sharing & Distribution Engine
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Auto-calculate net partner payouts after deducting application costs, interest, and manager commissions.
          </p>
        </div>
        <span className="badge badge-emerald flex items-center gap-1">
          <ShieldCheck size={12} /> Auto Distribution
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-secondary font-semibold mb-1">Total Listing Gross Profit (₹)</label>
          <input
            type="number"
            value={totalGrossProfit}
            onChange={e => setTotalGrossProfit(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-secondary font-semibold mb-1">Manager Commission (%)</label>
          <input
            type="number"
            value={commissionRate}
            onChange={e => setCommissionRate(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-secondary font-semibold mb-1">ASBA Interest / Expenses (₹)</label>
          <input
            type="number"
            value={asbaInterestCost}
            onChange={e => setAsbaInterestCost(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-secondary font-semibold mb-1">Number of Partners</label>
          <input
            type="number"
            value={partnerCount}
            onChange={e => setPartnerCount(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3 bg-surface-2 border border-border rounded-xl">
          <span className="text-[10px] text-secondary font-bold uppercase block">Manager Commission ({commissionRate}%)</span>
          <span className="text-base font-bold text-amber-400 font-mono">₹{managerCommission.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-surface-2 border border-border rounded-xl">
          <span className="text-[10px] text-secondary font-bold uppercase block">Net Distributable Pool</span>
          <span className="text-base font-bold text-indigo-300 font-mono">₹{netPool.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <span className="text-[10px] text-emerald-300 font-bold uppercase block">Payout Per Partner ({partnerCount})</span>
          <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{Math.round(perPartnerShare).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

export default FamilyProfitSharingEngine;
