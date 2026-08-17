import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { Clock, TrendingUp, Check, X, DollarSign, ArrowUpRight, Filter, RefreshCw, FileText } from 'lucide-react';

const eventConfig = {
  applied:       { icon: FileText,     color: 'emerald',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', label: 'Applied' },
  allotted:      { icon: Check,        color: 'emerald',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Allotted' },
  not_allotted:  { icon: X,            color: 'rose',     bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    dot: 'bg-rose-500',    label: 'Not Allotted' },
  listed:        { icon: ArrowUpRight, color: 'indigo',   bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  dot: 'bg-indigo-500',  label: 'Listed' },
  profit_booked: { icon: DollarSign,   color: 'amber',    bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   label: 'Sold' },
};

import BankRefundTracker from '../components/ui/BankRefundTracker';

const Timeline = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeView, setActiveView] = useState('timeline');

  const load = useCallback(async () => {
    try {
      const data = await api.getTimeline();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
  const visible = filtered.slice(0, visibleCount);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-7 w-48 rounded-lg" />
        <div className="shimmer h-4 w-64 rounded-lg" />
        {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Timeline & Refund Tracker 📋</h1>
          <p className="page-subtitle">Your complete IPO journey & ASBA bank refund schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Activity Timeline
            </button>
            <button
              onClick={() => setActiveView('refund')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'refund'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <span>Bank Refunds</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </button>
          </div>
          <button onClick={load} className="btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </motion.div>

      {activeView === 'refund' ? (
        <BankRefundTracker />
      ) : (
        <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="text-secondary shrink-0" />
        {[
          { key: 'all', label: 'All Events' },
          { key: 'applied', label: 'Applied' },
          { key: 'allotted', label: 'Allotted' },
          { key: 'not_allotted', label: 'Not Allotted' },
          { key: 'listed', label: 'Listed' },
          { key: 'profit_booked', label: 'Sold' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setVisibleCount(30); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              filter === f.key
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                : 'bg-surface/50 text-secondary hover:text-white border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
          <Clock size={48} className="mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No events yet</h3>
          <p className="text-sm text-secondary">Your IPO activity will appear here as a timeline</p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-border to-transparent" />

          <div className="space-y-1">
            {visible.map((event, idx) => {
              const config = eventConfig[event.type] || eventConfig.applied;
              const Icon = config.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className="relative pl-12 md:pl-14 py-3 group"
                >
                  {/* Timeline Dot */}
                  <div className={`absolute left-3.5 md:left-4 top-5 w-3 h-3 rounded-full ${config.dot} ring-4 ring-[#09090b] z-10 group-hover:scale-125 transition-transform`} />

                  {/* Event Card */}
                  <div className={`${config.bg} border ${config.border} rounded-xl p-4 hover:bg-opacity-20 transition-all`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-lg ${config.bg} shrink-0`}>
                          <Icon size={14} className={`text-${config.color}-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} text-${config.color}-400 border ${config.border}`}>
                              {config.label}
                            </span>
                            <span className="font-semibold text-white text-sm truncate">{event.ipoName}</span>
                          </div>
                          <p className="text-xs text-secondary leading-relaxed">{event.description}</p>
                          {event.applicant && (
                            <p className="text-[10px] text-zinc-500 mt-1">Applicant: {event.applicant}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500 whitespace-nowrap shrink-0 pt-0.5">
                        {formatDate(event.date)}
                      </div>
                    </div>

                    {/* Extra data for specific event types */}
                    {event.type === 'profit_booked' && event.profit !== undefined && (
                      <div className={`mt-2 ml-9 text-xs font-bold ${event.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {event.profit >= 0 ? '+' : ''}₹{Math.abs(event.profit).toLocaleString('en-IN')}
                      </div>
                    )}
                    {event.type === 'listed' && event.gain !== undefined && (
                      <div className={`mt-2 ml-9 text-xs font-bold ${parseFloat(event.gain) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Listed at ₹{event.listingPrice?.toLocaleString('en-IN')} ({parseFloat(event.gain) >= 0 ? '+' : ''}{event.gain}%)
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Load More */}
          {visibleCount < filtered.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-6">
              <button
                onClick={() => setVisibleCount(prev => prev + 30)}
                className="btn-outline text-sm px-6"
              >
                Load More ({filtered.length - visibleCount} remaining)
              </button>
            </motion.div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Timeline;
