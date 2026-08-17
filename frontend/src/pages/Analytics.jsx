import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, TrendingUp, Users, Trophy, Printer, Crown, Download } from 'lucide-react';
import PageLoader from '../components/ui/PageLoader';
import ApplicantHeatmap from '../components/ui/ApplicantHeatmap';
import TaxHarvestingPlanner from '../components/ui/TaxHarvestingPlanner';
import MonteCarloSimulator from '../components/ui/MonteCarloSimulator';
import MonthlyReportGenerator from '../components/ui/MonthlyReportGenerator';
import { getRecordProfit, isRecordAllotted } from '../utils/profitCalculator';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#8b5cf6'];

const Analytics = () => {
  const [records, setRecords] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [registrarData, setRegistrarData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sector', 'registrar'
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    async function load() {
      try {
        const [recs, sectors, registrars] = await Promise.all([
          api.getRecords(),
          api.getSectorAnalytics().catch(() => []),
          api.getRegistrarAnalytics().catch(() => [])
        ]);
        setRecords(recs);
        setSectorData(sectors);
        setRegistrarData(registrars);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Core Metrics ─────────────────────────────────────────────────────────
  const appliedCount = records.filter(r => r.applied === 'Yes').length;
  const allottedCount = records.filter(r => isRecordAllotted(r)).length;
  const winRate = appliedCount > 0 ? ((allottedCount / appliedCount) * 100).toFixed(1) : 0;
  const totalProfit = records.reduce((s, r) => s + getRecordProfit(r), 0);

  // ─── Profit by Applicant (Pie) ─────────────────────────────────────────────
  const applicantProfitMap = {};
  records.forEach(r => {
    const p = getRecordProfit(r);
    if (r.applicantName && p > 0) {
      applicantProfitMap[r.applicantName] = (applicantProfitMap[r.applicantName] || 0) + p;
    }
  });
  const profitByApplicant = Object.keys(applicantProfitMap).map(name => ({
    name, value: applicantProfitMap[name]
  })).sort((a, b) => b.value - a.value);

  // ─── Applications by Quota (Bar) ──────────────────────────────────────────
  const quotaMap = {};
  records.forEach(r => {
    if (r.quota && r.applied === 'Yes') {
      quotaMap[r.quota] = (quotaMap[r.quota] || 0) + 1;
    }
  });
  const quotaData = Object.keys(quotaMap).map(name => ({ name, count: quotaMap[name] }));

  // ─── Tax Ledger ────────────────────────────────────────────────────────────
  let stcg = 0, ltcg = 0, unrealized = 0;
  records.forEach(r => {
    const profit = getRecordProfit(r);
    if (profit > 0) {
      if (r.holdingStatus === 'Sold' && r.sellDate && r.listingDate) {
        const days = (new Date(r.sellDate) - new Date(r.listingDate)) / (1000 * 60 * 60 * 24);
        if (days > 365) ltcg += profit;
        else stcg += profit;
      } else if (r.holdingStatus === 'Sold') {
        stcg += profit;
      } else {
        unrealized += profit;
      }
    }
  });
  const estimatedTax = (stcg * 0.20) + (ltcg * 0.125);

  // ─── Feature 4: Applicant Leaderboard & Family Breakdown ─────────────────────
  const leaderboardMap = {};
  records.forEach(r => {
    const name = r.applicantName;
    if (!name) return;
    if (!leaderboardMap[name]) {
      leaderboardMap[name] = { name, totalProfit: 0, applied: 0, allotted: 0, totalAmount: 0 };
    }
    leaderboardMap[name].totalProfit += getRecordProfit(r);
    leaderboardMap[name].totalAmount += parseFloat(r.amount) || 0;
    if (r.applied === 'Yes') leaderboardMap[name].applied++;
    if (isRecordAllotted(r)) leaderboardMap[name].allotted++;
  });

  const leaderboard = Object.values(leaderboardMap)
    .map(a => ({
      ...a,
      winRate: a.applied > 0 ? ((a.allotted / a.applied) * 100).toFixed(1) : '0.0',
      avgProfit: a.allotted > 0 ? (a.totalProfit / a.allotted).toFixed(0) : 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);

  const maxProfit = leaderboard[0]?.totalProfit || 1;

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <PageLoader text="Computing portfolio analytics..." />;
  }

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="page-title">Analytics & Deep Insights 📊</h1>
          <p className="page-subtitle">P&L breakdowns, sector analytics, registrar stats, and tax estimation.</p>
        </div>
        <div className="flex items-center gap-2 print-hidden">
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <Crown size={14} /> Monthly Report
          </button>
          <button
            onClick={handlePrint}
            className="btn-outline flex items-center gap-2 text-xs"
          >
            <Printer size={15} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Analytics Sub-nav Tabs */}
      <div className="flex border-b border-border gap-2 pb-px overflow-x-auto print-hidden">
        {[
          { id: 'overview', label: 'Portfolio Overview & Tax' },
          { id: 'sector', label: `Sector Analysis (${sectorData.length})` },
          { id: 'registrar', label: `Registrar Performance (${registrarData.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white bg-indigo-500/5'
                : 'border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">

      {/* ─── Top KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 flex flex-col gap-2">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg w-10 h-10 flex items-center justify-center mb-1"><Target size={20} /></div>
          <span className="section-label">Allotment Win Rate</span>
          <h2 className="stat-number text-3xl text-white">{winRate}%</h2>
          <span className="text-xs text-[var(--text-muted)]">Based on {appliedCount} applications</span>
        </div>

        <div className="glass-card p-5 flex flex-col gap-2">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg w-10 h-10 flex items-center justify-center mb-1"><TrendingUp size={20} /></div>
          <span className="section-label">Total Realized Profit</span>
          <h2 className="stat-number text-3xl text-emerald-400">₹{totalProfit.toLocaleString('en-IN')}</h2>
          <span className="text-xs text-[var(--text-muted)]">Realized + unrealized gains</span>
        </div>

        <div className="glass-card p-5 flex flex-col gap-2">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg w-10 h-10 flex items-center justify-center mb-1"><Users size={20} /></div>
          <span className="section-label">Top Family Applicant</span>
          <h2 className="stat-number text-xl text-white truncate">{profitByApplicant[0]?.name || 'N/A'}</h2>
          <span className="text-xs text-[var(--text-muted)]">₹{(profitByApplicant[0]?.value || 0).toLocaleString('en-IN')} profit generated</span>
        </div>
      </div>

      {/* ─── Feature 4: Applicant P&L Leaderboard ──────────────────────────── */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" />
          Applicant P&L Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-secondary text-sm">No data to display yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-secondary border-b border-border">
                  <th className="pb-3 pl-2 text-left w-8">#</th>
                  <th className="pb-3 text-left">Applicant</th>
                  <th className="pb-3 text-right">Total Profit</th>
                  <th className="pb-3 text-right">Applied</th>
                  <th className="pb-3 text-right">Allotted</th>
                  <th className="pb-3 text-right">Win Rate</th>
                  <th className="pb-3 text-right">Avg / IPO</th>
                  <th className="pb-3 pr-2 text-left pl-4 min-w-[100px]">Profit Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {leaderboard.map((a, i) => (
                  <tr key={a.name} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-2">
                      {i === 0 ? <Crown size={16} className="text-amber-400" /> :
                       i === 1 ? <span className="text-gray-400 font-bold text-xs">2</span> :
                       i === 2 ? <span className="text-orange-400 font-bold text-xs">3</span> :
                       <span className="text-secondary text-xs">{i + 1}</span>}
                    </td>
                    <td className="py-4">
                      <span className="font-semibold text-gray-200">{a.name}</span>
                    </td>
                    <td className={`py-4 text-right font-bold font-mono ${a.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{Math.round(a.totalProfit).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 text-right text-gray-400">{a.applied}</td>
                    <td className="py-4 text-right text-gray-400">{a.allotted}</td>
                    <td className="py-4 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        parseFloat(a.winRate) >= 50 ? 'bg-emerald-500/10 text-emerald-400' :
                        parseFloat(a.winRate) >= 25 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>{a.winRate}%</span>
                    </td>
                    <td className="py-4 text-right text-gray-400 font-mono text-xs">₹{parseInt(a.avgProfit).toLocaleString('en-IN')}</td>
                    <td className="py-4 pl-4 pr-2">
                      <div className="bg-black/30 rounded-full h-2 w-full min-w-[80px]">
                        <div
                          className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full"
                          style={{ width: `${Math.max((a.totalProfit / maxProfit) * 100, 2)}%`, transition: 'width 0.8s ease' }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Family Allotment Heatmap */}
      <ApplicantHeatmap />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Profit by Applicant</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={profitByApplicant} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {profitByApplicant.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Applications by Quota</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quotaData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#545d6e" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#545d6e" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                  {quotaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ─── Tax Ledger ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
          <h3 className="text-lg font-bold text-white">Tax Ledger & Capital Gains</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const now = new Date();
                const url = api.getMonthlyDigestPdfUrl(now.getMonth() + 1, now.getFullYear());
                window.open(url, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-xs font-semibold print-hidden"
              title="Generate printable Monthly Digest combining expenses, cashflow & IPO gains"
            >
              <Printer size={14} /> Monthly Financial Digest (PDF)
            </button>
            <button
              onClick={() => {
                const token = localStorage.getItem('ipo_token');
                window.open(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api')}/reports/ca-tax-audit-pdf?token=${token}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors text-xs font-semibold print-hidden"
            >
              <Printer size={14} /> CA-Ready Tax Audit (PDF)
            </button>
            <button
              onClick={async () => {
                try {
                  toast.loading('Downloading ITR-Ready Tax Export...', { id: 'itr-export' });
                  await api.downloadItrTaxReport();
                  toast.success('ITR Tax Export downloaded successfully!', { id: 'itr-export' });
                } catch(e) {
                  toast.error('Failed to export tax report: ' + e.message, { id: 'itr-export' });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors text-xs font-semibold print-hidden"
            >
              <Download size={14} /> Download ITR Export (CSV)
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">STCG (Short Term)</p>
            <h4 className="text-xl font-bold text-rose-400">₹{stcg.toLocaleString('en-IN')}</h4>
            <p className="text-xs text-gray-500 mt-1">Tax rate: ~20%</p>
          </div>
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">LTCG (Long Term)</p>
            <h4 className="text-xl font-bold text-emerald-400">₹{ltcg.toLocaleString('en-IN')}</h4>
            <p className="text-xs text-gray-500 mt-1">Tax rate: ~12.5%</p>
          </div>
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">Unrealized Profit</p>
            <h4 className="text-xl font-bold text-blue-400">₹{unrealized.toLocaleString('en-IN')}</h4>
            <p className="text-xs text-gray-500 mt-1">Currently holding</p>
          </div>
          <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
            <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">Est. Tax Liability</p>
            <h4 className="text-xl font-bold text-indigo-400">₹{estimatedTax.toLocaleString('en-IN')}</h4>
            <p className="text-xs text-indigo-500 mt-1">FY24-25 rates</p>
          </div>
        </div>
      </motion.div>

      {/* Monte Carlo Simulator */}
      <MonteCarloSimulator />

      {/* Tax Loss Harvesting Assistant */}
      <TaxHarvestingPlanner records={records} />
      </div>
      )}

      {/* --- SECTOR ANALYSIS TAB --- */}
      {activeTab === 'sector' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Sector Breakdown</h3>
            {sectorData.length === 0 ? (
              <p className="text-secondary text-sm">No sector data tagged in records yet. Edit records to add sector information.</p>
            ) : (
              <div className="space-y-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sectorData.map(s => ({ name: s.sector, value: s.count }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {sectorData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-black/30 text-secondary font-semibold">
                      <tr>
                        <th className="px-4 py-3">Sector</th>
                        <th className="px-4 py-3 text-right"># IPOs</th>
                        <th className="px-4 py-3 text-right">Total Invested</th>
                        <th className="px-4 py-3 text-right">Total Profit</th>
                        <th className="px-4 py-3">Top Performer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {sectorData.map(s => (
                        <tr key={s.sector} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-semibold text-white">{s.sector}</td>
                          <td className="px-4 py-3 text-right text-secondary font-mono">{s.count}</td>
                          <td className="px-4 py-3 text-right text-white font-mono">₹{s.totalInvested?.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${s.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ₹{s.totalProfit?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-indigo-400 text-xs font-semibold">{s.bestIpo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REGISTRAR PERFORMANCE TAB --- */}
      {activeTab === 'registrar' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Registrar Allotment Success Rates</h3>
            {registrarData.length === 0 ? (
              <p className="text-secondary text-sm">No registrar data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-black/30 text-secondary font-semibold">
                    <tr>
                      <th className="px-4 py-3">Registrar</th>
                      <th className="px-4 py-3 text-right">Applied</th>
                      <th className="px-4 py-3 text-right">Allotted</th>
                      <th className="px-4 py-3 text-right">Win Rate</th>
                      <th className="px-4 py-3 pl-6">Win Rate Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {registrarData.map(r => (
                      <tr key={r.registrar} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-white">{r.registrar}</td>
                        <td className="px-4 py-3 text-right text-secondary font-mono">{r.applied}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-mono font-bold">{r.allotted}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            parseFloat(r.allotmentRate) >= 50 ? 'bg-emerald-500/10 text-emerald-400' :
                            parseFloat(r.allotmentRate) >= 20 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>{r.allotmentRate}%</span>
                        </td>
                        <td className="px-4 py-3 pl-6">
                          <div className="bg-black/30 rounded-full h-2 w-full max-w-[200px]">
                            <div
                              className="bg-indigo-500 h-2 rounded-full"
                              style={{ width: `${Math.min(parseFloat(r.allotmentRate), 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Feature 7: Print-only Full Table ──────────────────────────────── */}
      <div className="hidden print:block mt-8">
        <h3 className="text-lg font-bold mb-4">Full IPO Records</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 px-2">IPO Name</th>
              <th className="text-left py-2 px-2">Applicant</th>
              <th className="text-left py-2 px-2">Shares</th>
              <th className="text-left py-2 px-2">Price</th>
              <th className="text-left py-2 px-2">Allotted</th>
              <th className="text-left py-2 px-2">Profit</th>
              <th className="text-left py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-1.5 px-2">{r.ipoName}</td>
                <td className="py-1.5 px-2">{r.applicantName}</td>
                <td className="py-1.5 px-2">{r.shares}</td>
                <td className="py-1.5 px-2">₹{r.price}</td>
                <td className="py-1.5 px-2">{r.alloted || '-'}</td>
                <td className="py-1.5 px-2">₹{parseFloat(r.profit || 0).toLocaleString('en-IN')}</td>
                <td className="py-1.5 px-2">{r.holdingStatus || r.applied}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-4">Generated by IPO Tracker on {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <MonthlyReportGenerator isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  );
};

export default Analytics;
