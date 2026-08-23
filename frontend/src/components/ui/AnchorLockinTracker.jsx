import React, { useState, useEffect } from 'react';
import { Lock, Clock, AlertTriangle, ShieldCheck, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../api';

const AnchorLockinTracker = () => {
  const [anchorItems, setAnchorItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnchorData() {
      try {
        const ipos = await api.getLiveIpos();
        const listed = (ipos || []).filter(i => {
          const status = (i.status || '').toUpperCase();
          return (status === 'LISTED' || status === 'CLOSED' || i.schedule?.listingDate || i.listingDate);
        });

        const today = new Date();
        const computed = listed.slice(0, 5).map(ipo => {
          const ipoName = ipo.name || ipo.ipoName || 'IPO';
          const listStr = ipo.schedule?.listingDate || ipo.listingDate || ipo.closeDate;
          const listDate = listStr ? new Date(listStr) : new Date();

          const lockin30 = new Date(listDate);
          lockin30.setDate(lockin30.getDate() + 30);

          const lockin90 = new Date(listDate);
          lockin90.setDate(lockin90.getDate() + 90);

          const days30Remaining = Math.max(0, Math.ceil((lockin30 - today) / (1000 * 60 * 60 * 24)));
          const days90Remaining = Math.max(0, Math.ceil((lockin90 - today) / (1000 * 60 * 60 * 24)));

          let anchorAmount = 'N/A';
          if (typeof ipo.issueSize === 'string') {
            anchorAmount = ipo.issueSize;
          } else if (typeof ipo.issueSize === 'object' && ipo.issueSize !== null) {
            anchorAmount = ipo.issueSize.totalIssueSize ? `₹${ipo.issueSize.totalIssueSize} Cr` : 'N/A';
          } else if (typeof ipo.anchorSize === 'string') {
            anchorAmount = ipo.anchorSize;
          } else if (ipo.price) {
            anchorAmount = `₹${(parseFloat(ipo.price) * 100).toFixed(0)} Cr`;
          }

          return {
            ipoName,
            listingDate: listDate.toISOString().split('T')[0],
            anchorAmount,
            lockin30Date: lockin30.toISOString().split('T')[0],
            lockin90Date: lockin90.toISOString().split('T')[0],
            days30Remaining,
            days90Remaining,
            status30: days30Remaining === 0 ? 'EXPIRING_TODAY' : 'ACTIVE',
            riskLevel: days30Remaining < 7 ? 'HIGH' : 'MODERATE'
          };
        });

        setAnchorItems(computed);
      } catch (err) {
        setAnchorItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadAnchorData();
  }, []);

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Lock size={16} className="text-amber-400" /> Anchor Investor Lock-in Expiry Monitor
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Track 30-day (50% anchor shares) and 90-day (remaining 50%) lock-in expiration dates to anticipate supply releases.
          </p>
        </div>
        <span className="badge badge-amber flex items-center gap-1">
          <Clock size={12} /> Live Lock-in Radar
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-6 text-xs text-secondary">Loading anchor lock-in monitor...</div>
        ) : anchorItems.length === 0 ? (
          <div className="text-center py-6 text-xs text-secondary italic">No active anchor lock-in expiries found for current listed IPOs.</div>
        ) : (
          anchorItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-surface-2 border border-border space-y-3 hover:border-indigo-500/30 transition-all text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{item.ipoName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Anchor Book: {item.anchorAmount}
                  </span>
                </div>

                {item.status30 === 'EXPIRING_TODAY' ? (
                  <span className="badge badge-rose text-[10px] flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={11} /> 30-Day Lock-in Expired / Expiring!
                  </span>
                ) : (
                  <span className="badge badge-emerald text-[10px]">
                    30-Day Expiry in {item.days30Remaining} Days
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-black/30 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase block">30-Day Lock-in Expiry (50% Shares)</span>
                    <span className="font-mono text-white font-semibold">{item.lockin30Date}</span>
                  </div>
                  <span className="text-amber-400 font-bold font-mono text-xs">{item.days30Remaining}d left</span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/30 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase block">90-Day Lock-in Expiry (50% Shares)</span>
                    <span className="font-mono text-white font-semibold">{item.lockin90Date}</span>
                  </div>
                  <span className="text-indigo-400 font-bold font-mono text-xs">{item.days90Remaining}d left</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnchorLockinTracker;
