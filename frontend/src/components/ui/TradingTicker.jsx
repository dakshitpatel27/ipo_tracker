import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Activity } from 'lucide-react';
import { api } from '../../api';

export default function TradingTicker() {
  const [tickerItems, setTickerItems] = useState([
    { name: 'MILKY MIST', gmp: '+₹42 (42.0%)', isPositive: true },
    { name: 'LEAP INDIA', gmp: '+₹15 (9.4%)', isPositive: true },
    { name: 'BHARAT COKING COAL', gmp: '+₹23 (100.0%)', isPositive: true },
    { name: 'TECHNOCRAFT VENTURES', gmp: '+₹16 (7.5%)', isPositive: true }
  ]);

  useEffect(() => {
    async function loadGmpData() {
      try {
        const ipos = await api.getLiveIpos();
        if (ipos && ipos.length > 0) {
          const items = ipos.slice(0, 8).map(ipo => {
            const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp || ipo.gmp || '+₹0';
            const isPositive = !gmpStr.includes('-');
            return {
              name: (ipo.name || ipo.ipoName || 'IPO').toUpperCase(),
              gmp: gmpStr,
              isPositive
            };
          });
          setTickerItems(items);
        }
      } catch (err) {
        // Fallback to default ticker items
      }
    }
    loadGmpData();
  }, []);

  const duplicatedItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="w-full bg-[var(--surface-2)] border-b border-[var(--border)] py-1.5 px-4 overflow-hidden relative select-none flex items-center">
      <div className="flex items-center gap-2 pr-3 z-10 bg-[var(--surface-2)] text-[10px] font-bold tracking-widest text-indigo-500 uppercase shrink-0 border-r border-[var(--border)]">
        <Activity size={12} className="animate-pulse text-emerald-500" />
        <span>LIVE GMP DESK</span>
      </div>

      <div className="overflow-hidden w-full flex">
        <div className="trading-ticker gap-6 items-center">
          {duplicatedItems.map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 text-[11px] font-mono shrink-0">
              <span className="font-bold text-[var(--text-primary)]">{item.name}</span>
              <span className={`px-1.5 py-0.2 rounded font-extrabold flex items-center gap-1 ${
                item.isPositive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}>
                {item.isPositive ? <TrendingUp size={10} /> : null}
                {item.gmp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
