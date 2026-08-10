import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, Settings, PieChart, Users,
  Globe, Shield, LogOut, UserCircle, CalendarDays,
  TrendingUp, ChevronRight, Bell, Check, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import ConfirmModal from '../ui/ConfirmModal';
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => n.status === 'unread').length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch(e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch(e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      fetchNotifications();
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-1.5 text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors focus:outline-none flex items-center justify-center"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 bg-surface-2 border border-border rounded-xl shadow-xl z-[101] overflow-hidden flex flex-col max-h-96">
            <div className="p-3 border-b border-border flex justify-between items-center bg-surface shrink-0">
              <span className="font-semibold text-xs text-white">Notifications ({unreadCount})</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] text-emerald-400 hover:underline bg-transparent border-0 p-0 cursor-pointer">
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="text-center text-xs text-secondary py-8">Inbox is empty</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-2 rounded-lg border text-left transition-all ${n.status === 'unread' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-transparent border-transparent'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-white font-medium ${n.status === 'unread' ? 'font-bold' : ''}`}>{n.title}</p>
                        <p className="text-[10px] text-secondary mt-0.5 break-words">{n.body}</p>
                        <p className="text-[8px] text-secondary mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {n.status === 'unread' && (
                          <button onClick={() => handleMarkRead(n.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded bg-transparent border-0 cursor-pointer" title="Mark as read">
                            <Check size={10} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(n.id)} className="p-1 text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded bg-transparent border-0 cursor-pointer" title="Delete">
                          <Trash size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, setIsOpen, brandName = 'IPO Tracker' }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const navSections = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard',    icon: LayoutDashboard, path: '/' },
        { name: 'Analytics',    icon: PieChart,        path: '/analytics' },
      ]
    },
    {
      label: 'Management',
      items: [
        { name: 'IPO Records',     icon: List,            path: '/records' },
        { name: 'Applicants',      icon: Users,           path: '/applicants' },
        { name: 'IPO Master',      icon: Globe,           path: '/ipo-master' },
        { name: 'Auto Allotment',  icon: Check,           path: '/allotment' },
        { name: 'Allotted Desk',   icon: TrendingUp,      path: '/allotted' },
        { name: 'IPO Calendar',    icon: CalendarDays,    path: '/calendar' },
      ]
    },
    {
      label: 'Account',
      items: [
        { name: 'Settings',     icon: Settings,        path: '/settings' },
      ]
    },
  ];

  const adminItem = { name: 'Admin Panel', icon: Shield, path: '/admin' };

  const getRoleBadge = () => {
    if (user?.role === 'master') return { label: 'Master Admin', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    if (user?.role === 'admin')  return { label: 'Admin',        color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' };
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
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`
          fixed md:sticky top-0 left-0 h-screen w-64 z-40
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <TrendingUp size={17} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-[0.875rem] text-white leading-tight tracking-tight">{brandName}</div>
              <div className="text-[0.6rem] text-[var(--text-muted)] font-medium tracking-wider uppercase mt-0.5">Portfolio Pro</div>
            </div>
          </div>
          <NotificationBell />
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
        </nav>

        {/* User Footer */}
        <div className="shrink-0 px-2.5 py-3 border-t border-[var(--border)]">
          <div
            onClick={() => { navigate('/profile'); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer
              bg-[var(--surface-2)] border border-[var(--border)]
              hover:border-indigo-500/30 hover:bg-indigo-500/[0.04]
              transition-all duration-150 group"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <UserCircle size={16} />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-semibold text-zinc-200 truncate leading-tight">{user?.username}</div>
              <div className={`text-[0.58rem] font-bold uppercase tracking-wider mt-0.5 inline-flex items-center px-1.5 py-0.2 rounded border ${roleBadge.color}`}>
                {roleBadge.label}
              </div>
            </div>
            {/* Logout */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogoutConfirm(true); }}
              className="p-1 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all shrink-0"
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
    </>
  );
};

export default Sidebar;
