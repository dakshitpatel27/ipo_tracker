import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, HelpCircle, Layers, CheckCircle2, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const SubscriptionOddsModal = ({ isOpen, onClose, defaultIpoName = '' }) => {
  const [iposData, setIposData] = useState([]);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getSubscriptionOdds()
        .then(data => {
          const list = Array.isArray(data) ? data : [data];
          setIposData(list);
          
          if (defaultIpoName) {
            const match = list.find(i => i.name.toLowerCase().includes(defaultIpoName.toLowerCase()));
            setSelectedIpo(match || list[0] || null);
          } else {
            setSelectedIpo(list[0] || null);
          }
        })
        .catch(err => {
          toast.error('Failed to load subscription odds');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, defaultIpoName]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Live Allotment Odds & Strategy</h3>
                <p className="text-xs text-secondary">Analyze QIB, sHNI, bHNI & Retail subscription odds</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
            {/* IPO Selector */}
            {iposData.length > 1 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider">Select Live IPO</label>
                <select
                  value={selectedIpo?.name || ''}
                  onChange={(e) => {
                    const found = iposData.find(i => i.name === e.target.value);
                    setSelectedIpo(found);
                  }}
                  className="input-field appearance-none bg-black/40 font-bold text-sm text-indigo-300"
                >
                  {iposData.map(ipo => (
                    <option key={ipo.name} value={ipo.name}>
                      {ipo.name} (GMP: ₹{ipo.gmp || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-secondary space-y-3">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-xs font-medium">Fetching live subscription numbers & computing allotment probability...</p>
              </div>
            ) : selectedIpo ? (
              <>
                {/* Active IPO Header Info */}
                <div className="p-4 rounded-2xl bg-surface-2 border border-border flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedIpo.name}</h2>
                    <p className="text-xs text-secondary mt-0.5">Price Range: <strong>{selectedIpo.priceRange}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-secondary block uppercase tracking-wider">Live GMP</span>
                    <span className="text-lg font-extrabold text-emerald-400">₹{selectedIpo.gmp || 'N/A'}</span>
                  </div>
                </div>

                {/* Strategy Advice Banner */}
                {selectedIpo.strategyAdvice && (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-300 uppercase tracking-wider text-[11px]">
                      <Sparkles size={14} className="text-indigo-400" /> Smart Allocation Advice
                    </div>
                    <p>{selectedIpo.strategyAdvice}</p>
                  </div>
                )}

                {/* Odds Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Retail Card */}
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Retail Category</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedIpo.subscription.retail} Subscribed
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] text-secondary uppercase font-semibold">Lottery Allotment Odds</p>
                      <h4 className="text-xl font-extrabold text-white mt-0.5">
                        {selectedIpo.odds.retail.pct} <span className="text-xs text-secondary font-normal">({selectedIpo.odds.retail.ratio})</span>
                      </h4>
                    </div>
                  </div>

                  {/* sHNI Card */}
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">sHNI (₹2L–₹10L)</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {selectedIpo.subscription.shni} Subscribed
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] text-secondary uppercase font-semibold">Min-Lot Allotment Odds</p>
                      <h4 className="text-xl font-extrabold text-white mt-0.5">
                        {selectedIpo.odds.shni.pct} <span className="text-xs text-secondary font-normal">({selectedIpo.odds.shni.ratio})</span>
                      </h4>
                    </div>
                  </div>

                  {/* bHNI Card */}
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">bHNI (₹10L+)</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {selectedIpo.subscription.bhni} Subscribed
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] text-secondary uppercase font-semibold">Proportional Allotment Odds</p>
                      <h4 className="text-xl font-extrabold text-white mt-0.5">
                        {selectedIpo.odds.bhni.pct} <span className="text-xs text-secondary font-normal">({selectedIpo.odds.bhni.ratio})</span>
                      </h4>
                    </div>
                  </div>

                  {/* QIB Card */}
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Institutional (QIB)</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {selectedIpo.subscription.qib} Subscribed
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] text-secondary uppercase font-semibold">Institutional Interest</p>
                      <h4 className="text-sm font-bold text-indigo-300 mt-1">
                        {selectedIpo.odds.qib.ratio}
                      </h4>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-xs text-secondary py-12">
                No active subscription data available.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-surface-2 flex justify-end shrink-0">
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionOddsModal;
