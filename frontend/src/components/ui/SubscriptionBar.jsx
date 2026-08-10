import React from 'react';
import { Flame } from 'lucide-react';

export default function SubscriptionBar({ subscription = {} }) {
  const qib = parseFloat(subscription.qib || 0);
  const nii = parseFloat(subscription.nii || 0);
  const retail = parseFloat(subscription.retail || 0);
  const total = parseFloat(subscription.total || subscription.overall || 0);

  // Maximum scale for progress bar rendering (e.g. 50x)
  const maxScale = Math.max(total, 50);

  const getBarColor = (val) => {
    if (val >= 10) return 'bg-emerald-500';
    if (val >= 2) return 'bg-indigo-500';
    if (val >= 1) return 'bg-blue-500';
    return 'bg-zinc-600';
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between font-mono">
        <span className="text-[var(--text-secondary)] font-sans text-[0.72rem] flex items-center gap-1 font-semibold">
          <Flame size={12} className="text-orange-400" /> Subscription Progress
        </span>
        <span className="font-bold text-indigo-400 text-xs">{total}x Total</span>
      </div>

      <div className="space-y-1.5 font-mono text-[0.7rem]">
        {/* QIB Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[0.68rem] text-zinc-400">
            <span>QIB</span>
            <span className="font-semibold text-zinc-200">{qib}x</span>
          </div>
          <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(qib)} transition-all duration-300`}
              style={{ width: `${Math.min(100, (qib / maxScale) * 100)}%` }}
            />
          </div>
        </div>

        {/* NII Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[0.68rem] text-zinc-400">
            <span>NII / HNI</span>
            <span className="font-semibold text-zinc-200">{nii}x</span>
          </div>
          <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(nii)} transition-all duration-300`}
              style={{ width: `${Math.min(100, (nii / maxScale) * 100)}%` }}
            />
          </div>
        </div>

        {/* Retail Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[0.68rem] text-zinc-400">
            <span>Retail</span>
            <span className="font-semibold text-zinc-200">{retail}x</span>
          </div>
          <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(retail)} transition-all duration-300`}
              style={{ width: `${Math.min(100, (retail / maxScale) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
