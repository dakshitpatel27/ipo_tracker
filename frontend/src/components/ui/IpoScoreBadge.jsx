import React from 'react';
import { Flame, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export function calculateIpoScore(gmp, price, qibSub = 0, retailSub = 0) {
  const gmpNum = parseFloat(gmp) || 0;
  const priceNum = parseFloat(price) || 1;
  const gmpPct = (gmpNum / priceNum) * 100;

  let score = 0;

  // GMP % contribution (up to 45 pts)
  if (gmpPct >= 50) score += 45;
  else if (gmpPct >= 30) score += 35;
  else if (gmpPct >= 15) score += 20;
  else if (gmpPct > 0) score += 10;

  // QIB Subscription contribution (up to 35 pts)
  const qib = parseFloat(qibSub) || 0;
  if (qib >= 50) score += 35;
  else if (qib >= 20) score += 25;
  else if (qib >= 5) score += 15;
  else if (qib > 0) score += 5;

  // Retail Subscription contribution (up to 20 pts)
  const retail = parseFloat(retailSub) || 0;
  if (retail >= 20) score += 20;
  else if (retail >= 5) score += 12;
  else if (retail > 0) score += 5;

  return Math.min(100, Math.max(5, Math.round(score)));
}

export default function IpoScoreBadge({ gmp, price, qibSub = 0, retailSub = 0 }) {
  const score = calculateIpoScore(gmp, price, qibSub, retailSub);

  if (score >= 65) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm" title={`AI Score: ${score}/100 — High Listing Gain Expected`}>
        <Flame size={13} className="text-emerald-400 fill-emerald-400/20" />
        High Gain ({score}/100)
      </span>
    );
  }

  if (score >= 35) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm" title={`AI Score: ${score}/100 — Moderate Listing Gain`}>
        <Zap size={13} className="text-amber-400 fill-amber-400/20" />
        Moderate ({score}/100)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm" title={`AI Score: ${score}/100 — High Risk / Low GMP`}>
      <AlertTriangle size={13} className="text-rose-400" />
      High Risk ({score}/100)
    </span>
  );
}
