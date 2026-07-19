import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, PieChart, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card glass-card-hover p-6 relative overflow-hidden group"
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all duration-500`}></div>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs text-secondary font-medium tracking-wider uppercase mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight font-mono">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 shadow-[0_0_15px_rgba(var(--${color}-500),0.1)]`}>
        <Icon size={24} />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, invested: 0, profit: 0, rate: 0 });
  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const records = await api.getRecords();
        const total = records.length;
        const invested = records.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const profit = records.reduce((s, r) => s + (parseFloat(r.profit) || 0), 0);
        const applied = records.filter(r => r.applied === 'Yes').length;
        const alloted = records.filter(r => parseFloat(r.alloted) > 0).length;
        const rate = applied > 0 ? ((alloted / applied) * 100).toFixed(1) : 0;

        // Group profits by month for chart
        const monthlyProfits = {};
        records.forEach(r => {
          if (r.listingDate && parseFloat(r.profit)) {
            const date = new Date(r.listingDate);
            const month = date.toLocaleString('default', { month: 'short' });
            monthlyProfits[month] = (monthlyProfits[month] || 0) + parseFloat(r.profit);
          }
        });

        // Ensure chronological order by mapping a default set of recent months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartDataFormatted = months.map(m => ({
          name: m,
          profit: monthlyProfits[m] || 0
        })).filter(m => m.profit !== 0 || monthlyProfits[m] !== undefined); // Only show active months

        if (chartDataFormatted.length === 0) {
           chartDataFormatted.push({ name: 'No Data', profit: 0 });
        }

        setStats({ total, invested, profit, rate });
        setChartData(chartDataFormatted);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatCurrency = (val) => {
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-emerald-500">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio Overview</h1>
          <p className="text-sm text-secondary">Welcome back to your professional IPO tracker.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Activity size={18} />
          Sync Live Data
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Records" value={stats.total} icon={Target} color="emerald" delay={0.1} />
        <StatCard title="Total Invested" value={formatCurrency(stats.invested)} icon={PieChart} color="blue" delay={0.2} />
        <StatCard title="Total Profit" value={formatCurrency(stats.profit)} icon={TrendingUp} color="emerald" delay={0.3} />
        <StatCard title="Allotment Rate" value={`${stats.rate}%`} icon={Activity} color="amber" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.5, duration: 0.4 }}
          className="col-span-2 glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Profit Trajectory</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#545d6e" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#545d6e" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17,17,24,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.6, duration: 0.4 }}
          className="glass-card p-6 flex flex-col justify-center items-center text-center relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 opacity-50"></div>
           <div className="relative z-10">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
               </svg>
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
             <p className="text-sm text-secondary mb-6">Unlock advanced predictive analytics, tax loss harvesting, and priority API sync.</p>
             <button onClick={() => navigate('/analytics')} className="btn-primary w-full shadow-indigo-500/30 from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500">
                Unlock Features
             </button>
           </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
