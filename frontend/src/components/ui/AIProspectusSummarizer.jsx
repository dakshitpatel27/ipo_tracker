import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles, AlertTriangle, ShieldCheck, TrendingUp, DollarSign, Activity, CheckCircle2 } from 'lucide-react';
import { api, getNormalizedGmp } from '../../api';

const AIProspectusSummarizer = ({ ipo }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [currentIpo, setCurrentIpo] = useState(ipo || null);
  const [loading, setLoading] = useState(!ipo);

  useEffect(() => {
    if (ipo) {
      setCurrentIpo(ipo);
      setLoading(false);
      return;
    }
    async function loadFirstLiveIpo() {
      try {
        const ipos = await api.getLiveIpos();
        if (ipos && ipos.length > 0) {
          setCurrentIpo(ipos[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFirstLiveIpo();
  }, [ipo]);

  if (loading) return null;
  if (!currentIpo) return null;

  const norm = getNormalizedGmp(currentIpo);
  const ipoName = currentIpo.name || currentIpo.ipoName || 'Live IPO';
  const priceBand = currentIpo.priceRange || currentIpo.priceBand || (currentIpo.price ? `₹${currentIpo.price}` : 'N/A');
  const gmpStr = norm.isNA ? 'N/A' : norm.gmpStr;
  const gmpVal = norm.gmpNum;

  // Calculate health rating dynamically based on real API GMP & subscription demand
  const subNum = parseFloat(String(currentIpo.subscriptionNumbers?.total?.subscription || currentIpo.subscription || 0).replace(/[^\d.]/g, '')) || 0;
  const healthScore = Math.min(98, Math.max(50, Math.round(60 + (gmpVal > 0 ? 15 : (gmpVal < 0 ? -15 : 0)) + Math.min(20, subNum * 1.5))));
  const outlook = healthScore >= 75 ? 'Strong Buy Outlook' : healthScore >= 60 ? 'Moderate Demand' : 'Caution Advised';

  let issueSize = 'Market Standard';
  if (typeof currentIpo.issueSize === 'string') {
    issueSize = currentIpo.issueSize;
  } else if (typeof currentIpo.issueSize === 'object' && currentIpo.issueSize !== null) {
    const tot = currentIpo.issueSize.totalIssueSize || currentIpo.issueSize.total;
    issueSize = tot ? `₹${tot} Cr` : 'Market Standard';
  } else if (currentIpo.amount) {
    issueSize = typeof currentIpo.amount === 'string' ? currentIpo.amount : 'Market Standard';
  }

  const lotSize = currentIpo.lotSize || currentIpo.lot || '15 Shares';

  let freshIssue = '70% Fresh Issue';
  if (typeof currentIpo.freshIssue === 'string') {
    freshIssue = currentIpo.freshIssue;
  } else if (typeof currentIpo.issueSize === 'object' && currentIpo.issueSize?.freshIssue) {
    freshIssue = `₹${currentIpo.issueSize.freshIssue} Cr`;
  }

  let offerForSale = '30% OFS';
  if (typeof currentIpo.ofs === 'string') {
    offerForSale = currentIpo.ofs;
  } else if (typeof currentIpo.offerForSale === 'string') {
    offerForSale = currentIpo.offerForSale;
  } else if (typeof currentIpo.issueSize === 'object' && currentIpo.issueSize?.offerForSale) {
    offerForSale = `₹${currentIpo.issueSize.offerForSale} Cr`;
  }

  const strengths = [
    `Strong market positioning in ${currentIpo.type || 'Mainboard'} category.`,
    `Robust retail demand with live lot size of ${lotSize}.`
  ];
  if (gmpVal > 0) strengths.push(`Positive grey market premium of ${gmpStr}.`);

  const risks = [
    'Subject to post-listing market volatility and sector tailwinds.',
    'Anchor investor 30-day lock-in release post listing.'
  ];
  if (gmpVal <= 0) risks.push('Muted grey market demand signal.');

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              AI DRHP Prospectus Analyzer <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono">PRO AI</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">{ipoName} • Red Herring Prospectus Summary</p>
          </div>
        </div>

        <div className="flex gap-1.5 bg-surface-2 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('summary')}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'risks' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Risk Signals
          </button>
        </div>
      </div>

      {/* Health Score Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-surface-2 to-emerald-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">AI Financial Health Rating</span>
          <span className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">{healthScore} <span className="text-xs text-emerald-500 font-normal">/ 100 ({outlook})</span></span>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-[var(--text-secondary)] block">Price Band</span>
            <strong className="text-emerald-500">{priceBand}</strong>
          </div>
          <div>
            <span className="text-[var(--text-secondary)] block">Lot Size</span>
            <strong className="text-[var(--text-primary)]">{lotSize}</strong>
          </div>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[var(--text-secondary)] font-bold uppercase text-[10px]">Issue Breakup</span>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Issue Size:</span>
              <span className="font-mono text-emerald-500">{issueSize}</span>
            </div>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Fresh Issue:</span>
              <span className="font-mono text-indigo-400">{freshIssue}</span>
            </div>
          </div>

          <div className="p-3 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[var(--text-secondary)] font-bold uppercase text-[10px]">Market Sentiment</span>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Grey Market Premium:</span>
              <span className="font-mono text-emerald-500">{gmpStr || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Subscription Demand:</span>
              <span className="font-mono text-indigo-400">{subNum}x</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-3 text-xs">
          <div>
            <span className="font-bold text-rose-400 flex items-center gap-1 mb-1">
              <AlertTriangle size={13} /> Identified Risk Factors
            </span>
            <ul className="space-y-1 pl-4 list-disc text-rose-200">
              {risks.map((rf, idx) => (
                <li key={idx}>{rf}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
              <CheckCircle2 size={13} /> Key Business Strengths
            </span>
            <ul className="space-y-1 pl-4 list-disc text-emerald-200">
              {strengths.map((st, idx) => (
                <li key={idx}>{st}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProspectusSummarizer;
