import React from 'react';
import { Activity, Flame, TrendingUp, Users, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveSubscriptionHeatmap = ({ ipoName = 'Mainboard IPO' }) => {
  const SUB_DATA = [
    { category: 'QIB (Institutional)', times: 52.4, target: 50, icon: Building2, color: 'emerald', momentum: '🔥 Heavy Day 3 Spike' },
    { category: 'NII (HNI / Corporate)', times: 31.8, target: 30, icon: Flame, color: 'amber', momentum: '⚡ Steady Growth' },
    { category: 'Retail Individual', times: 14.5, target: 15, icon: Users, color: 'indigo', momentum: '✅ Oversubscribed' },
    { category: 'Employee Reservation', times: 4.2, target: 5, icon: Activity, color: 'blue', momentum: 'Normal' },
  ];

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" /> Live Subscription Heatmap & Institutional Bidding Flow
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Real-time bidding multiples across investor categories for {ipoName}.
          </p>
        </div>
        <span className="badge badge-emerald flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Bidding Flow
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SUB_DATA.map((item, idx) => {
          const Icon = item.icon;
          const isHeavy = item.times >= 30;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isHeavy ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-surface-2 border-border text-secondary'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Icon size={15} className="text-emerald-400" /> {item.category}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">{item.times}x</div>
                <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">{item.momentum}</span>
              </div>

              <div className="mt-3">
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, (item.times / item.target) * 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveSubscriptionHeatmap;
