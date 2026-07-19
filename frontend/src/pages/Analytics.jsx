import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, TrendingUp, Users } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

const Analytics = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getRecords();
        setRecords(data);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute Analytics
  const appliedCount = records.filter(r => r.applied === 'Yes').length;
  const allottedCount = records.filter(r => parseFloat(r.alloted) > 0).length;
  const winRate = appliedCount > 0 ? ((allottedCount / appliedCount) * 100).toFixed(1) : 0;
  
  const totalProfit = records.reduce((s, r) => s + (parseFloat(r.profit) || 0), 0);

  // Profit by Applicant
  const applicantProfitMap = {};
  records.forEach(r => {
    if (r.applicantName && parseFloat(r.profit) > 0) {
      applicantProfitMap[r.applicantName] = (applicantProfitMap[r.applicantName] || 0) + parseFloat(r.profit);
    }
  });
  const profitByApplicant = Object.keys(applicantProfitMap).map(name => ({
    name, value: applicantProfitMap[name]
  })).sort((a,b) => b.value - a.value);

  // Application by Quota
  const quotaMap = {};
  records.forEach(r => {
    if (r.quota && r.applied === 'Yes') {
      quotaMap[r.quota] = (quotaMap[r.quota] || 0) + 1;
    }
  });
  const quotaData = Object.keys(quotaMap).map(name => ({
    name, count: quotaMap[name]
  }));

  // Tax Ledger
  let stcg = 0;
  let ltcg = 0;
  let unrealized = 0;

  records.forEach(r => {
    const profit = parseFloat(r.profit) || 0;
    if (profit > 0) {
      if (r.holdingStatus === 'Sold' && r.sellDate && r.listingDate) {
        const listDate = new Date(r.listingDate);
        const sellDate = new Date(r.sellDate);
        const days = (sellDate - listDate) / (1000 * 60 * 60 * 24);
        if (days > 365) ltcg += profit;
        else stcg += profit;
      } else if (r.holdingStatus === 'Sold') {
         stcg += profit; // Default to short term if dates missing
      } else {
         unrealized += profit;
      }
    }
  });

  const estimatedTax = (stcg * 0.20) + (ltcg * 0.125);

  if (loading) {
    return <div className="text-center text-emerald-500 py-20">Crunching numbers...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-secondary">Advanced insights and breakdowns of your IPO portfolio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col gap-2">
           <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-12 h-12 flex items-center justify-center mb-2"><Target size={24} /></div>
           <p className="text-sm text-secondary uppercase tracking-wider">Allotment Win Rate</p>
           <h2 className="text-3xl font-bold text-white">{winRate}%</h2>
           <p className="text-xs text-gray-400">Based on {appliedCount} total applications</p>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2">
           <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-12 h-12 flex items-center justify-center mb-2"><TrendingUp size={24} /></div>
           <p className="text-sm text-secondary uppercase tracking-wider">Total Profit</p>
           <h2 className="text-3xl font-bold text-white">₹{totalProfit.toLocaleString('en-IN')}</h2>
           <p className="text-xs text-gray-400">Cumulative realized gains</p>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2">
           <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-12 h-12 flex items-center justify-center mb-2"><Users size={24} /></div>
           <p className="text-sm text-secondary uppercase tracking-wider">Top Applicant</p>
           <h2 className="text-xl font-bold text-white truncate">{profitByApplicant[0]?.name || 'N/A'}</h2>
           <p className="text-xs text-gray-400">Generated ₹{profitByApplicant[0]?.value?.toLocaleString('en-IN') || 0} profit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Profit by Applicant</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={profitByApplicant} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {profitByApplicant.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} />
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
                  {quotaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 mt-6">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-border pb-2">Tax Ledger & Capital Gains</h3>
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
            <p className="text-xs text-indigo-500 mt-1">Based on FY24-25 budget</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
