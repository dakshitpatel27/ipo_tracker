import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw, CheckCircle2, Clock, Smartphone, Sparkles, Trophy, ExternalLink } from 'lucide-react';
import { api } from '../../api';

const HomeScreenWidget = ({ standalone = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWidgetData = async () => {
    try {
      setRefreshing(true);
      const res = await api.getWidgetData();
      setData(res);
    } catch (e) {
      console.warn('Failed to load widget data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
    const interval = setInterval(fetchWidgetData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`glass-card p-5 flex items-center justify-center min-h-[180px] ${standalone ? 'h-screen w-screen rounded-none' : ''}`}>
        <RefreshCw className="animate-spin text-indigo-400" size={24} />
      </div>
    );
  }

  const activeGmpList = data?.activeGmpList || [];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[var(--surface-2)] via-[var(--surface-1)] to-black border border-indigo-500/20 shadow-2xl transition-all ${standalone ? 'h-screen w-screen p-6 flex flex-col justify-between' : 'p-5 rounded-2xl'}`}>
      {/* Background Ambient Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md">
            <Smartphone size={17} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              IPO Tracker Live Widget <Sparkles size={13} className="text-amber-400" />
            </h3>
            <span className="text-[10px] text-[var(--text-secondary)]">Updated {data?.lastUpdated || 'Just now'}</span>
          </div>
        </div>

        <button
          onClick={fetchWidgetData}
          disabled={refreshing}
          className="p-2 rounded-xl bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all hover:bg-white/10"
          title="Refresh Widget Data"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="p-3 rounded-xl bg-surface-3 border border-[var(--border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Applied</span>
          <span className="text-xl font-extrabold text-[var(--text-primary)]">{data?.totalApplied || 0}</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block flex items-center justify-center gap-1">
            <Trophy size={11} /> Won
          </span>
          <span className="text-xl font-extrabold text-emerald-400">{data?.totalAllotted || 0}</span>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-[10px] uppercase font-bold text-indigo-400 block">Win Rate</span>
          <span className="text-xl font-extrabold text-indigo-300">{data?.allotmentRate || '0%'}</span>
        </div>
      </div>

      {/* Live GMP List */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block flex items-center gap-1">
          <TrendingUp size={13} className="text-emerald-400" /> Active GMP Badges
        </span>

        {activeGmpList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeGmpList.map((item, idx) => (
              <div key={idx} className="px-3 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[120px]">{item.name}</span>
                <span className="badge badge-emerald font-bold">₹{item.gmp}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-surface-2 text-center text-xs text-[var(--text-secondary)]">
            No active GMP alerts right now. Track upcoming IPOs in Watchlist.
          </div>
        )}
      </div>

      {standalone && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-center">
          <a
            href="/"
            className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2"
          >
            Open Full IPO Tracker <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
};

export default HomeScreenWidget;
