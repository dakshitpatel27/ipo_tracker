import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { Users, TrendingUp, PieChart, Target, Trophy, ArrowUpRight, ArrowDownRight, RefreshCw, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];

const FamilyPortfolio = () => {
  const [data, setData] = useState({ applicants: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalProfit');

  const load = useCallback(async () => {
    try {
      const result = await api.getFamilyAnalytics();
      setData(result);
    } catch (err) {
      console.error('Failed to load family analytics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const sorted = [...data.applicants].sort((a, b) => {
    if (sortBy === 'totalProfit') return b.totalProfit - a.totalProfit;
    if (sortBy === 'totalInvested') return b.totalInvested - a.totalInvested;
    if (sortBy === 'allotmentRate') return parseFloat(b.allotmentRate) - parseFloat(a.allotmentRate);
    if (sortBy === 'recordCount') return b.recordCount - a.recordCount;
    return 0;
  });

  const chartData = sorted.map((a, i) => ({
    name: a.name?.length > 12 ? a.name.substring(0, 12) + '…' : a.name,
    profit: a.totalProfit,
    invested: a.totalInvested,
    color: COLORS[i % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card px-4 py-3 border border-indigo-500/20 shadow-xl text-sm">
        <div className="font-semibold text-white mb-1">{payload[0]?.payload?.name}</div>
        <div className="text-emerald-400">Profit: {fmt(payload[0]?.value)}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-7 w-56 rounded-lg" />
        <div className="shimmer h-4 w-72 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Family Portfolio 👨‍👩‍👧‍👦</h1>
          <p className="page-subtitle">Aggregate performance across {totals.totalApplicants || 0} applicant{totals.totalApplicants !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-outline flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Family Investment', value: fmt(totals.totalInvested), icon: PieChart, accent: 'indigo' },
          { title: 'Total Family Profit', value: fmt(totals.totalProfit), icon: TrendingUp, accent: totals.totalProfit >= 0 ? 'emerald' : 'rose' },
          { title: 'Combined Allotment Rate', value: `${totals.allotmentRate || 0}%`, icon: Target, accent: 'amber' },
          { title: 'Total Applications', value: totals.totalApplied || 0, icon: Users, accent: 'violet' },
        ].map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 + idx * 0.06 }}
            className="glass-card p-4 sm:p-5 relative overflow-hidden"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full pointer-events-none`}
              style={{ background: `radial-gradient(circle, rgba(99,102,241,0.05), transparent 70%)`, filter: 'blur(16px)' }}
            />
            <div className="relative z-10">
              <div className={`p-2 rounded-xl bg-${card.accent}-500/10 text-${card.accent}-400 inline-block mb-2.5`}>
                <card.icon size={16} strokeWidth={2} />
              </div>
              <div className="stat-number text-lg sm:text-xl text-white mb-1">{card.value}</div>
              <div className="section-label text-[0.65rem]">{card.title}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Profit Comparison Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-semibold text-white text-[0.9375rem]">Applicant Profit Comparison</div>
              <div className="text-[0.7rem] text-secondary mt-0.5">Side-by-side profit breakdown</div>
            </div>
            <div className="badge badge-indigo text-[10px]">
              <Trophy size={10} className="mr-1" /> Leaderboard
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={55} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="profit">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} radius={entry.profit >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Applicant Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 bg-black/20">
          <div>
            <h3 className="font-semibold text-white text-[0.9375rem]">Per-Applicant Breakdown</h3>
            <p className="text-xs text-secondary mt-0.5">Ranked by {sortBy === 'totalProfit' ? 'profit' : sortBy === 'totalInvested' ? 'investment' : sortBy === 'allotmentRate' ? 'allotment rate' : 'record count'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">Sort by:</span>
            {[
              { key: 'totalProfit', label: 'Profit' },
              { key: 'totalInvested', label: 'Investment' },
              { key: 'allotmentRate', label: 'Allotment %' },
              { key: 'recordCount', label: 'Records' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  sortBy === s.key
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'bg-surface/50 text-secondary border-border hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/30 text-secondary font-semibold">
              <tr>
                <th className="px-5 py-3.5 w-8">#</th>
                <th className="px-5 py-3.5">Applicant</th>
                <th className="px-5 py-3.5">PAN</th>
                <th className="px-5 py-3.5 text-right">Invested</th>
                <th className="px-5 py-3.5 text-right">Profit</th>
                <th className="px-5 py-3.5 text-right">ROI</th>
                <th className="px-5 py-3.5 text-right">Allotment</th>
                <th className="px-5 py-3.5 text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sorted.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-secondary">No applicant data available</td></tr>
              ) : (
                sorted.map((applicant, idx) => (
                  <tr key={applicant.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      {idx === 0 ? <Award size={16} className="text-amber-400" /> : <span className="text-secondary font-mono text-xs">{idx + 1}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                          style={{ background: COLORS[idx % COLORS.length] + '30', border: `1px solid ${COLORS[idx % COLORS.length]}40` }}>
                          {applicant.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-semibold text-white truncate max-w-[160px]">{applicant.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-secondary font-mono text-xs">
                      {applicant.pan ? `${applicant.pan.substring(0, 3)}****${applicant.pan.slice(-2)}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-white">{fmt(applicant.totalInvested)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-bold flex items-center justify-end gap-1 ${applicant.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {applicant.totalProfit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {fmt(Math.abs(applicant.totalProfit))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-xs font-bold ${parseFloat(applicant.roi) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(applicant.roi) >= 0 ? '+' : ''}{applicant.roi}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-black/30 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(applicant.allotmentRate), 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-white w-10 text-right">{applicant.allotmentRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-secondary font-mono">{applicant.recordCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default FamilyPortfolio;
