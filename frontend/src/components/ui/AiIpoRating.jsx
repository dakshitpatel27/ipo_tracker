import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Sparkles, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AiIpoRating = ({ ipoName, gmp, price, subscriptionRetail, subscriptionQib, subscriptionNii, sector }) => {
  const [ratingData, setRatingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRating() {
      try {
        setLoading(true);
        const data = await api.getIpoRating({
          ipoName: ipoName || '',
          gmp: gmp || 0,
          price: price || 100,
          subscriptionRetail: subscriptionRetail || 0,
          subscriptionQib: subscriptionQib || 0,
          subscriptionNii: subscriptionNii || 0,
          sector: sector || ''
        });
        setRatingData(data);
      } catch (err) {
        console.error('Failed to get IPO rating:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRating();
  }, [ipoName, gmp, price, subscriptionRetail, subscriptionQib, subscriptionNii, sector]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-secondary animate-pulse">
        <Sparkles size={12} className="text-indigo-400" />
        <span>Scoring...</span>
      </div>
    );
  }

  if (!ratingData) return null;

  const { rating, maxScore, recommendation, factors, confidence } = ratingData;

  const getScoreColor = (score) => {
    if (score >= 8) return 'from-emerald-500 to-teal-400 text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6) return 'from-indigo-500 to-blue-400 text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    if (score >= 4) return 'from-amber-500 to-yellow-400 text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'from-rose-500 to-red-400 text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const colorClass = getScoreColor(rating);

  return (
    <div className="inline-flex items-center gap-2">
      {/* Badge */}
      <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${colorClass}`}>
        <Sparkles size={12} />
        <span className="font-extrabold text-xs font-mono">{rating}/{maxScore}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider pl-1 border-l border-white/20">
          {recommendation}
        </span>
      </div>
    </div>
  );
};

export default AiIpoRating;
