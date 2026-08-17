import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api';
import { Bell, Check, Trash2, CheckCheck, X, AlertTriangle, Sparkles, Info, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons = {
  gmp: { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  allotment: { icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  system: { icon: Info, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  warning: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getUserNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => n.isRead === 0).length);
      }
    } catch (e) {
      console.error('Failed to fetch user notifications:', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllUserNotificationsRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (e) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markUserNotificationRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteUserNotification(id);
      fetchNotifications();
    } catch (e) {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-zinc-800 flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div key="notification-center-drawer-container" className="fixed inset-0 z-[100] overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0d0d10] border-l border-border z-20 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="badge badge-emerald text-[10px]">{unreadCount} unread</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 p-1"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-secondary hover:text-white rounded-lg hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-secondary space-y-3">
                    <Bell size={36} className="mx-auto text-zinc-600 opacity-50" />
                    <p className="text-sm font-semibold text-white">No notifications</p>
                    <p className="text-xs text-zinc-500">All alerts and system announcements will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const typeConfig = typeIcons[n.type] || typeIcons.system;
                    const Icon = typeConfig.icon;

                    return (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-xl border text-left transition-all relative group ${
                          n.isRead === 0
                            ? 'bg-indigo-500/5 border-indigo-500/20 shadow-sm'
                            : 'bg-surface/50 border-border/50 opacity-75'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.color} shrink-0 mt-0.5`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-semibold ${n.isRead === 0 ? 'text-white' : 'text-zinc-300'}`}>
                                {n.title}
                              </p>
                              {n.isRead === 0 && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-secondary mt-1 leading-relaxed break-words">{n.body}</p>
                            <p className="text-[10px] text-zinc-500 mt-2">
                              {new Date(n.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {n.isRead === 0 && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                              title="Mark as read"
                            >
                              <Check size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
