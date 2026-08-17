import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Wallet, Receipt, UserCircle } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    { path: '/records', label: 'Records', icon: List },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/profile', label: 'Profile', icon: UserCircle },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-[#27272a] px-1 sm:px-3 py-1 sm:py-1.5 flex items-center justify-around select-none shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-[56px] ${
              isActive
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isActive ? 'bg-indigo-500/15 border border-indigo-500/30' : ''}`}>
              <Icon size={18} />
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
