import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, Settings, PieChart, Users,
  Globe, Shield, LogOut, UserCircle, CalendarDays,
  TrendingUp, ChevronRight, Bell, Check, Trash, Wallet, BookOpen, Receipt,
  FileSpreadsheet, Sparkles, Eye, Clock, UsersRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import ConfirmModal from '../ui/ConfirmModal';
import SmartImportModal from '../ui/SmartImportModal';
import ThemeSwitcher from '../ui/ThemeSwitcher';
import NotificationCenter from '../ui/NotificationCenter';

const Sidebar = ({ isOpen, setIsOpen, brandName = 'IPO Tracker' }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const navigate = useNavigate();

  const navSections = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Analytics', icon: PieChart, path: '/analytics' },
        { name: 'Watchlist', icon: Eye, path: '/watchlist' },
        { name: 'Timeline', icon: Clock, path: '/timeline' },
      ]
    },
    {
      label: 'Management',
      items: [
        { name: 'IPO Records', icon: List, path: '/records' },
        { name: 'Accounts', icon: Wallet, path: '/accounts' },
        { name: 'Expenses', icon: Receipt, path: '/expenses' },
        { name: 'Party Ledger', icon: BookOpen, path: '/party-ledger' },
        { name: 'Applicants', icon: Users, path: '/applicants' },
        { name: 'IPO Master', icon: Globe, path: '/ipo-master' },
        { name: 'Auto Allotment', icon: Check, path: '/allotment' },
        { name: 'Allotted Desk', icon: TrendingUp, path: '/allotted' },
        { name: 'IPO Calendar', icon: CalendarDays, path: '/calendar' },
        { name: 'Family Portfolio', icon: UsersRound, path: '/family' },
      ]
    },
    {
      label: 'Account',
      items: [
        { name: 'My Profile', icon: UserCircle, path: '/profile' },
        { name: 'Settings', icon: Settings, path: '/settings' },
      ]
    },
  ];

  const adminItem = { name: 'Admin Panel', icon: Shield, path: '/admin' };

  const getRoleBadge = () => {
    if (user?.role === 'master') return { label: 'Master Admin', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    if (user?.role === 'admin') return { label: 'Admin', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' };
    return { label: user?.subscription === 'pro' ? 'Pro' : 'Free', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  };

  const roleBadge = getRoleBadge();

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`
          fixed md:sticky top-0 left-0 h-screen w-64 z-50
          flex flex-col shrink-0
          border-r border-[var(--border)]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(24px)' }}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[var(--border)] shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-8 h-8 rounded-lg object-cover shadow-md shadow-emerald-500/20 border border-emerald-500/30" />
            <div>
              <div className="font-bold text-[0.875rem] text-white leading-tight tracking-tight">{brandName}</div>
              <div className="text-[0.6rem] text-[var(--text-muted)] font-medium tracking-wider uppercase mt-0.5">Portfolio Pro</div>
            </div>
          </div>
          <NotificationCenter />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2.5 space-y-4">
          {navSections.map(section => (
            <div key={section.label}>
              <div className="section-label px-2 mb-1">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `nav-item group ${isActive ? 'active' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={16}
                          strokeWidth={isActive ? 2.5 : 1.8}
                          className={isActive ? 'text-indigo-400' : 'text-[var(--text-muted)] group-hover:text-zinc-200 transition-colors'}
                        />
                        <span className="flex-1 min-w-0 truncate">{item.name}</span>
                        {isActive && (
                          <ChevronRight size={12} className="text-indigo-400/50 shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Admin item */}
          {(user?.role === 'admin' || user?.role === 'master') && (
            <div>
              <div className="section-label px-2 mb-1">System</div>
              <div className="space-y-0.5">
                <NavLink
                  to={adminItem.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `nav-item group ${isActive ? 'active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      <adminItem.icon
                        size={16}
                        strokeWidth={isActive ? 2.5 : 1.8}
                        className={isActive ? 'text-indigo-400' : 'text-[var(--text-muted)] group-hover:text-zinc-200 transition-colors'}
                      />
                      <span className="flex-1">{adminItem.name}</span>
                    </>
                  )}
                </NavLink>
              </div>
            </div>
          )}

          {/* Quick Smart Import Action */}
          <div className="pt-2">
            <button
              onClick={() => setShowSmartImport(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all shadow-lg shadow-indigo-500/10 group"
            >
              <Sparkles size={15} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
              <span>Smart Importer</span>
              <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded uppercase font-bold">New</span>
            </button>
          </div>
        </nav>

        {/* User Footer */}
        <div className="shrink-0 px-2.5 py-3 border-t border-[var(--border)] mb-14 md:mb-0">
          <div
            onClick={() => { navigate('/profile'); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer
              bg-[var(--surface-2)] border border-[var(--border)]
              hover:border-indigo-500/30 hover:bg-indigo-500/[0.04]
              transition-all duration-150 group"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={16} />}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-semibold text-zinc-200 truncate leading-tight">{user?.name || user?.username}</div>
              <div className={`text-[0.58rem] font-bold uppercase tracking-wider mt-0.5 inline-flex items-center px-1.5 py-0.2 rounded border ${roleBadge.color}`}>
                {roleBadge.label}
              </div>
            </div>
            {/* Theme Toggle */}
            <ThemeSwitcher compact />
            {/* Logout */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogoutConfirm(true); }}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all shrink-0 border border-zinc-700/50"
              title="Log Out"
            >
              <LogOut size={14} />
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

      <SmartImportModal
        isOpen={showSmartImport}
        onClose={() => setShowSmartImport(false)}
      />
    </>
  );
};

export default Sidebar;
