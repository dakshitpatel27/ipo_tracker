import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Globe, Grid, List, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    { path: '/ipo-master', label: 'IPOs', icon: Globe },
    { path: '/application-matrix', label: 'Matrix', icon: Grid, isCenter: true },
    { path: '/records', label: 'Records', icon: List },
    { path: '/applicants', label: 'Applicants', icon: Users },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md select-none">
      <div className="bg-[#0c0c10]/90 backdrop-blur-2xl border border-white/15 rounded-full px-3 py-1.5 flex items-center justify-between shadow-[0_16px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative -top-3 flex flex-col items-center justify-center cursor-pointer group"
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotateZ: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-emerald-500 via-indigo-500 to-indigo-600 shadow-emerald-500/30 ring-4 ring-emerald-500/20 scale-110'
                      : 'bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-indigo-500/25'
                  }`}
                >
                  <Icon size={22} className="drop-shadow-md text-white" />
                </motion.div>
                <span className={`text-[9px] font-black tracking-wider uppercase mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-white'
                }`}>
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all ${
                isActive
                  ? 'text-emerald-400 font-extrabold scale-105'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}`}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
