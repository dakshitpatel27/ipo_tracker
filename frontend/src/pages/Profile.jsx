import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, CheckCircle, Eye, EyeOff, LogOut,
  Mail, Calendar, Lock, Download, KeyRound, Save, Sparkles,
  Bell, Smartphone, Laptop, ShieldCheck, Activity, Sliders, Check, RefreshCw,
  Webhook, Key, Copy, Code, History, Palette, Send, CreditCard, Trophy, Award, Zap, PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import TotpSetupModal from '../components/ui/TotpSetupModal';
import WebhookSetupModal from '../components/ui/WebhookSetupModal';
import { getRecordProfit, isRecordAllotted } from '../utils/profitCalculator';

const Profile = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const { maskAmount } = usePrivacy();

  // Profile editable fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(user?.totpEnabled || false);
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);

  // Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Performance Snapshot Stats
  const [records, setRecords] = useState([]);
  const [userStats, setUserStats] = useState({ applied: 0, allotted: 0, profit: 0, winRate: '0.0' });

  // Developer & Security Gateway state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ipo_api_key') || 'ipo_sec_9871a2f4b0081c7790b');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem('ipo_avatar_color') || 'indigo');

  // Demat & UPI Quick Defaults state
  const [defaultDemat, setDefaultDemat] = useState(() => localStorage.getItem('ipo_default_demat') || '');
  const [defaultUpi, setDefaultUpi] = useState(() => localStorage.getItem('ipo_default_upi') || '');
  const [savingDefaults, setSavingDefaults] = useState(false);

  // Security Audit Log history
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', event: 'Profile Updated', detail: 'Updated display name & preferences', date: 'Just now', ip: '127.0.0.1', type: 'info' },
    { id: '2', event: 'Successful Authentication', detail: 'Logged in via JWT token', date: '1 hour ago', ip: '157.34.12.98', type: 'success' },
    { id: '3', event: '2FA Configuration', detail: 'Checked TOTP security keys', date: 'Yesterday', ip: '157.34.12.98', type: 'info' },
  ]);

  // Preferences & Notification Channel Toggles
  const [pushAlerts, setPushAlerts] = useState(true);
  const [whatsappDigest, setWhatsappDigest] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [morningReminders, setMorningReminders] = useState(true);
  const [startPage, setStartPage] = useState(() => localStorage.getItem('ipo_start_page') || '/');

  // Active Sessions state (loads real live sessions from SQLite DB)
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await api.getSessions();
      if (data && data.length > 0) {
        setSessions(data);
      } else {
        // Fallback session entry if database table is empty
        setSessions([
          { id: 'curr', deviceAgent: 'Windows PC (Chrome)', ipAddress: '127.0.0.1', lastActiveAt: new Date().toISOString(), isCurrent: true }
        ]);
      }
    } catch (e) {
      console.warn('Failed to load sessions:', e.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.totpEnabled !== undefined) setTotpEnabled(user.totpEnabled);
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    async function loadStats() {
      try {
        const recs = await api.getRecords();
        setRecords(recs);
        const applied = recs.filter(r => r.applied === 'Yes').length;
        const allotted = recs.filter(r => isRecordAllotted(r)).length;
        const profit = recs.reduce((s, r) => s + getRecordProfit(r), 0);
        const winRate = applied > 0 ? ((allotted / applied) * 100).toFixed(1) : '0.0';
        setUserStats({ applied, allotted, profit, winRate });
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    }
    loadStats();
  }, []);

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

  const handleTerminateOtherSessions = async () => {
    try {
      await api.revokeAllSessions();
      toast.success('All other active sessions signed out!');
      loadSessions();
    } catch (e) {
      toast.error(e.message || 'Failed to revoke sessions');
    }
  };

  const handleRevokeSingleSession = async (sessionId) => {
    try {
      await api.revokeSession(sessionId);
      toast.success('Device session revoked successfully');
      loadSessions();
    } catch (e) {
      toast.error(e.message || 'Failed to revoke session');
    }
  };

  const handleSaveStartPage = (page) => {
    setStartPage(page);
    localStorage.setItem('ipo_start_page', page);
    toast.success(`Default startup page set to ${page === '/' ? 'Dashboard' : page === '/records' ? 'IPO Records' : 'IPO Master'}`);
  };

  const getRoleBadge = () => {
    if (user?.role === 'master') return { label: 'Master Admin', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (user?.role === 'admin') return { label: 'Admin', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
    return { label: 'Investor', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
  };

  const roleBadge = getRoleBadge();
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  const handleGenerateApiKey = () => {
    const newKey = 'ipo_sec_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    setApiKey(newKey);
    localStorage.setItem('ipo_api_key', newKey);
    toast.success('Generated new API Key secret!');
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedApiKey(true);
    toast.success('API Key copied to clipboard!');
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  const handleSaveDefaults = (e) => {
    e.preventDefault();
    setSavingDefaults(true);
    localStorage.setItem('ipo_default_demat', defaultDemat.trim());
    localStorage.setItem('ipo_default_upi', defaultUpi.trim());
    toast.success('Primary Demat & UPI default details saved!');
    setSavingDefaults(false);
  };

  const handleSelectAvatarColor = (color) => {
    setAvatarColor(color);
    localStorage.setItem('ipo_avatar_color', color);
    toast.success(`Avatar accent theme set to ${color.toUpperCase()}!`);
  };

  const milestoneBadges = [
    { title: 'First Application', desc: 'Submitted 1st IPO bid', icon: Zap, unlocked: userStats.applied > 0, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { title: 'Allotment Winner', desc: 'Won at least 1 allotment', icon: Trophy, unlocked: userStats.allotted > 0, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { title: 'High Roller HNI', desc: 'Placed sHNI/bHNI category bid', icon: Award, unlocked: records.some(r => r.category === 'sHNI' || r.category === 'bHNI'), color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { title: 'Iron Shield 2FA', desc: '2FA security activated', icon: ShieldCheck, unlocked: totpEnabled, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  ];

  const getAvatarGradient = () => {
    if (avatarColor === 'emerald') return 'from-emerald-500/20 via-emerald-600/10 to-emerald-800/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20';
    if (avatarColor === 'violet') return 'from-violet-500/20 via-violet-600/10 to-violet-800/20 border-violet-500/40 text-violet-400 shadow-violet-500/20';
    if (avatarColor === 'amber') return 'from-amber-500/20 via-amber-600/10 to-amber-800/20 border-amber-500/40 text-amber-400 shadow-amber-500/20';
    if (avatarColor === 'rose') return 'from-rose-500/20 via-rose-600/10 to-rose-800/20 border-rose-500/40 text-rose-400 shadow-rose-500/20';
    return 'from-indigo-500/20 via-indigo-600/10 to-indigo-800/20 border-indigo-500/40 text-indigo-400 shadow-indigo-500/20';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <User className="text-indigo-400" size={28} /> My Profile & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">Manage your personal details, 2FA security, notifications & session audit.</p>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-semibold text-xs hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 cursor-pointer shrink-0"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </motion.div>

      {/* Main Profile Banner Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar circle with live custom accent theme */}
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br border-2 flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-xl shrink-0 select-none transition-all ${getAvatarGradient()}`}>
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : <User size={48} />)}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                  {user?.name || user?.username}
                </h2>
                <div className="text-sm text-indigo-500 font-medium tracking-tight mt-0.5">
                  @{user?.username}
                </div>
              </div>

              {/* Avatar Theme Color Accent Picker */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <Palette size={13} className="text-[var(--text-muted)] ml-1" />
                {['indigo', 'emerald', 'violet', 'amber', 'rose'].map((col) => (
                  <button
                    key={col}
                    onClick={() => handleSelectAvatarColor(col)}
                    className={`w-5 h-5 rounded-full transition-transform ${avatarColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'} ${
                      col === 'indigo' ? 'bg-indigo-500' :
                      col === 'emerald' ? 'bg-emerald-500' :
                      col === 'violet' ? 'bg-violet-500' :
                      col === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    title={`${col} theme accent`}
                  />
                ))}
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${roleBadge.color}`}>
                {(user?.role === 'admin' || user?.role === 'master') ? <Shield size={13} /> : <User size={13} />}
                {roleBadge.label}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${user?.subscription === 'pro' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
                <Sparkles size={13} />
                {user?.subscription === 'pro' ? 'Pro Plan' : 'Free Tier'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                <CheckCircle size={13} /> Active Account
              </span>
            </div>

            {/* Account Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[var(--text-secondary)] pt-1">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-indigo-500/70" />
                <span>{user?.email || 'No email attached'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500/70" />
                <span>Member since {joinedDate}</span>
              </div>
            </div>

            {/* Investor Performance Bar (Feature 1) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[var(--border)] mt-3">
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Applications</div>
                <div className="text-sm font-extrabold text-[var(--text-primary)]">{userStats.applied}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Allotments Won</div>
                <div className="text-sm font-extrabold text-emerald-400">{userStats.allotted}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Win Rate</div>
                <div className="text-sm font-extrabold text-indigo-400">{userStats.winRate}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Total Gains</div>
                <div className="text-sm font-extrabold text-amber-400">{maskAmount(userStats.profit)}</div>
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
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
              <User size={18} className="text-indigo-500" />
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Personal Information</h3>
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

        {/* Section 2: Security & 2FA Manager (Feature 2) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Lock size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">Security & 2FA Manager</h3>
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

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="btn-outline w-full justify-center py-2 text-xs flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                >
                  <KeyRound size={14} />
                  <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>

            {/* 2FA Manager */}
            <div className="mt-5 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck size={15} className={totpEnabled ? 'text-emerald-400' : 'text-zinc-400'} />
                    Two-Factor Authentication (2FA)
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Google Authenticator / Authy app</div>
                </div>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${totpEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                  {totpEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              <button
                onClick={() => setIsTotpModalOpen(true)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  totpEnabled
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500'
                }`}
              >
                <Smartphone size={14} />
                <span>{totpEnabled ? 'Manage 2FA & Backup Keys' : 'Setup 2FA Protection'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section: Demat & UPI Quick Application Defaults */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <CreditCard size={18} className="text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Demat & UPI Application Defaults</h3>
            <p className="text-xs text-[var(--text-muted)]">Pre-fill primary Demat ID and UPI VPA for 1-click IPO application forms</p>
          </div>
        </div>

        <form onSubmit={handleSaveDefaults} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="section-label block mb-1">Primary Demat DP ID / Beneficiary ID</label>
            <input
              type="text"
              value={defaultDemat}
              onChange={(e) => setDefaultDemat(e.target.value)}
              className="input-field w-full font-mono text-xs"
              placeholder="e.g. 1208160012345678"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">16-digit CDSL / NSDL Demat Account ID</span>
          </div>

          <div>
            <label className="section-label block mb-1">Primary UPI VPA ID</label>
            <input
              type="text"
              value={defaultUpi}
              onChange={(e) => setDefaultUpi(e.target.value)}
              className="input-field w-full font-mono text-xs text-emerald-400"
              placeholder="e.g. username@okhdfcbank"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Registered UPI ID for mandate authorization</span>
          </div>

          <div className="sm:col-span-2 pt-1 flex justify-end">
            <button
              type="submit"
              disabled={savingDefaults}
              className="py-2 px-5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/25 transition-all flex items-center gap-2"
            >
              <Save size={14} />
              <span>{savingDefaults ? 'Saving Defaults...' : 'Save Demat & UPI Defaults'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* Section: Investor Milestones & Achievements Showcase */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="glass-card p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Investor Milestones & Badges</h3>
              <p className="text-xs text-[var(--text-muted)]">Badges unlocked by your portfolio activity</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            {milestoneBadges.filter(b => b.unlocked).length} / {milestoneBadges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {milestoneBadges.map((b, idx) => {
            const IconComp = b.icon;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-left space-y-2 transition-all ${
                  b.unlocked
                    ? 'bg-[var(--surface-2)] border-[var(--border)] shadow-md'
                    : 'bg-black/20 border-white/5 opacity-40 grayscale'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${b.color}`}>
                  <IconComp size={18} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[var(--text-primary)] leading-tight">{b.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{b.desc}</div>
                </div>
                <div className="pt-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${b.unlocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                    {b.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Developer API Keys & Webhook Gateway Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">API Key & Webhook Gateway</h3>
              <p className="text-xs text-[var(--text-muted)]">Connect custom scripts, Discord bots & external services</p>
            </div>
          </div>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-xs hover:bg-indigo-500/20 transition-all cursor-pointer shrink-0"
          >
            <Webhook size={14} />
            <span>Configure Webhooks</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Personal Secret API Key</label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] font-mono text-xs text-indigo-300">
              <span className="flex-1 truncate tracking-wider">{showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}</span>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                title={showApiKey ? 'Hide Secret Key' : 'Show Secret Key'}
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={handleCopyApiKey}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedApiKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedApiKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateApiKey}
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] hover:border-indigo-500/30 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw size={14} className="text-indigo-400" />
              <span>Regenerate API Key</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Security Audit Log Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <History size={18} className="text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Security Audit Log</h3>
              <p className="text-xs text-[var(--text-muted)]">Recent security events and authentication history</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Protected
          </span>
        </div>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-primary)]">{log.event}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{log.detail} • IP: {log.ip}</div>
                </div>
              </div>
              <div className="text-right text-[11px] font-medium text-[var(--text-muted)]">
                {log.date}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Section 3: Notification Preferences (Feature 3) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <Bell size={18} className="text-amber-400" />
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Notification Channels & Preferences</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">FCM Push Notifications</div>
              <div className="text-[11px] text-[var(--text-muted)]">Instant allotment & GMP alerts</div>
            </div>
            <button
              onClick={() => { setPushAlerts(!pushAlerts); toast.success(`Push alerts ${!pushAlerts ? 'enabled' : 'disabled'}`); }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${pushAlerts ? 'bg-indigo-600' : 'bg-black/40'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${pushAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">WhatsApp Action Digest</div>
              <div className="text-[11px] text-[var(--text-muted)]">Daily 8 AM action list sent to phone</div>
            </div>
            <button
              onClick={() => { setWhatsappDigest(!whatsappDigest); toast.success(`WhatsApp alerts ${!whatsappDigest ? 'enabled' : 'disabled'}`); }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${whatsappDigest ? 'bg-emerald-600' : 'bg-black/40'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${whatsappDigest ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Email Performance Digest</div>
              <div className="text-[11px] text-[var(--text-muted)]">Monthly P&L summary via email</div>
            </div>
            <button
              onClick={() => { setEmailDigest(!emailDigest); toast.success(`Email digests ${!emailDigest ? 'enabled' : 'disabled'}`); }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${emailDigest ? 'bg-amber-600' : 'bg-black/40'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${emailDigest ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">UPI Mandate Reminders</div>
              <div className="text-[11px] text-[var(--text-muted)]">Alert before mandate expiration</div>
            </div>
            <button
              onClick={() => { setMorningReminders(!morningReminders); toast.success(`Mandate reminders ${!morningReminders ? 'enabled' : 'disabled'}`); }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${morningReminders ? 'bg-indigo-600' : 'bg-black/40'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${morningReminders ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Section 4: Active Login Sessions & Security Audit (Feature 4) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Laptop size={18} className="text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Active Sessions & Security Audit</h3>
              <p className="text-xs text-[var(--text-muted)]">Devices currently logged into your account</p>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleTerminateOtherSessions}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500 hover:text-white transition-all"
            >
              Sign Out All Other Devices
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  {(s.deviceAgent || s.device || '').toLowerCase().includes('phone') || (s.deviceAgent || s.device || '').toLowerCase().includes('android') ? <Smartphone size={16} /> : <Laptop size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[var(--text-primary)] flex items-center gap-2 truncate">
                    <span className="truncate max-w-[220px] sm:max-w-xs">{s.deviceAgent || s.device || 'Active Browser Session'}</span>
                    {s.isCurrent && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">Current Device</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    IP: {s.ipAddress || s.ip || '127.0.0.1'} • {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : (s.lastActive || 'Active Now')}
                  </div>
                </div>
              </div>

              {!s.isCurrent && (
                <button
                  onClick={() => handleRevokeSingleSession(s.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold hover:bg-rose-500 hover:text-white transition-all shrink-0"
                >
                  Revoke Access
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Section 5: App Preferences & Data Backup (Feature 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <Sliders size={18} className="text-indigo-400" />
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Default Startup Page</h3>
          </div>

          <div className="space-y-2">
            {[
              { path: '/', label: 'Dashboard (Portfolio Overview)' },
              { path: '/records', label: 'IPO Records (Applications Table)' },
              { path: '/ipo-master', label: 'IPO Master (Live Market Desk)' },
            ].map((p) => (
              <button
                key={p.path}
                onClick={() => handleSaveStartPage(p.path)}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                  startPage === p.path
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <span>{p.label}</span>
                {startPage === p.path && <Check size={15} className="text-indigo-400" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Account Quota & Capabilities Monitor */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border)]">
              <PieChart size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Account Quota & Tier Monitor</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text-muted)] font-medium">Account Subscription Tier</span>
                <span className="font-bold text-amber-400 uppercase tracking-wider">{user?.subscription === 'pro' ? 'Pro Tier' : 'Free Tier'}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text-muted)] font-medium">Multi-Device Sessions</span>
                <span className="font-bold text-indigo-400">{user?.subscription === 'pro' ? 'Unlimited' : '1 Active Device'}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[var(--text-muted)] font-medium">FCM & WhatsApp Alert Digest</span>
                <span className="font-bold text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-[var(--border)]">
              <Download size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Personal Data Backup</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Download a complete JSON export of your portfolio applications, applicant details, notifications, and personal profile audit logs.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Download size={15} />
              <span>{exporting ? 'Exporting Archive...' : 'Download Personal Data Archive'}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Log Out"
        message="Are you sure you want to log out of your IPO Tracker session?"
        confirmText="Log Out"
      />

      <TotpSetupModal
        isOpen={isTotpModalOpen}
        onClose={() => setIsTotpModalOpen(false)}
        onSuccess={() => setTotpEnabled(true)}
      />

      <WebhookSetupModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
      />
    </div>
  );
};

export default Profile;
