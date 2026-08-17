import React from 'react';
import { X, Check, ArrowUpRight, TrendingUp, Calendar, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompareDrawer({ isOpen, onClose, ipos = [] }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div key="compare-drawer-container" className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-4xl bg-[#0f0f12] border-l border-[#27272a] shadow-2xl h-full flex flex-col z-10 text-[#f4f4f5]"
          >
          {/* Header */}
          <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white tracking-tight">IPO Comparison Tool</h3>
                <p className="text-xs text-[var(--text-secondary)]">Comparing {ipos.length} selected IPOs side-by-side</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Comparison Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {ipos.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <AlertCircle size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No IPOs selected for comparison.</p>
                <p className="text-xs mt-1">Check 2-3 IPO cards on the IPO Master page to compare.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[160px_repeat(auto-fit,minmax(220px,1fr))] gap-4">
                {/* Metric Labels Column */}
                <div className="space-y-6 pt-16 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <div className="h-14 flex items-center">Issue Type / Status</div>
                  <div className="h-10 flex items-center">Price Band</div>
                  <div className="h-10 flex items-center">Lot Size</div>
                  <div className="h-10 flex items-center">Min Investment</div>
                  <div className="h-12 flex items-center">GMP Premium</div>
                  <div className="h-12 flex items-center">Expected Profit</div>
                  <div className="h-10 flex items-center">Subscription</div>
                  <div className="h-10 flex items-center">Bidding Period</div>
                  <div className="h-10 flex items-center">Listing Date</div>
                  <div className="h-10 flex items-center">Registrar</div>
                </div>

                {/* Selected IPO Cards */}
                {ipos.map((ipo, idx) => {
                  // Robust Metric Parsing
                  const rawPriceStr = ipo.priceRange || ipo.priceBand || (ipo.price ? String(ipo.price) : '');
                  const priceNumbers = rawPriceStr.match(/\d+(?:\.\d+)?/g) || [];
                  const minPrice = priceNumbers.length >= 1 ? parseFloat(priceNumbers[0]) : 0;
                  const maxPrice = priceNumbers.length >= 2 ? parseFloat(priceNumbers[1]) : (priceNumbers.length === 1 ? parseFloat(priceNumbers[0]) : parseFloat(ipo.price) || 0);

                  const rawLotStr = ipo.lotSize || ipo.lot || '1';
                  const lotMatch = String(rawLotStr).match(/\d+/);
                  const lotSize = lotMatch ? parseInt(lotMatch[0], 10) : 1;

                  const minInvest = maxPrice * lotSize;

                  let gmpNum = 0;
                  if (typeof ipo.gmp === 'number') {
                    gmpNum = ipo.gmp;
                  } else if (ipo.greyMarketPremium?.gmpTrends && ipo.greyMarketPremium.gmpTrends.length > 0) {
                    const latestGmpStr = ipo.greyMarketPremium.gmpTrends[0].gmp || '0';
                    const parsed = parseFloat(latestGmpStr.replace(/[^\d.-]/g, ''));
                    if (!isNaN(parsed)) gmpNum = parsed;
                  } else if (ipo.gmp) {
                    const parsed = parseFloat(String(ipo.gmp).replace(/[^\d.-]/g, ''));
                    if (!isNaN(parsed)) gmpNum = parsed;
                  }

                  const gmpPercent = maxPrice > 0 ? ((gmpNum / maxPrice) * 100).toFixed(1) : 0;
                  const expectedProfit = gmpNum * lotSize;

                  const displayPriceBand = rawPriceStr ? rawPriceStr : (maxPrice > 0 ? `₹${maxPrice}` : 'N/A');
                  const openDate = ipo.schedule?.openingDate || ipo.openDate || '';
                  const closeDate = ipo.schedule?.closingDate || ipo.closeDate || '';
                  const listingDate = ipo.schedule?.listingDate || ipo.listingDate || 'TBA';
                  const registrar = ipo.registrar || (ipo.detailsUrl?.includes('linkintime') ? 'Link Intime' : ipo.detailsUrl?.includes('kfintech') ? 'KFintech' : 'KFintech / Link Intime');
                  const subStr = ipo.subscriptionStatus?.total || ipo.subscription?.total || ipo.subscriptionRatio || 'N/A';

                  return (
                    <div key={idx} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-6">
                      {/* Header Title */}
                      <div className="h-16 flex flex-col justify-center border-b border-[#27272a] pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {ipo.issueType || ipo.category || 'IPO'}
                          </span>
                          {ipo.status === 'Active' || ipo.status === 'Live' || (ipo.status || '').toUpperCase() === 'LIVE' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">{ipo.status || 'Upcoming'}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white truncate mt-1">{ipo.name}</h4>
                      </div>

                      {/* Values matching row heights */}
                      <div className="h-14 flex items-center">
                        <span className="text-xs px-2.5 py-1 rounded bg-[#27272a] text-zinc-300 font-medium">{ipo.issueType || ipo.type || 'Mainboard'}</span>
                      </div>

                      <div className="h-10 flex items-center font-mono text-xs font-bold text-white truncate">
                        {displayPriceBand}
                      </div>

                      <div className="h-10 flex items-center font-mono text-sm text-zinc-300">
                        {lotSize} shares / lot
                      </div>

                      <div className="h-10 flex items-center font-mono text-sm font-bold text-emerald-400">
                        ₹{minInvest.toLocaleString('en-IN')}
                      </div>

                      <div className="h-12 flex items-center">
                        <div className={`font-mono text-sm font-bold px-2.5 py-1 rounded border ${gmpNum >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          ₹{gmpNum} <span className="text-xs opacity-80">({gmpPercent}%)</span>
                        </div>
                      </div>

                      <div className="h-12 flex items-center">
                        <div className="font-mono text-sm font-bold text-emerald-400">
                          +₹{expectedProfit.toLocaleString('en-IN')}
                          <span className="block text-[0.65rem] font-normal text-[var(--text-muted)]">per lot estimation</span>
                        </div>
                      </div>

                      <div className="h-10 flex items-center font-mono text-sm font-bold text-indigo-400">
                        {subStr}
                      </div>

                      <div className="h-10 flex items-center text-xs text-zinc-300">
                        {openDate ? `${openDate} - ${closeDate}` : 'TBA'}
                      </div>

                      <div className="h-10 flex items-center text-xs text-zinc-300 font-mono">
                        {listingDate}
                      </div>

                      <div className="h-10 flex items-center text-xs text-zinc-400 truncate font-semibold">
                        {registrar}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
