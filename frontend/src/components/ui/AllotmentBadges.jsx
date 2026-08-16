import React from 'react';
import { Trophy, Zap, Award, Flame, Star, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { isRecordAllotted } from '../../utils/profitCalculator';

export function calculateGamificationStats(records = []) {
  const sorted = [...records].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  
  let allottedCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let totalProfit = 0;

  sorted.forEach(r => {
    const allotted = isRecordAllotted(r);
    const profit = Number(r.profit || r.listingProfit || 0);

    if (allotted) {
      allottedCount++;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      if (profit > 0) totalProfit += profit;
    } else if (String(r.status || '').toUpperCase() === 'NOT_ALLOTTED' || r.applied === 'Yes') {
      currentStreak = 0;
    }
  });

  const totalApplications = records.length;
  const successRate = totalApplications > 0 ? Math.round((allottedCount / totalApplications) * 100) : 0;

  return {
    allottedCount,
    currentStreak,
    maxStreak,
    totalProfit,
    successRate,
    totalApplications
  };
}

const AllotmentBadges = ({ records = [] }) => {
  const stats = calculateGamificationStats(records);

  const BADGES = [
    {
      id: 'first_win',
      title: 'First Victory',
      desc: 'Won at least 1 IPO Allotment',
      icon: '🎯',
      unlocked: stats.allottedCount >= 1,
      progress: Math.min(100, (stats.allottedCount / 1) * 100)
    },
    {
      id: 'hot_streak',
      title: 'Hot Streak',
      desc: '3+ Consecutive Allotments',
      icon: '⚡',
      unlocked: stats.maxStreak >= 3,
      progress: Math.min(100, (stats.maxStreak / 3) * 100)
    },
    {
      id: 'profit_titan',
      title: 'Profit Titan',
      desc: '₹50,000+ Total Listing Gains',
      icon: '💰',
      unlocked: stats.totalProfit >= 50000,
      progress: Math.min(100, (stats.totalProfit / 50000) * 100)
    },
    {
      id: 'master_investor',
      title: 'Master Investor',
      desc: '10+ Total Allotments Won',
      icon: '👑',
      unlocked: stats.allottedCount >= 10,
      progress: Math.min(100, (stats.allottedCount / 10) * 100)
    },
    {
      id: 'diamond_hands',
      title: 'Diamond Hands',
      desc: '₹1,00,000+ Portfolio Profit',
      icon: '💎',
      unlocked: stats.totalProfit >= 100000,
      progress: Math.min(100, (stats.totalProfit / 100000) * 100)
    }
  ];

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" /> Achievement Badges & Winning Streak
          </h3>
          <p className="text-xs text-secondary mt-0.5">Track your allotment streak and portfolio achievements.</p>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Flame size={18} className="text-amber-400 animate-bounce" />
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase block leading-none">Current Streak</span>
              <span className="text-sm font-bold text-white font-mono leading-tight">{stats.currentStreak} Wins</span>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase block leading-none">Success Rate</span>
              <span className="text-sm font-bold text-white font-mono leading-tight">{stats.successRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {BADGES.map((b) => (
          <motion.div
            key={b.id}
            whileHover={{ scale: 1.02 }}
            className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col justify-between ${
              b.unlocked
                ? 'bg-gradient-to-b from-indigo-500/10 to-surface-2 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/5'
                : 'bg-surface-2/40 border-border/40 text-secondary opacity-60'
            }`}
          >
            <div>
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="font-bold text-xs text-white flex items-center justify-center gap-1">
                {b.title}
                {b.unlocked && <ShieldCheck size={13} className="text-emerald-400" />}
              </div>
              <p className="text-[10px] text-secondary mt-0.5 line-clamp-2">{b.desc}</p>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${b.unlocked ? 'bg-gradient-to-r from-indigo-500 to-emerald-400' : 'bg-secondary/40'}`}
                  style={{ width: `${b.progress}%` }}
                />
              </div>
              <span className="text-[9px] text-secondary font-mono mt-1 block text-right">
                {b.unlocked ? 'Unlocked' : `${Math.round(b.progress)}%`}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AllotmentBadges;
