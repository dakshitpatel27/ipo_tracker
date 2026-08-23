import React from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNormalizedGmp } from '../../api';

export default function CompareDrawer({ isOpen, onClose, ipos = [] }) {
  const getRowMetrics = (ipo) => {
    const norm = getNormalizedGmp(ipo);
    const rawPriceStr = ipo.priceRange || ipo.priceBand || (ipo.price ? String(ipo.price) : '');
    const priceNumbers = String(rawPriceStr).match(/\d+(?:\.\d+)?/g) || [];
    const maxPrice = norm.upperPrice > 0 ? norm.upperPrice : (priceNumbers.length >= 1 ? parseFloat(priceNumbers[priceNumbers.length - 1]) : 0);
    const lotSize = norm.lotNum > 0 ? norm.lotNum : 1;
    const minInvest = maxPrice * lotSize;
    const gmpNum = norm.gmpNum;
    const gmpPercent = norm.gmpPercent;
    const expectedProfit = norm.expectedProfit;

    const displayPriceBand = rawPriceStr ? rawPriceStr : (maxPrice > 0 ? `₹${maxPrice}` : 'N/A');
    const openDate = ipo.schedule?.openingDate || ipo.openDate || ipo.schedule?.startDate || '';
    const closeDate = ipo.schedule?.closingDate || ipo.closeDate || ipo.schedule?.endDate || '';
    const listingDate = ipo.schedule?.listingDate || ipo.listingDate || 'TBA';
    const registrar = ipo.registrar || (ipo.detailsUrl?.includes('linkintime') ? 'Link Intime' : ipo.detailsUrl?.includes('kfintech') ? 'KFintech' : 'KFintech / Link Intime');
    const subStr = ipo.subscriptionStatus?.total || ipo.subscription?.total || (typeof ipo.subscription === 'string' ? ipo.subscription : 'N/A');

    return {
      norm,
      maxPrice,
      lotSize,
      minInvest,
      gmpNum,
      gmpPercent,
      expectedProfit,
      displayPriceBand,
      openDate,
      closeDate,
      listingDate,
      registrar,
      subStr
    };
  };

  const rows = [
    {
      label: 'Issue Type / Status',
      render: (ipo) => (
        <span className="text-xs px-2.5 py-1 rounded bg-[#27272a] text-zinc-300 font-medium">
          {ipo.issueType || ipo.type || 'Mainboard'}
        </span>
      )
    },
    {
      label: 'Price Band',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="font-mono text-xs font-bold text-white">{m.displayPriceBand}</span>;
      }
    },
    {
      label: 'Lot Size',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="font-mono text-xs text-zinc-300">{m.lotSize} shares / lot</span>;
      }
    },
    {
      label: 'Min Investment',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="font-mono text-xs font-bold text-emerald-400">₹{m.minInvest.toLocaleString('en-IN')}</span>;
      }
    },
    {
      label: 'GMP Premium',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return (
          <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded border inline-block ${m.gmpNum >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            ₹{m.gmpNum} <span className="text-[10px] opacity-80">({m.gmpPercent})</span>
          </div>
        );
      }
    },
    {
      label: 'Expected Profit',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return (
          <div>
            <div className="font-mono text-xs font-bold text-emerald-400">
              +₹{m.expectedProfit.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-400 block font-normal">per lot estimation</span>
          </div>
        );
      }
    },
    {
      label: 'Subscription',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="font-mono text-xs font-bold text-indigo-400">{m.subStr}</span>;
      }
    },
    {
      label: 'Bidding Period',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="text-xs text-zinc-300">{m.openDate ? `${m.openDate} - ${m.closeDate}` : 'TBA'}</span>;
      }
    },
    {
      label: 'Listing Date',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="text-xs font-mono text-zinc-300">{m.listingDate}</span>;
      }
    },
    {
      label: 'Registrar',
      render: (ipo) => {
        const m = getRowMetrics(ipo);
        return <span className="text-xs font-semibold text-zinc-400 truncate block">{m.registrar}</span>;
      }
    }
  ];

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
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#141418] shrink-0">
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
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison Table Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {ipos.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-muted)]">
                  <AlertCircle size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No IPOs selected for comparison.</p>
                  <p className="text-xs mt-1">Check 2-3 IPO cards on the IPO Master page to compare.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Top Card Headers */}
                  <div
                    className="grid gap-3 pb-3 border-b border-[#27272a]"
                    style={{ gridTemplateColumns: `160px repeat(${ipos.length}, minmax(200px, 1fr))` }}
                  >
                    <div className="flex items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Comparison Metrics
                    </div>
                    {ipos.map((ipo, idx) => (
                      <div key={idx} className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {ipo.issueType || ipo.category || 'IPO'}
                          </span>
                          {ipo.status === 'Active' || ipo.status === 'Live' || (ipo.status || '').toUpperCase() === 'LIVE' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500">{ipo.status || 'Upcoming'}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white truncate mt-2">{ipo.name}</h4>
                      </div>
                    ))}
                  </div>

                  {/* Parallel Metric Rows */}
                  {rows.map((row, rIdx) => (
                    <div
                      key={rIdx}
                      className="grid gap-3 items-center py-2.5 px-1 border-b border-[#27272a]/50 hover:bg-white/[0.02] rounded-lg transition-colors"
                      style={{ gridTemplateColumns: `160px repeat(${ipos.length}, minmax(200px, 1fr))` }}
                    >
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[11px] shrink-0">
                        {row.label}
                      </div>
                      {ipos.map((ipo, cIdx) => (
                        <div key={cIdx} className="bg-[#18181b]/70 p-2.5 rounded-lg border border-[#27272a]/60 min-h-[40px] flex items-center">
                          {row.render(ipo)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
