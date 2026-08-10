import React from 'react';
import { Sparkles, TrendingUp, Trophy, Clock, Target, ArrowUpRight } from 'lucide-react';

export default function InsightCard({ records = [] }) {
  // Compute smart analytics from user records
  const computeInsights = () => {
    if (!records || records.length === 0) {
      return [
        {
          title: "No Data Yet",
          subtitle: "Add your first IPO record to unlock smart insights",
          value: "0 Records",
          trend: "Get Started",
          icon: Sparkles,
          color: "indigo"
        }
      ];
    }

    // 1. Best Performing IPO
    const highestProfitRecord = [...records].sort((a, b) => (parseFloat(b.profit || b.netProfit || 0) - parseFloat(a.profit || a.netProfit || 0)))[0];
    const topIpoName = highestProfitRecord?.ipoName || 'N/A';
    const topIpoProfit = parseFloat(highestProfitRecord?.netProfit || highestProfitRecord?.profit || 0);

    // 2. Most Profitable Applicant
    const applicantMap = {};
    records.forEach(r => {
      const name = r.applicantName || 'Self';
      const profit = parseFloat(r.netProfit || r.profit || 0);
      applicantMap[name] = (applicantMap[name] || 0) + profit;
    });
    let topApplicant = 'N/A';
    let topAppProfit = 0;
    Object.entries(applicantMap).forEach(([name, val]) => {
      if (val > topAppProfit) {
        topApplicant = name;
        topAppProfit = val;
      }
    });

    // 3. Allotment Rate
    const appliedCount = records.filter(r => r.applied === 'Yes').length;
    const allotedCount = records.filter(r => r.alloted === 'Yes' || (parseFloat(r.shares) > 0 && r.alloted !== 'No')).length;
    const allotmentRate = appliedCount > 0 ? ((allotedCount / appliedCount) * 100).toFixed(0) : 0;

    // 4. Overall Net ROI
    const totalInvested = records.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    const totalProfit = records.reduce((acc, r) => acc + (parseFloat(r.netProfit || r.profit || 0)), 0);
    const roiPercent = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

    return [
      {
        title: "Top Performing IPO",
        value: topIpoName,
        detail: `+₹${topIpoProfit.toLocaleString('en-IN')}`,
        icon: Trophy,
        badge: "Highest Return",
        color: "emerald"
      },
      {
        title: "Top Family Applicant",
        value: topApplicant,
        detail: `₹${topAppProfit.toLocaleString('en-IN')} total gain`,
        icon: Target,
        badge: "Most Lucky",
        color: "indigo"
      },
      {
        title: "Allotment Win Rate",
        value: `${allotmentRate}%`,
        detail: `${allotedCount} of ${appliedCount} allotted`,
        icon: TrendingUp,
        badge: "Hit Ratio",
        color: "blue"
      },
      {
        title: "Portfolio Net ROI",
        value: `${roiPercent}%`,
        detail: totalProfit >= 0 ? `+₹${totalProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(totalProfit).toLocaleString('en-IN')}`,
        icon: Sparkles,
        badge: "Overall ROI",
        color: roiPercent >= 0 ? "emerald" : "red"
      }
    ];
  };

  const insights = computeInsights();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
            <Sparkles size={14} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Smart Portfolio Insights
          </h3>
        </div>
        <span className="text-[0.68rem] text-zinc-500 font-mono">Auto-generated</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {insights.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div
              key={idx}
              className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-4 transition-all duration-150 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{item.title}</span>
                <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {item.badge}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <h4 className="text-base font-bold text-white tracking-tight truncate">{item.value}</h4>
              </div>

              <div className="text-xs font-mono font-medium text-emerald-400 mt-1 flex items-center justify-between">
                <span>{item.detail}</span>
                <IconComponent size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
