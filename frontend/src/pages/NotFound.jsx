import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, TrendingUp, Layers, Wallet, CreditCard, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  const quickLinks = [
    { title: 'Dashboard', path: '/', icon: Home, desc: 'Portfolio metrics & overview' },
    { title: 'IPO Bids & Records', path: '/records', icon: Layers, desc: 'Manage all application entries' },
    { title: 'Bank Accounts', path: '/accounts', icon: Wallet, desc: 'Passbook & ASBA accounts' },
    { title: 'Expense Tracker', path: '/expenses', icon: CreditCard, desc: 'Personal finance & budgeting' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#09090b] cyber-grid-bg flex flex-col items-center justify-center p-6 relative overflow-y-auto">
      {/* Top Brand Header */}
      <div className="absolute top-6 left-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-white/10">
          <TrendingUp size={18} />
        </div>
        <span className="font-bold text-sm text-white tracking-tight">IPO Tracker</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl w-full text-center space-y-8 my-auto"
      >
        {/* Animated 404 Hero */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 rounded-full blur-3xl opacity-60 animate-pulse" />
          
          <div className="relative flex items-center justify-center gap-2 mb-2 select-none">
            <span className="text-7xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent font-mono drop-shadow-2xl">
              4
            </span>
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl backdrop-blur-md animate-bounce">
              <Search size={40} className="sm:w-12 sm:h-12 text-indigo-400" />
            </div>
            <span className="text-7xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent font-mono drop-shadow-2xl">
              4
            </span>
          </div>

          <span className="badge badge-indigo text-xs font-mono uppercase font-bold tracking-wider px-3 py-1 flex items-center gap-1.5 w-fit">
            <Sparkles size={12} /> Page Not Found
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2 max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lost in the Trading Floor?
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            The requested URL <code className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded font-mono border border-indigo-500/20">{location.pathname}</code> does not exist or may have been relocated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline py-2.5 px-5 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <Link
            to="/"
            className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Home size={16} /> Return to Dashboard
          </Link>
        </div>

        {/* Quick Navigation Cards */}
        <div className="pt-6 border-t border-border/60">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">
            Or jump directly to a active workspace section
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className="p-3.5 rounded-xl bg-surface-2 border border-border hover:border-indigo-500/40 hover:bg-surface-1 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon size={16} />
                    </div>
                    <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary">{item.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
