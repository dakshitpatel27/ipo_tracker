import React from 'react';
import { Trophy, Award, Flame, Zap, Crown } from 'lucide-react';

const BADGES = [
  { id: 'legend', title: 'IPO Legend', desc: 'Achieved > ₹100,000 in total net profits', icon: Crown, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'streak', title: 'Unstoppable Streak', desc: 'Got 3 consecutive IPO allotments', icon: Flame, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { id: 'hni', title: 'HNI Trader', desc: 'Applied in sHNI / bHNI quota category', icon: Zap, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { id: 'taxmaster', title: 'Tax Wizard', desc: 'Generated CA-Ready Tax Audit & ITR-2 Export', icon: Trophy, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
];

export default function TraderBadges() {
  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
          <Trophy size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Trader Milestones & Badges</h3>
          <p className="text-xs text-[var(--text-muted)]">Gamified investor achievements unlocked through trading activity</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {BADGES.map(b => {
          const Icon = b.icon;
          return (
            <div key={b.id} className={`p-3.5 rounded-xl border flex flex-col items-center text-center space-y-2 ${b.color}`}>
              <Icon size={24} />
              <div>
                <span className="font-bold block text-white">{b.title}</span>
                <span className="text-[10px] opacity-70 block mt-0.5">{b.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
