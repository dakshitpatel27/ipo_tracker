export const LEVEL_TIERS = [
  { level: 1, minXp: 0, title: 'Novice Bidder', icon: '🌱', color: 'text-zinc-400', badgeClass: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300' },
  { level: 2, minXp: 300, title: 'Retail Applicant', icon: '📝', color: 'text-blue-400', badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-300' },
  { level: 3, minXp: 800, title: 'ASBA Specialist', icon: '⚡', color: 'text-cyan-400', badgeClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' },
  { level: 4, minXp: 1600, title: 'sHNI Strategist', icon: '🎯', color: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
  { level: 5, minXp: 3000, title: 'Syndicate Operator', icon: '💼', color: 'text-indigo-400', badgeClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' },
  { level: 6, minXp: 5000, title: 'Allotment Maestro', icon: '🔥', color: 'text-amber-400', badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300' },
  { level: 7, minXp: 8000, title: 'Listing Day Shark', icon: '🦈', color: 'text-purple-400', badgeClass: 'bg-purple-500/10 border-purple-500/20 text-purple-300' },
  { level: 8, minXp: 12000, title: 'Anchor Whitelist', icon: '👑', color: 'text-pink-400', badgeClass: 'bg-pink-500/10 border-pink-500/20 text-pink-300' },
  { level: 9, minXp: 18000, title: 'Grey Market Titan', icon: '💎', color: 'text-violet-400', badgeClass: 'bg-violet-500/10 border-violet-500/20 text-violet-300' },
  { level: 10, minXp: 25000, title: 'DII Institutional Whale', icon: '🏆', color: 'text-yellow-400', badgeClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' }
];

export const QUESTS_DEF = [
  { id: 'first_bid', title: 'First Bidder', desc: 'Submit your 1st IPO application', xp: 100, icon: '🎯' },
  { id: 'first_allotment', title: 'First Win', desc: 'Secure your first confirmed allotment', xp: 300, icon: '🎉' },
  { id: 'pan_syndicate', title: 'Family Syndicate', desc: 'Apply across 3+ distinct PAN cards', xp: 400, icon: '👥' },
  { id: 'streak_3', title: 'Hot Streak', desc: 'Achieve a 3+ win consecutive streak', xp: 500, icon: '🔥' },
  { id: 'century_club', title: 'Century Club', desc: 'Generate ₹1,00,000+ in realized gains', xp: 1000, icon: '💎' },
  { id: 'sme_conqueror', title: 'SME Conqueror', desc: 'Win an SME IPO allotment', xp: 600, icon: '🚀' },
  { id: 'power_bidder', title: 'Power Bidder', desc: 'Submit 20+ applications across issues', xp: 750, icon: '⚡' }
];

export function calculateGamificationStats(records = [], applicants = []) {
  const sorted = [...records].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  
  let allottedCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let totalProfit = 0;
  let smeAllottedCount = 0;
  const uniquePans = new Set();

  sorted.forEach(r => {
    const isAllotted = String(r.status || r.alloted || '').toUpperCase() === 'ALLOTTED' || parseFloat(r.alloted) > 0;
    const profit = Number(r.profit || r.listingProfit || 0);
    const panVal = (r.pan || r.applicantPan || r.applicantName || '').trim();
    if (panVal) uniquePans.add(panVal);

    const isSme = (r.quota || '').toLowerCase().includes('sme') || (r.type || '').toLowerCase().includes('sme') || (r.category || '').toLowerCase().includes('sme');

    if (isAllotted) {
      allottedCount++;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      if (profit > 0) totalProfit += profit;
      if (isSme) smeAllottedCount++;
    } else if (String(r.status || '').toUpperCase() === 'NOT_ALLOTTED' || r.applied === 'Yes') {
      currentStreak = 0;
    }
  });

  const totalApplications = records.length;
  const successRate = totalApplications > 0 ? Math.round((allottedCount / totalApplications) * 100) : 0;

  // XP Breakdown
  const appXp = totalApplications * 50;
  const allotXp = allottedCount * 250;
  const profitXp = Math.floor(Math.max(0, totalProfit) / 1000) * 10;
  const streakXp = maxStreak * 150;
  const totalXp = appXp + allotXp + profitXp + streakXp;

  // Current Level Calculation
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
      break;
    }
  }

  const levelProgress = nextTier
    ? Math.min(100, Math.max(0, Math.round(((totalXp - currentTier.minXp) / (nextTier.minXp - currentTier.minXp)) * 100)))
    : 100;

  // Quest Validation
  const quests = QUESTS_DEF.map(q => {
    let completed = false;
    let progress = 0;
    if (q.id === 'first_bid') {
      completed = totalApplications >= 1;
      progress = Math.min(100, (totalApplications / 1) * 100);
    } else if (q.id === 'first_allotment') {
      completed = allottedCount >= 1;
      progress = Math.min(100, (allottedCount / 1) * 100);
    } else if (q.id === 'pan_syndicate') {
      const pCount = Math.max(uniquePans.size, applicants.length);
      completed = pCount >= 3;
      progress = Math.min(100, (pCount / 3) * 100);
    } else if (q.id === 'streak_3') {
      completed = maxStreak >= 3;
      progress = Math.min(100, (maxStreak / 3) * 100);
    } else if (q.id === 'century_club') {
      completed = totalProfit >= 100000;
      progress = Math.min(100, (totalProfit / 100000) * 100);
    } else if (q.id === 'sme_conqueror') {
      completed = smeAllottedCount >= 1;
      progress = Math.min(100, (smeAllottedCount / 1) * 100);
    } else if (q.id === 'power_bidder') {
      completed = totalApplications >= 20;
      progress = Math.min(100, (totalApplications / 20) * 100);
    }
    return { ...q, completed, progress: Math.round(progress) };
  });

  return {
    allottedCount,
    currentStreak,
    maxStreak,
    totalProfit,
    successRate,
    totalApplications,
    totalXp,
    currentTier,
    nextTier,
    levelProgress,
    quests,
    uniquePansCount: uniquePans.size
  };
}

export function calculateSyndicateLuck(records = [], applicants = []) {
  // Map applicants by key
  const applicantStats = {};

  // Initialize from applicants master
  applicants.forEach(app => {
    const key = (app.name || app.pan || app.id).trim();
    applicantStats[key] = {
      id: app.id,
      name: app.name || 'Member',
      pan: app.pan || 'N/A',
      family: app.family || 'Primary Family',
      commissionPct: Number(app.commissionPct || 0),
      appliedCount: 0,
      allottedCount: 0,
      totalProfit: 0,
      streak: 0,
      maxStreak: 0,
      lastStatus: null
    };
  });

  // Reconcile with records
  records.forEach(r => {
    const key = (r.applicantName || r.pan || 'Unknown').trim();
    if (!applicantStats[key]) {
      applicantStats[key] = {
        id: r.applicantId || key,
        name: r.applicantName || 'Member',
        pan: r.pan || 'N/A',
        family: r.family || 'Syndicate',
        commissionPct: 0,
        appliedCount: 0,
        allottedCount: 0,
        totalProfit: 0,
        streak: 0,
        maxStreak: 0,
        lastStatus: null
      };
    }

    const stat = applicantStats[key];
    stat.appliedCount++;

    const isAllotted = String(r.status || r.alloted || '').toUpperCase() === 'ALLOTTED' || parseFloat(r.alloted) > 0;
    const profit = Number(r.profit || r.listingProfit || 0);

    if (isAllotted) {
      stat.allottedCount++;
      stat.streak++;
      if (stat.streak > stat.maxStreak) stat.maxStreak = stat.streak;
      if (profit > 0) stat.totalProfit += profit;
    } else {
      stat.streak = 0;
    }
  });

  // Calculate Luck Index & Titles
  const members = Object.values(applicantStats).map(m => {
    // Benchmark expected win rate is ~12.5% for general retail quotas
    const expectedWins = Math.max(0.15, m.appliedCount * 0.125);
    const luckAlpha = m.appliedCount > 0 ? (m.allottedCount / expectedWins) : 0;
    const luckScore = Math.round(luckAlpha * 100);

    let accolade = 'Standard';
    let accoladeIcon = '👤';
    let accoladeColor = 'text-zinc-400';

    if (luckScore >= 180 && m.allottedCount >= 2) {
      accolade = 'Golden Touch';
      accoladeIcon = '👑';
      accoladeColor = 'text-amber-400';
    } else if (m.maxStreak >= 3) {
      accolade = 'Streak Maestro';
      accoladeIcon = '🔥';
      accoladeColor = 'text-orange-400';
    } else if (m.totalProfit >= 50000) {
      accolade = 'Profit Titan';
      accoladeIcon = '💎';
      accoladeColor = 'text-emerald-400';
    } else if (m.appliedCount >= 10) {
      accolade = 'Syndicate Anchor';
      accoladeIcon = '🛡️';
      accoladeColor = 'text-indigo-400';
    }

    return {
      ...m,
      expectedWins: Number(expectedWins.toFixed(2)),
      luckAlpha: Number(luckAlpha.toFixed(2)),
      luckScore,
      winRate: m.appliedCount > 0 ? Math.round((m.allottedCount / m.appliedCount) * 100) : 0,
      accolade,
      accoladeIcon,
      accoladeColor
    };
  });

  // Sort by luck score & win count descending
  members.sort((a, b) => (b.luckScore - a.luckScore) || (b.allottedCount - a.allottedCount) || (b.totalProfit - a.totalProfit));

  return members;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LEVEL_TIERS,
    QUESTS_DEF,
    calculateGamificationStats,
    calculateSyndicateLuck
  };
}
