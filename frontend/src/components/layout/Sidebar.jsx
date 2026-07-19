        import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Settings, PieChart, Users, Globe, Shield, LogOut, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';

const Sidebar = ({ isOpen, setIsOpen, brandName = 'IPO Tracker' }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'IPO Records', icon: List, path: '/records' },
    { name: 'Applicants', icon: Users, path: '/applicants' },
    { name: 'IPO Master', icon: Globe, path: '/ipo-master' },
    { name: 'Analytics', icon: PieChart, path: '/analytics' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  if (user?.role === 'admin' || user?.role === 'master') {
    navItems.push({ name: 'Admin Panel', icon: Shield, path: '/admin' });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
      <motion.aside 
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`fixed md:relative top-0 left-0 h-full md:h-auto transition-transform duration-300 w-64 glass-card md:m-4 flex flex-col z-40 overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-glow-primary flex items-center justify-center text-white relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
            <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-40 rounded-xl"></div>
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">{brandName}</h1>
            <p className="text-xs text-secondary font-medium tracking-wide uppercase">Terminal Pro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.filter(item => !item.adminOnly || user?.role === 'admin' || user?.role === 'master').map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow'
                  : 'text-secondary hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={20} strokeWidth={2.5} />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border shrink-0 bg-background/50">
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center justify-between bg-black/40 p-2 pl-3 rounded-xl border border-border/50 hover:border-emerald-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <UserCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-200 truncate">{user?.username}</div>
              <div className="text-[10px] text-emerald-500 font-bold tracking-wider">
                {user?.role === 'master' ? <span className="text-amber-400">MASTER ADMIN</span> : user?.role === 'admin' ? 'ADMINISTRATOR' : 'USER'}
              </div>
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setShowLogoutConfirm(true); }}
            className="p-2 text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </motion.aside>

      <ConfirmModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Log Out"
        message="Are you sure you want to log out of your session?"
        confirmText="Log Out"
      />
    </>
  );
};

export default Sidebar;
