import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Shows a countdown badge relative to a target date string.
 * @param {string} targetDate - ISO or YYYY-MM-DD date string
 * @param {string} label - e.g. "Closes" | "Lists" | "Opens"
 * @param {string} [variant] - "close" | "listing" | "open" — controls color theme
 */
const CountdownBadge = ({ targetDate, label = 'Closes', variant = 'close' }) => {
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return;

    const compute = () => {
      const now = new Date();
      const diff = target - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysLeft(days);
    };

    compute();
    const timer = setInterval(compute, 60 * 1000); // update every minute
    return () => clearInterval(timer);
  }, [targetDate]);

  if (daysLeft === null) return null;

  // Don't show for dates far in the past or future beyond 60 days
  if (daysLeft < -7 || daysLeft > 60) return null;

  let colorClass = '';
  let text = '';

  if (daysLeft < 0) {
    // Already past
    if (variant === 'listing') {
      text = 'Listed';
      colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    } else {
      return null; // Don't show closed IPOs
    }
  } else if (daysLeft === 0) {
    text = `${label} Today!`;
    colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse';
  } else if (daysLeft === 1) {
    text = `${label} Tomorrow`;
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  } else if (daysLeft <= 3) {
    text = `${label} in ${daysLeft}d`;
    colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/20';
  } else if (variant === 'listing') {
    text = `Lists in ${daysLeft}d`;
    colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/20';
  } else {
    text = `${label} in ${daysLeft}d`;
    colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colorClass}`}>
      <Clock size={9} />
      {text}
    </span>
  );
};

export default CountdownBadge;
