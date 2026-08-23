import React, { useState, useEffect } from 'react';
import { X, Calculator, ArrowUpRight, DollarSign, PieChart, Info, Sparkles, CheckCircle2, Sliders, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api';

export default function InvestmentCalculator({
  isOpen,
  onClose,
  selectedIpo = null,
  defaultPrice = 100,
  defaultLotSize = 15,
  defaultGmp = 20
}) {
  const [liveIpos, setLiveIpos] = useState([]);
  const [activeIpo, setActiveIpo] = useState(selectedIpo);
  const [price, setPrice] = useState(defaultPrice);
  const [lotSize, setLotSize] = useState(defaultLotSize);
  const [lotsCount, setLotsCount] = useState(1);
  const [gmp, setGmp] = useState(defaultGmp);
  const [gmpSource, setGmpSource] = useState('Official Live Trend');
  const [dpCharges, setDpCharges] = useState(15.9);

  useEffect(() => {
    if (!isOpen) return;
    async function loadIpos() {
      try {
        const list = await api.getLiveIpos();
        if (list && list.length > 0) {
          setLiveIpos(list);
        }
      } catch (e) {
        console.error('Calculator live IPO load failed:', e);
      }
    }
    loadIpos();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedIpo) {
      setActiveIpo(selectedIpo);
      populateFromIpo(selectedIpo);
    } else {
      setPrice(defaultPrice);
      setLotSize(defaultLotSize);
      setGmp(defaultGmp || 20);
      setGmpSource('Preset');
    }
  }, [isOpen, selectedIpo, defaultPrice, defaultLotSize, defaultGmp]);

  const populateFromIpo = (ipo) => {
    if (!ipo) return;
    const priceStr = ipo.priceRange || ipo.priceBand || ipo.price || '';
    const parts = String(priceStr).split('–');
    const cutoff = parseFloat(parts[parts.length - 1].replace(/[^\d.]/g, '')) || defaultPrice || 100;

    const lotStr = ipo.lotSize || ipo.lot;
    const lot = lotStr ? parseInt(String(lotStr).replace(/[^\d]/g, '')) : defaultLotSize || 15;

    const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp || ipo.gmp || '';
    let liveGmp = parseFloat(String(gmpStr).replace(/[^\d.-]/g, ''));
    let gmpSourceType = 'Official Live Trend';

    if (isNaN(liveGmp) || liveGmp <= 0) {
      if (defaultGmp && defaultGmp > 0) {
        liveGmp = defaultGmp;
        gmpSourceType = 'Card Target';
      } else {
        const subStr = ipo.subscriptionNumbers?.total?.subscription || ipo.subscription || '';
        const subNum = parseFloat(String(subStr).replace(/[^\d.]/g, ''));
        if (!isNaN(subNum) && subNum > 0) {
          const estGainPct = Math.min(80, Math.max(15, Math.round(subNum * 1.2 + 10)));
          liveGmp = Math.round(cutoff * (estGainPct / 100));
          gmpSourceType = `Est (${subNum.toFixed(1)}x Demand)`;
        } else {
          liveGmp = Math.round(cutoff * 0.25); // 25% default market premium
          gmpSourceType = 'Est 25% Premium';
        }
      }
    }

    setPrice(cutoff);
    setLotSize(lot);
    setGmp(liveGmp);
    setGmpSource(gmpSourceType);
  };

  const handleSelectIpo = (ipoName) => {
    const found = liveIpos.find(i => (i.name || i.ipoName) === ipoName);
    if (found) {
      setActiveIpo(found);
      populateFromIpo(found);
    }
  };

  const applyGmpPresetPct = (pct) => {
    const calculatedGmp = Math.round(price * (pct / 100));
    setGmp(calculatedGmp);
    setGmpSource(`${pct}% Preset`);
  };

  if (!isOpen) return null;

  const totalShares = lotSize * lotsCount;
  const totalInvestment = price * totalShares;
  const expectedListingPrice = parseFloat(price) + parseFloat(gmp || 0);
  const grossProfit = (gmp || 0) * totalShares;
  const totalSellTurnover = expectedListingPrice * totalShares;

  // Exact Statutory Charges Calculation (Indian Equities Delivery):
  const stt = grossProfit > 0 ? totalSellTurnover * 0.001 : 0; // 0.1% STT on sell turnover
  const stampDuty = totalInvestment * 0.00015; // 0.015% Stamp Duty on buy allotment
  const exchangeCharges = totalSellTurnover * 0.0000345; // 0.00345% NSE/BSE exchange transaction fee
  const sebiFees = totalSellTurnover * 0.000001; // SEBI turnover fee
  const dpChargeVal = parseFloat(dpCharges) || 15.9; // Depository DP fee
  const gst = (exchangeCharges + sebiFees + dpChargeVal) * 0.18; // 18% GST on brokerage/fees
  const totalCharges = stt + stampDuty + exchangeCharges + sebiFees + dpChargeVal + gst;

  const netProfit = grossProfit - totalCharges;
  const returnPercentage = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100).toFixed(2) : 0;
  const gmpGainPct = price > 0 ? (((gmp || 0) / price) * 100).toFixed(1) : 0;

  const ipoTitle = activeIpo?.name || activeIpo?.ipoName || 'Market Target IPO';

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
                <p className="text-xs text-[var(--text-secondary)]">Simulate listing gains & net profit based on GMP</p>
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
            {/* Auto-filled status banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-400 block">Automated Profit Calculator</span>
                  <span className="text-[10px] text-zinc-400">Select Lots or adjust GMP below for instant profit calculation</span>
                </div>
              </div>
            </div>

            {/* Select Active IPO dropdown */}
            {liveIpos.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Target IPO Selection
                </label>
                <select
                  value={activeIpo?.name || activeIpo?.ipoName || ''}
                  onChange={(e) => handleSelectIpo(e.target.value)}
                  className="input-field bg-[#18181b] border-indigo-500/30 text-white font-semibold cursor-pointer"
                >
                  {liveIpos.map((ipo, idx) => (
                    <option key={idx} value={ipo.name || ipo.ipoName}>
                      {ipo.name || ipo.ipoName} ({ipo.priceRange || (ipo.price ? `₹${ipo.price}` : 'Live')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* LOT SELECTOR SLIDER */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/15 via-surface-2 to-emerald-500/15 border border-indigo-500/30 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-indigo-400" /> Select Number of Lots
                </span>
                <span className="font-mono text-indigo-300 text-sm font-extrabold bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-500/30">
                  {lotsCount} {lotsCount > 1 ? 'Lots' : 'Lot'} ({totalShares} shares)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={lotsCount}
                onChange={(e) => setLotsCount(parseInt(e.target.value) || 1)}
                className="w-full accent-indigo-500 bg-[#27272a] h-2.5 rounded-lg cursor-pointer shadow-inner"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>1 Lot</span>
                <span>10 Lots</span>
                <span>20 Lots</span>
                <span>30 Lots</span>
              </div>
            </div>

            {/* EXPECTED GMP INPUT FIELD & PRESETS */}
            <div className="p-4 rounded-xl bg-[#141418] border border-emerald-500/30 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp size={15} /> Expected GMP Premium (₹ / Share)
                </label>
                <span className="font-mono text-xs text-zinc-300">
                  Est. Listing Price: <strong className="text-emerald-400">₹{expectedListingPrice}</strong> ({gmpGainPct > 0 ? `+${gmpGainPct}%` : `${gmpGainPct}%`})
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  value={gmp}
                  onChange={(e) => {
                    setGmp(parseFloat(e.target.value) || 0);
                    setGmpSource('User Input');
                  }}
                  placeholder="Enter expected GMP"
                  className="input-field pl-8 font-mono text-emerald-400 font-extrabold text-base bg-[#18181b] border-emerald-500/40 focus:border-emerald-400"
                />
              </div>

              {/* 1-Click Preset Chips */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider shrink-0">Quick Presets:</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {[10, 20, 30, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => applyGmpPresetPct(pct)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shrink-0 cursor-pointer"
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cutoff Price & Lot Size Parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cutoff Issue Price</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-zinc-400 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="input-field pl-6 font-mono text-white text-xs py-1"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Shares Per Lot</span>
                <input
                  type="number"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseInt(e.target.value) || 1)}
                  className="input-field font-mono text-white text-xs py-1"
                />
              </div>
            </div>

            {/* Calculation Output Box */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3 font-mono text-xs shadow-lg">
              <div className="text-xs font-sans font-bold uppercase tracking-wider text-zinc-300 border-b border-[#27272a] pb-2 flex justify-between items-center">
                <span>Calculation Output</span>
                <span className="text-[10px] text-zinc-400 font-normal">{ipoTitle}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Total Capital Needed:</span>
                <span className="text-white font-bold">₹{totalInvestment.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Est. Gross Profit (₹{gmp} × {totalShares} sh):</span>
                <span className="text-emerald-400 font-semibold">+₹{grossProfit.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-400">Total Statutory Charges (STT/DP/GST):</span>
                <span className="text-red-400">-₹{totalCharges.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-[#27272a] flex justify-between items-baseline font-sans">
                <div>
                  <span className="text-xs font-bold text-white block">Estimated Net Profit</span>
                  <span className="text-[0.68rem] text-zinc-400">After all taxes & statutory charges</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xl font-extrabold block ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
