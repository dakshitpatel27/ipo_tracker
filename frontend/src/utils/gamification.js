export function calculateGamificationStats(records = []) {
  const sorted = [...records].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  
  let allottedCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let totalProfit = 0;

  sorted.forEach(r => {
    const isAllotted = String(r.status || r.alloted || '').toUpperCase() === 'ALLOTTED' || parseFloat(r.alloted) > 0;
    const profit = Number(r.profit || r.listingProfit || 0);

    if (isAllotted) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateGamificationStats };
}
