import React, { useState, useEffect } from 'react';
import { Activity, Flame, TrendingUp, Users, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../api';

const LiveSubscriptionHeatmap = ({ ipo }) => {
  const [currentIpo, setCurrentIpo] = useState(ipo || null);
  const [loading, setLoading] = useState(!ipo);

  useEffect(() => {
    if (ipo) {
      setCurrentIpo(ipo);
      setLoading(false);
      return;
    }
    async function fetchLiveSub() {
      try {
        const ipos = await api.getLiveIpos();
        if (ipos && ipos.length > 0) {
          // Pick live or open IPO
          const openIpo = ipos.find(i => (i.status || '').toUpperCase() === 'LIVE') || ipos[0];
          setCurrentIpo(openIpo);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLiveSub();
  }, [ipo]);

  if (loading) return null;
  if (!currentIpo) return null;

  const ipoName = currentIpo.name || currentIpo.ipoName || 'Live Market';
  const subObj = currentIpo.subscriptionNumbers || currentIpo.subscription || {};
  
  const qib = parseFloat(String(subObj.qib?.subscription || subObj.qib || 0).replace(/[^\d.]/g, '')) || 0;
  const nii = parseFloat(String(subObj.nii?.subscription || subObj.nii || subObj.hni || 0).replace(/[^\d.]/g, '')) || 0;
  const retail = parseFloat(String(subObj.retail?.subscription || subObj.retail || 0).replace(/[^\d.]/g, '')) || 0;
  const employee = parseFloat(String(subObj.employee?.subscription || subObj.employee || 0).replace(/[^\d.]/g, '')) || 0;

  const subData = [
    { category: 'QIB (Institutional)', times: qib, icon: Building2, momentum: qib >= 10 ? '🔥 Heavy Institutional Bidding' : 'Normal Flow' },
    { category: 'NII (HNI / Corporate)', times: nii, icon: Flame, momentum: nii >= 5 ? '⚡ Strong HNI Demand' : 'Normal Flow' },
    { category: 'Retail Individual', times: retail, icon: Users, momentum: retail >= 1 ? '✅ Oversubscribed' : 'Bidding Open' },
    { category: 'Employee Reservation', times: employee, icon: Activity, momentum: employee >= 1 ? '✅ Oversubscribed' : 'Normal' },
  ];

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" /> Live Subscription Heatmap & Institutional Bidding Flow
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time bidding multiples across investor categories for {ipoName}.
          </p>
        </div>
        <span className="badge badge-emerald flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Bidding Flow
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {subData.map((item, idx) => {
          const Icon = item.icon;
          const isHeavy = item.times >= 10;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isHeavy ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-primary)]' : 'bg-surface-2 border-border text-[var(--text-secondary)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Icon size={15} className="text-emerald-500" /> {item.category}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">{item.times > 0 ? `${item.times}x` : 'N/A'}</div>
                <span className="text-[10px] font-bold text-emerald-500 block mt-0.5">{item.momentum}</span>
              </div>

              <div className="mt-3">
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, item.times * 5)}%` }}
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
