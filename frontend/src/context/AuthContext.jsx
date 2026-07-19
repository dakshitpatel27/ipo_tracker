import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban } from 'lucide-react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const pollInterval = useRef(null);

  const [subscriptionTiers, setSubscriptionTiers] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('ipo_token');
    const storedUser = localStorage.getItem('ipo_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      api.setToken(token);
    }
    setLoading(false);
    
    // Fetch public settings for global state
    const fetchSettings = async () => {
       try {
           const data = await api.getPublicSettings();
           if (data.subscriptionTiers) {
               setSubscriptionTiers(JSON.parse(data.subscriptionTiers));
           } else {
               // Default tiers if none set in DB
               setSubscriptionTiers({
                  free: { name: 'Free', maxApplicants: 2, maxRecords: 10, hasAnalytics: false },
                  pro: { name: 'Pro', maxApplicants: 1000, maxRecords: 10000, hasAnalytics: true }
               });
           }
       } catch(e) {}
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (user && !isSuspended) {
      pollInterval.current = setInterval(async () => {
        try {
          const res = await api.getMe();
          if (res.user) {
            // Check suspension
            if (res.user.status === 'rejected') {
              setIsSuspended(true);
              clearInterval(pollInterval.current);
            } else if (res.user.role !== user.role || res.user.status !== user.status) {
              // Update user if role/status changed
              const updatedUser = { ...user, ...res.user };
              setUser(updatedUser);
              localStorage.setItem('ipo_user', JSON.stringify(updatedUser));
            }
          }
        } catch (e) {
          // Ignore network errors, but if strictly 401/403, we might want to log out.
          if (e.message === 'Invalid token' || e.message === 'Unauthorized') {
            logout();
          } else {
            console.error('Polling error:', e.message);
          }
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [user, isSuspended]);

  const login = async (username, password) => {
    const data = await api.login({ username, password });
    localStorage.setItem('ipo_token', data.token);
    localStorage.setItem('ipo_user', JSON.stringify(data.user));
    setUser(data.user);
    api.setToken(data.token);
  };

  const register = async (username, password, email) => {
    const data = await api.register({ username, password, email });
    if (data.message === 'registered_pending') {
      return data;
    }
    localStorage.setItem('ipo_token', data.token);
    localStorage.setItem('ipo_user', JSON.stringify(data.user));
    setUser(data.user);
    api.setToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ipo_token');
    localStorage.removeItem('ipo_user');
    setUser(null);
    setIsSuspended(false);
    api.setToken(null);
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, subscriptionTiers }}>
      {children}
      
      <AnimatePresence>
        {isSuspended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="glass-card w-full max-w-sm overflow-hidden border-rose-500/30"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <Ban size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white">Account Suspended</h3>
                <p className="text-sm text-secondary">Your account has been suspended by an administrator. You can no longer access this application.</p>
              </div>
              <div className="bg-black/20 p-4 border-t border-border">
                <button onClick={logout} className="w-full px-4 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-glow shadow-rose-500/20">
                  Return to Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
