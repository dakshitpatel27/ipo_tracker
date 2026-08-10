import React, { useState } from 'react';
import { X, Calculator, ArrowUpRight, DollarSign, PieChart, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvestmentCalculator({ isOpen, onClose, defaultPrice = 100, defaultLotSize = 100, defaultGmp = 20 }) {
  const [price, setPrice] = useState(defaultPrice);
  const [lotSize, setLotSize] = useState(defaultLotSize);
  const [lotsCount, setLotsCount] = useState(1);
  const [gmp, setGmp] = useState(defaultGmp);
  const [dpCharges, setDpCharges] = useState(15.9); // standard DP charge

  if (!isOpen) return null;

  const totalShares = lotSize * lotsCount;
  const totalInvestment = price * totalShares;
  const expectedListingPrice = parseFloat(price) + parseFloat(gmp || 0);
  const grossProfit = gmp * totalShares;

  // Standard Indian Market Statutory Charges calculation
  const stt = grossProfit > 0 ? (totalInvestment + grossProfit) * 0.001 : 0; // 0.1% on delivery/sell
  const stampDuty = totalInvestment * 0.00015; // 0.015%
  const exchangeCharges = totalInvestment * 0.0000345; // ~0.00345%
  const sebiFees = totalInvestment * 0.000001;
  const gst = (exchangeCharges + sebiFees + parseFloat(dpCharges)) * 0.18; // 18% GST
  const totalCharges = stt + stampDuty + exchangeCharges + sebiFees + parseFloat(dpCharges) + gst;

  const netProfit = grossProfit - totalCharges;
  const returnPercentage = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100).toFixed(2) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-xs"
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-md bg-[#0f0f12] border-l border-[#27272a] shadow-2xl h-full flex flex-col z-10 text-[#f4f4f5]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">IPO Profit Calculator</h3>
                <p className="text-xs text-[var(--text-secondary)]">Simulate returns with exact statutory charges</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Controls */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Price Per Share */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-[var(--text-secondary)]">Issue Price (Cutoff)</span>
                <span className="font-mono text-white font-semibold">₹{price}</span>
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="input-field font-mono"
              />
            </div>

            {/* Lot Size */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-[var(--text-secondary)]">Lot Size (Shares per lot)</span>
                <span className="font-mono text-white font-semibold">{lotSize} shares</span>
              </div>
              <input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(parseInt(e.target.value) || 1)}
                className="input-field font-mono"
              />
            </div>

            {/* Lots Count Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-[var(--text-secondary)]">Number of Lots</span>
                <span className="font-mono text-indigo-400 font-bold">{lotsCount} {lotsCount > 1 ? 'Lots' : 'Lot'} ({totalShares} shares)</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={lotsCount}
                onChange={(e) => setLotsCount(parseInt(e.target.value) || 1)}
                className="w-full accent-indigo-500 bg-[#27272a] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Expected GMP */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-[var(--text-secondary)]">Expected GMP Premium (₹)</span>
                <span className="font-mono text-emerald-400 font-semibold">₹{gmp} (Est. Listing: ₹{expectedListingPrice})</span>
              </div>
              <input
                type="number"
                value={gmp}
                onChange={(e) => setGmp(parseFloat(e.target.value) || 0)}
                className="input-field font-mono text-emerald-400 font-semibold"
              />
            </div>

            {/* Charges Breakdown Accordion */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3 font-mono text-xs">
              <div className="text-xs font-sans font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[#27272a] pb-2">
                Calculation Output
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Total Capital Needed:</span>
                <span className="text-white font-bold">₹{totalInvestment.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Est. Gross Profit:</span>
                <span className="text-emerald-400 font-semibold">+₹{grossProfit.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Total Statutory Charges (STT/DP/GST):</span>
                <span className="text-red-400">-₹{totalCharges.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-[#27272a] flex justify-between items-baseline font-sans">
                <div>
                  <span className="text-xs font-bold text-white block">Estimated Net Profit</span>
                  <span className="text-[0.68rem] text-[var(--text-muted)]">After all taxes & charges</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-lg font-extrabold block ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netProfit >= 0 ? `+₹${netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `-₹${Math.abs(netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold">+{returnPercentage}% ROI</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
