import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Activity, PieChart, Target,
  Lock, Unlock, Flame, Trophy, Zap,
  ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import InsightCard from '../components/ui/InsightCard';
import AllotmentPredictor from '../components/ui/AllotmentPredictor';
import AllotmentOddsCalculator from '../components/ui/AllotmentOddsCalculator';
import BenchmarkRadar from '../components/ui/BenchmarkRadar';
import PreOpenCalculator from '../components/ui/PreOpenCalculator';
import AnchorLockupCalendar from '../components/ui/AnchorLockupCalendar';
import KostakCalculator from '../components/ui/KostakCalculator';
import ShareableGainCard from '../components/ui/ShareableGainCard';
import TraderBadges from '../components/ui/TraderBadges';
import AllotmentBadges from '../components/ui/AllotmentBadges';
import ThemeCustomizer from '../components/ui/ThemeCustomizer';
import FundReservePlanner from '../components/ui/FundReservePlanner';
import Trading3DCard from '../components/ui/Trading3DCard';
import { getRecordProfit } from '../utils/profitCalculator';

// Milestone thresholds (in ₹)
const MILESTONES = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];

/* ── Animated counter hook ── */
function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const startVal = 0;
    const diff = target - startVal;
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + diff * ease));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

/* ── Stat Card ── */
const StatCard = ({ title, value, rawValue, sub, icon: Icon, accent, trend, delay }) => {
  const colors = {
    indigo:  { bg: 'bg-indigo-500/10',  icon: 'text-indigo-400', ring: 'rgba(99,102,241,0.12)', glow: 'rgba(99,102,241,0.06)' },
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', ring: 'rgba(34,197,94,0.12)', glow: 'rgba(34,197,94,0.06)' },
    blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    ring: 'rgba(59,130,246,0.12)',  glow: 'rgba(59,130,246,0.06)' },
    amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   ring: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.06)' },
    violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  ring: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.06)' },
  };
  const c = colors[accent] || colors.indigo;

  return (
    <Trading3DCard glowColor={accent} className="rounded-2xl">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card glass-card-hover p-3.5 sm:p-5 relative overflow-hidden h-full"
      >
        {/* Background glow blob */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${c.glow}, transparent 70%)`, filter: 'blur(20px)' }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2.5 sm:mb-4">
            <div className={`p-2 sm:p-2.5 rounded-xl ${c.bg} ${c.icon}`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <div className="stat-number text-lg sm:text-[1.75rem] text-white mb-1 truncate" title={value}>{value}</div>
          <div className="section-label text-[0.65rem] sm:text-[0.7rem] truncate">{title}</div>
          {sub && <div className="text-[0.65rem] sm:text-[0.7rem] text-[var(--text-muted)] mt-1 truncate">{sub}</div>}
        </div>
      </motion.div>
    </Trading3DCard>
  );
};

/* ── Win Rate Ring ── */
const WinRateRing = ({ rate }) => {
  const pct = Math.min(parseFloat(rate) || 0, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 60 ? '#10b981' : pct >= 35 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" />
          </filter>
        </defs>
        {/* Track */}
        <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        {/* Progress */}
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-number text-2xl text-white">{pct}%</span>
        <span className="section-label mt-1">Win Rate</span>
      </div>
    </div>
  );
};

/* ── Streak computation ── */
function computeStreak(records) {
  const sorted = [...records]
    .filter(r => r.applied === 'Yes')
    .sort((a, b) => new Date(a.listingDate || a.createdAt) - new Date(b.listingDate || b.createdAt));
  let current = 0, best = 0, temp = 0;
  sorted.forEach(r => {
    if (parseFloat(r.alloted) > 0) { temp++; best = Math.max(best, temp); }
    else { temp = 0; }
  });
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (parseFloat(sorted[i].alloted) > 0) current++;
    else break;
  }
  return { current, best };
}

/* ── Capital computation ── */
function computeCapital(records) {
  let blocked = 0, totalInvested = 0;
  records.forEach(r => {
    const amt = parseFloat(r.amount) || 0;
    totalInvested += amt;
    if (r.applied === 'Yes' && !(parseFloat(r.alloted) > 0) && r.holdingStatus !== 'Sold') {
      blocked += amt;
    }
  });
  return { blocked, free: totalInvested - blocked };
}

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 border border-emerald-500/20 shadow-xl text-sm">
      <div className="section-label mb-1">{label}</div>
      <div className="stat-number text-base text-emerald-400">
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </div>
    </div>
  );
};

import MandateTrackerWidget from '../components/ui/MandateTrackerWidget';

/* ── Dashboard ── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, invested: 0, profit: 0, rate: 0 });
  const [capital, setCapital] = useState({ blocked: 0, free: 0 });
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [milestone, setMilestone] = useState(null);

  const load = useCallback(async () => {
    try {
      const recs = await api.getRecords();
      setRecords(recs);
      const total = recs.length;
      const invested = recs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const profit = recs.reduce((s, r) => s + getRecordProfit(r), 0);
      const applied = recs.filter(r => r.applied === 'Yes').length;
      const alloted = recs.filter(r => parseFloat(r.alloted) > 0 || r.alloted === 'Yes' || r.alloted === 'Allotted').length;
      const rate = applied > 0 ? ((alloted / applied) * 100).toFixed(1) : 0;

      const monthlyProfits = {};
      recs.forEach(r => {
        const p = getRecordProfit(r);
        if (r.listingDate && p !== 0) {
          const month = new Date(r.listingDate).toLocaleString('default', { month: 'short' });
          monthlyProfits[month] = (monthlyProfits[month] || 0) + p;
        }
      });
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const chartDataFormatted = months
        .map(m => ({ name: m, profit: monthlyProfits[m] || 0 }))
        .filter(m => monthlyProfits[m.name] !== undefined);
      if (chartDataFormatted.length === 0) chartDataFormatted.push({ name: 'No Data', profit: 0 });

      setStats({ total, invested, profit, rate });
      setChartData(chartDataFormatted);
      setCapital(computeCapital(recs));
      setStreak(computeStreak(recs));

      const seenKey = 'ipo_milestones_seen';
      const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
      for (const m of MILESTONES) {
        if (profit >= m && !seen.includes(m)) {
          setMilestone(m);
          seen.push(m);
          localStorage.setItem(seenKey, JSON.stringify(seen));
          setTimeout(() => confetti({ particleCount: 180, spread: 80, origin: { y: 0.5 }, colors: ['#10b981','#34d399','#6ee7b7'] }), 400);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    await load();
    setSyncing(false);
  };

  const fmt = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="shimmer h-6 w-48 rounded-lg" />
            <div className="shimmer h-4 w-64 rounded-lg" />
          </div>
          <div className="shimmer h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="shimmer h-72 rounded-2xl col-span-2" />
          <div className="shimmer h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Milestone Banner */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold px-6 py-3 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center gap-3"
          >
            <Trophy size={18} />
            🎉 Milestone! You've earned ₹{milestone.toLocaleString()}+ in profits!
            <button onClick={() => setMilestone(null)} className="ml-2 text-black/50 hover:text-black transition-colors">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.username?.split(' ')[0] || 'Trader'} 👋
          </h1>
          <p className="page-subtitle">
            Here's your portfolio snapshot · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-outline flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Refresh'}
        </button>
      </motion.div>

      {/* Mandate Escalation Tracker Widget */}
      <MandateTrackerWidget onStatusChange={load} />

      {/* Core Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          title="Total Records"
          value={stats.total}
          icon={Target}
          accent="indigo"
          delay={0.08}
        />
        <StatCard
          title="Total Invested"
          value={fmt(stats.invested)}
          icon={PieChart}
          accent="blue"
          delay={0.14}
        />
        <StatCard
          title="Total Profit"
          value={fmt(stats.profit)}
          icon={TrendingUp}
          accent={stats.profit >= 0 ? 'emerald' : 'violet'}
          delay={0.2}
          sub={stats.profit >= 0 ? 'Net gain' : 'Net loss'}
        />
        <StatCard
          title="Allotment Rate"
          value={`${stats.rate}%`}
          icon={Activity}
          accent="amber"
          delay={0.26}
          sub={`${records.filter(r => parseFloat(r.alloted) > 0).length} allotted of ${records.filter(r => r.applied === 'Yes').length}`}
        />
      </div>

      {/* Feature 2: Smart Portfolio Insights */}
      <InsightCard records={records} />

      {/* Capital Lock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.32 }}
          className="glass-card p-5 flex items-center gap-4"
        >
          <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
            <Lock size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="section-label mb-1">Capital Blocked (ASBA)</div>
            <div className="stat-number text-2xl text-rose-400">{fmt(capital.blocked)}</div>
            <div className="text-[0.7rem] text-[var(--text-muted)] mt-1">Currently locked in pending applications</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.38 }}
          className="glass-card p-5 flex items-center gap-4"
        >
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
            <Unlock size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="section-label mb-1">Capital Free</div>
            <div className="stat-number text-2xl text-emerald-400">{fmt(capital.free)}</div>
            <div className="text-[0.7rem] text-[var(--text-muted)] mt-1">Available / already settled</div>
          </div>
        </motion.div>
      </div>

      {/* Chart + Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Profit Chart */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.44 }}
          className="glass-card p-5 col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-semibold text-white text-[0.9375rem] tracking-tight">Profit Trajectory</div>
              <div className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">Monthly profit breakdown</div>
            </div>
            <div className="flex items-center gap-1.5 badge badge-emerald">
              <div className="status-dot live" />
              Live
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={50} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gamification Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="glass-card p-5 flex flex-col gap-5"
        >
          <div className="font-semibold text-white text-[0.9375rem] tracking-tight">Investor Stats</div>

          <WinRateRing rate={stats.rate} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-500/8 border border-orange-500/15 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Flame size={13} className="text-orange-400" />
                <span className="section-label">Current</span>
              </div>
              <div className="stat-number text-2xl text-orange-400">{streak.current}</div>
              <div className="text-[0.65rem] text-[var(--text-muted)] mt-0.5">Streak</div>
            </div>
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Trophy size={13} className="text-amber-400" />
                <span className="section-label">Best</span>
              </div>
              <div className="stat-number text-2xl text-amber-400">{streak.best}</div>
              <div className="text-[0.65rem] text-[var(--text-muted)] mt-0.5">All Time</div>
            </div>
          </div>

          {/* Next milestone */}
          {(() => {
            const profit = stats.profit;
            const next = MILESTONES.find(m => profit < m);
            if (!next) return (
              <div className="text-xs text-emerald-400 font-bold text-center flex items-center justify-center gap-1.5">
                <Trophy size={14} /> All milestones achieved!
              </div>
            );
            const pct = Math.min((profit / next) * 100, 100);
            return (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="section-label flex items-center gap-1"><Zap size={10} /> Next Milestone</span>
                  <span className="text-[0.7rem] font-semibold text-white">₹{next.toLocaleString()}</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.8, duration: 1, ease: [0.4, 0, 0.2, 1] }}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-1.5 rounded-full"
                  />
                </div>
                <div className="text-[0.65rem] text-[var(--text-muted)] text-right">{pct.toFixed(1)}% there</div>
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Advanced AI & Reserve Planner Widgets */}
      <div className="space-y-6">
        <AllotmentBadges records={records} />
        <TraderBadges />
        {(() => {
          const topRecord = records.filter(r => getRecordProfit(r) > 0).sort((a, b) => getRecordProfit(b) - getRecordProfit(a))[0];
          if (!topRecord) return null;
          const profit = getRecordProfit(topRecord);
          const amt = parseFloat(topRecord.amount) || 1;
          const pct = ((profit / amt) * 100).toFixed(1);
          return (
            <ShareableGainCard
              ipoName={topRecord.ipoName}
              profit={profit}
              returnPct={pct}
              applicant={topRecord.applicantName}
            />
          );
        })()}
        <ThemeCustomizer />
        {(() => {
          const latest = records[0];
          if (!latest) return null;
          return (
            <>
              <PreOpenCalculator issuePrice={parseFloat(latest.price) || 100} gmp={parseFloat(latest.gmp) || 0} lotSize={parseInt(latest.lotSize) || 15} />
              <AnchorLockupCalendar ipoName={latest.ipoName} listingDate={latest.listingDate} />
              <AllotmentPredictor ipoName={latest.ipoName} issuePrice={parseFloat(latest.price) || 100} expectedGmp={parseFloat(latest.gmp) || 0} />
            </>
          );
        })()}
        <KostakCalculator />
        <BenchmarkRadar records={records} />
        <AllotmentOddsCalculator />
        <FundReservePlanner applicantsCount={3} />
      </div>
    </div>
  );
};

export default Dashboard;
