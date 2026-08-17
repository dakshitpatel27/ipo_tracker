import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, CheckCircle, Eye, EyeOff, LogOut,
  Mail, Calendar, Lock, Download, KeyRound, Save, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const Profile = () => {
  const { user, updateUserProfile, logout } = useAuth();
  
  // Profile editable fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({ name: name.trim(), email: email.trim() });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.put('/auth/password', { password });
      toast.success('Password updated successfully!');
      setPassword('');
    } catch (e) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await api.exportAllUserData();
      toast.success('Profile data exported successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getRoleBadge = () => {
    if (user?.role === 'master') return { label: 'Master Admin', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (user?.role === 'admin') return { label: 'Admin', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
    return { label: 'Investor', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
  };

  const roleBadge = getRoleBadge();
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <User className="text-indigo-400" size={28} /> My Profile
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5">Manage your personal details, account settings & security preferences.</p>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold text-xs hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-500/5 cursor-pointer shrink-0"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </motion.div>

      {/* Main Profile Header Banner Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar circle */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-indigo-800/20 border-2 border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-[0_0_30px_rgba(99,102,241,0.2)] shrink-0 select-none">
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : <User size={48} />)}
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {user?.name || user?.username}
              </h2>
              <div className="text-sm text-indigo-400 font-medium tracking-tight mt-0.5">
                @{user?.username}
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${roleBadge.color}`}>
                {(user?.role === 'admin' || user?.role === 'master') ? <Shield size={13} /> : <User size={13} />}
                {roleBadge.label}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${user?.subscription === 'pro' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                <Sparkles size={13} />
                {user?.subscription === 'pro' ? 'Pro Plan' : 'Free Tier'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                <CheckCircle size={13} /> Active Account
              </span>
            </div>

            {/* Account Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-secondary pt-2">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-indigo-400/70" />
                <span>{user?.email || 'No email attached'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-400/70" />
                <span>Member since {joinedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid Layout for Profile Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Edit Personal Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <User size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white tracking-tight">Personal Information</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="section-label block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter your full name..."
                />
              </div>

              <div>
                <label className="section-label block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="section-label block mb-1.5 text-zinc-500">Username (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="input-field w-full opacity-60 cursor-not-allowed bg-black/40"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary w-full justify-center py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-2"
                >
                  <Save size={15} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Section 2: Security & Change Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Lock size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">Security & Authentication</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="section-label block mb-1.5">Change Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field w-full pr-11 bg-black/40"
                    placeholder="Enter new password (min 6 chars)..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="btn-outline w-full justify-center py-2.5 text-xs sm:text-sm flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                >
                  <KeyRound size={15} />
                  <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary font-medium">Two-Factor Authentication (2FA)</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${user?.totpEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                  {user?.totpEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 3: Personal Data Backup & Export */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Download size={18} className="text-indigo-400" /> Account Data & Backup
            </h3>
            <p className="text-xs text-secondary mt-1 max-w-xl">
              Download a complete JSON export of your portfolio applications, applicant details, notifications, and personal profile audit logs.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-500/20 transition-all cursor-pointer shrink-0 shadow-lg shadow-indigo-500/5"
          >
            <Download size={15} />
            <span>{exporting ? 'Exporting Archive...' : 'Download Personal Data'}</span>
          </button>
        </div>
      </motion.div>

      {/* Confirmation Modal for Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Log Out"
        message="Are you sure you want to log out of your IPO Tracker session?"
        confirmText="Log Out"
      />
    </div>
  );
};

export default Profile;
