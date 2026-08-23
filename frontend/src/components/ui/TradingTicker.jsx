import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Activity } from 'lucide-react';
import { api } from '../../api';

export default function TradingTicker() {
  const [tickerItems, setTickerItems] = useState([]);

  useEffect(() => {
    async function loadGmpData() {
      try {
        const ipos = await api.getLiveIpos();
        if (ipos && ipos.length > 0) {
          // Filter IPOs that have actual active GMP trends
          const activeGmpIpos = ipos.filter(i => {
            const trend = i.greyMarketPremium?.gmpTrends?.[0];
            return trend && trend.gmp && trend.gmp !== '₹0' && trend.gmp !== '0';
          });

          // Fall back to all ipos if none have trends
          const targetList = activeGmpIpos.length > 0 ? activeGmpIpos : ipos;

          const items = targetList.slice(0, 10).map(ipo => {
            const trend = ipo.greyMarketPremium?.gmpTrends?.[0];
            let gmpStr = 'N/A';
            let isPositive = true;

            if (trend && trend.gmp) {
              const formattedGmp = trend.gmp.startsWith('₹') ? trend.gmp : `₹${trend.gmp}`;
              const gainStr = trend.gain ? ` (${trend.gain.startsWith('+') || trend.gain.startsWith('-') ? '' : '+'}${trend.gain})` : '';
              gmpStr = `${formattedGmp}${gainStr}`;
              isPositive = !trend.gmp.includes('-') && !trend.gain?.includes('-');
            } else if (ipo.gmp) {
              gmpStr = ipo.gmp;
              isPositive = !ipo.gmp.includes('-');
            }

            return {
              name: (ipo.name || ipo.ipoName || 'IPO').toUpperCase(),
              gmp: gmpStr,
              isPositive
            };
          }).filter(item => item.gmp !== 'N/A');

          setTickerItems(items);
        }
      } catch (err) {
        setTickerItems([]);
      }
    }
    loadGmpData();
  }, []);

  if (tickerItems.length === 0) return null;

  const duplicatedItems = [...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems];

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
