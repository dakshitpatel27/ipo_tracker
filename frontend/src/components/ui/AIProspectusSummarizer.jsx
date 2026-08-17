import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles, AlertTriangle, ShieldCheck, TrendingUp, DollarSign, Activity, CheckCircle2 } from 'lucide-react';

const AIProspectusSummarizer = ({ ipoName = 'Sample IPO' }) => {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'peers' | 'risks'

  const MOCK_SUMMARY = {
    financialHealthScore: 88,
    revenueGrowth: '+24.5% YoY',
    ebitdaMargin: '18.2%',
    debtToEquity: '0.42 (Healthy)',
    promoterHoldingPost: '62.4%',
    freshIssueAmt: '₹1,200 Cr',
    offerForSaleAmt: '₹450 Cr',
    peers: [
      { name: ipoName, pe: 34.2, ronw: '21.5%', evEbitda: 18.4, status: 'IPO Target' },
      { name: 'Industry Leader A', pe: 42.1, ronw: '19.2%', evEbitda: 22.1, status: 'Listed Peer' },
      { name: 'Market Competitor B', pe: 38.5, ronw: '17.8%', evEbitda: 19.8, status: 'Listed Peer' },
    ],
    redFlags: [
      'Promoter lock-in release scheduled 30 days post listing.',
      '12% of revenue derived from top 3 enterprise clients.'
    ],
    strengths: [
      'Market leader in high-growth category with 38% market share.',
      'Debt-to-Equity reduced from 1.2 to 0.42 prior to IPO filing.'
    ]
  };

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
            onClick={() => setActiveTab('peers')}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'peers' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Peer Matrix
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
          <span className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">{MOCK_SUMMARY.financialHealthScore} <span className="text-xs text-emerald-500 font-normal">/ 100 (Strong Buy Outlook)</span></span>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-[var(--text-secondary)] block">Revenue Growth</span>
            <strong className="text-emerald-500">{MOCK_SUMMARY.revenueGrowth}</strong>
          </div>
          <div>
            <span className="text-[var(--text-secondary)] block">EBITDA Margin</span>
            <strong className="text-[var(--text-primary)]">{MOCK_SUMMARY.ebitdaMargin}</strong>
          </div>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[var(--text-secondary)] font-bold uppercase text-[10px]">Issue Breakup</span>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Fresh Issue:</span>
              <span className="font-mono text-emerald-500">{MOCK_SUMMARY.freshIssueAmt}</span>
            </div>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Offer for Sale (OFS):</span>
              <span className="font-mono text-amber-500">{MOCK_SUMMARY.offerForSaleAmt}</span>
            </div>
          </div>

          <div className="p-3 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[var(--text-secondary)] font-bold uppercase text-[10px]">Capital Structure</span>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Debt-to-Equity:</span>
              <span className="font-mono text-emerald-500">{MOCK_SUMMARY.debtToEquity}</span>
            </div>
            <div className="flex justify-between text-[var(--text-primary)] font-semibold">
              <span>Post-IPO Promoter Holding:</span>
              <span className="font-mono text-indigo-500">{MOCK_SUMMARY.promoterHoldingPost}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'peers' && (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Company</th>
                <th>P/E Ratio</th>
                <th>RoNW (%)</th>
                <th>EV/EBITDA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SUMMARY.peers.map((peer, idx) => (
                <tr key={idx} className={peer.name === ipoName ? 'bg-indigo-500/10 font-bold' : ''}>
                  <td className="text-white">{peer.name}</td>
                  <td className="font-mono text-emerald-400">{peer.pe}x</td>
                  <td className="font-mono text-indigo-300">{peer.ronw}</td>
                  <td className="font-mono">{peer.evEbitda}x</td>
                  <td>
                    <span className={`badge ${peer.name === ipoName ? 'badge-indigo' : 'badge-gray'}`}>
                      {peer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-3 text-xs">
          <div>
            <span className="font-bold text-rose-400 flex items-center gap-1 mb-1">
              <AlertTriangle size={13} /> Identified Red Flags & Valuation Risks
            </span>
            <ul className="space-y-1 pl-4 list-disc text-rose-200">
              {MOCK_SUMMARY.redFlags.map((rf, idx) => (
                <li key={idx}>{rf}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
              <CheckCircle2 size={13} /> Key Business Strengths
            </span>
            <ul className="space-y-1 pl-4 list-disc text-emerald-200">
              {MOCK_SUMMARY.strengths.map((st, idx) => (
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
