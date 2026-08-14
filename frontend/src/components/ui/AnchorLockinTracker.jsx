import React from 'react';
import { Lock, Clock, AlertTriangle, ShieldCheck, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_ANCHOR_DATA = [
  {
    ipoName: 'Swiggy Limited',
    listingDate: '2026-08-01',
    anchorAmount: '₹5,000 Cr',
    lockin30Date: '2026-08-31',
    lockin90Date: '2026-10-30',
    days30Remaining: 17,
    days90Remaining: 77,
    status30: 'ACTIVE',
    riskLevel: 'MODERATE'
  },
  {
    ipoName: 'Hyundai Motor India',
    listingDate: '2026-07-15',
    anchorAmount: '₹8,300 Cr',
    lockin30Date: '2026-08-14',
    lockin90Date: '2026-10-13',
    days30Remaining: 0,
    days90Remaining: 60,
    status30: 'EXPIRING_TODAY',
    riskLevel: 'HIGH'
  }
];

const AnchorLockinTracker = () => {
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
        {MOCK_ANCHOR_DATA.map((item, idx) => (
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
                  <AlertTriangle size={11} /> 30-Day Lock-in Expires Today!
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
        ))}
      </div>
    </div>
  );
};

export default AnchorLockinTracker;
