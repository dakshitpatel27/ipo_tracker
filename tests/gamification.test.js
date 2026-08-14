function calculateGamificationStats(records = []) {
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

describe('Gamification & Streak Calculation Engine', () => {
  test('calculateGamificationStats correctly computes win streaks and total profit', () => {
    const mockRecords = [
      { id: '1', status: 'ALLOTTED', profit: 15000, date: '2026-08-01' },
      { id: '2', status: 'ALLOTTED', profit: 20000, date: '2026-08-05' },
      { id: '3', status: 'NOT_ALLOTTED', profit: 0, date: '2026-08-08' },
      { id: '4', status: 'ALLOTTED', profit: 25000, date: '2026-08-10' }
    ];

    const stats = calculateGamificationStats(mockRecords);

    expect(stats.allottedCount).toBe(3);
    expect(stats.totalProfit).toBe(60000);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(2);
    expect(stats.successRate).toBe(75);
  });
});
