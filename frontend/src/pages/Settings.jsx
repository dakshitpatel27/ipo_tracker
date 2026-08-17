import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Download, Trash2, ShieldAlert, BellRing, User, Monitor, Key, LogOut, RefreshCw, Layers, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import CustomFieldsManager from '../components/ui/CustomFieldsManager';
import ImportHistoryDrawer from '../components/ui/ImportHistoryDrawer';
import PasskeyAuth from '../components/ui/PasskeyAuth';
import ThemeStudio from '../components/ui/ThemeStudio';
import ThemeSwitcher from '../components/ui/ThemeSwitcher';
import AppDownloadCard from '../components/ui/AppDownloadCard';
import { useNavigate } from 'react-router-dom';

const TelegramSettingsForm = () => {
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getTelegramSettings();
        if (data) {
          setTelegramToken(data.telegramToken || '');
          setTelegramChatId(data.telegramChatId || '');
          setTelegramAlerts(data.telegramAlerts !== 0);
        }
      } catch (e) {}
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveTelegramSettings({
        telegramToken,
        telegramChatId,
        telegramAlerts
      });
      toast.success('Telegram Bot settings saved!');
    } catch (err) {
      toast.error(err.message || 'Failed to save Telegram settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!telegramToken || !telegramChatId) {
      toast.error('Please enter Bot Token and Chat ID first');
      return;
    }
    setTesting(true);
    try {
      await api.testTelegramBot(telegramChatId, telegramToken);
      toast.success('🎉 Test message sent to your Telegram chat!');
    } catch (err) {
      toast.error(err.message || 'Telegram test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-black/20 p-4 rounded-xl border border-border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1">Telegram Bot Token (from @BotFather)</label>
          <input
            type="password"
            placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRs..."
            value={telegramToken}
            onChange={e => setTelegramToken(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1">Telegram Chat ID / Channel Username</label>
          <input
            type="text"
            placeholder="e.g. 987654321 or @my_ipo_channel"
            value={telegramChatId}
            onChange={e => setTelegramChatId(e.target.value)}
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={telegramAlerts}
            onChange={e => setTelegramAlerts(e.target.checked)}
            className="rounded border-white/20 bg-transparent text-indigo-500"
          />
          Enable Telegram Alerts for GMP Surges & Allotments
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            {testing ? 'Sending Test...' : 'Send Test Alert'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {loading ? 'Saving...' : 'Save Telegram Config'}
          </button>
        </div>
      </div>
    </form>
  );
};

const WhatsappSettingsForm = () => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadWhatsapp() {
      try {
        const settings = await api.getWhatsappSettings();
        if (settings) {
          setWhatsappNumber(settings.whatsappNumber || '');
          setWhatsappAlerts(!!settings.whatsappAlerts);
        }
      } catch (e) {}
    }
    loadWhatsapp();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveWhatsappSettings({ whatsappNumber, whatsappAlerts });
      toast.success('💬 WhatsApp alert settings saved!');
    } catch (err) {
      toast.error(err.message || 'Failed to save WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!whatsappNumber) {
      toast.error('Please enter your WhatsApp phone number first');
      return;
    }
    setTesting(true);
    try {
      await api.testWhatsapp(whatsappNumber);
      toast.success('📲 Test alert sent to your WhatsApp number!');
    } catch (err) {
      toast.error(err.message || 'WhatsApp test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-black/20 p-4 rounded-xl border border-border space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-emerald-400 font-bold text-xs">💬 WhatsApp Instant Gateway</span>
      </div>
      <div>
        <label className="block text-xs font-semibold text-white/80 mb-1">WhatsApp Mobile Number (with country code)</label>
        <input
          type="text"
          placeholder="e.g. +919876543210"
          value={whatsappNumber}
          onChange={e => setWhatsappNumber(e.target.value)}
          className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={whatsappAlerts}
            onChange={e => setWhatsappAlerts(e.target.checked)}
            className="rounded border-white/20 bg-transparent text-emerald-500"
          />
          Enable Instant WhatsApp Alerts for Allotments & Live GMP Swings
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            {testing ? 'Sending...' : 'Test WhatsApp'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {loading ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </form>
  );
};


const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('security'); // 'security', 'preferences', 'notifications', 'data'
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'clear_data', 'delete_account'

  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState(localStorage.getItem('ipo_theme') || 'dark');

  // Preferences state
  const [prefs, setPrefs] = useState({ emailNotifications: 1, pushNotifications: 1, inAppNotifications: 1, gamificationEnabled: 0 });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // 2FA state
  const [is2FaEnabled, setIs2FaEnabled] = useState(user?.totpEnabled || false);
  const [twoFaSetup, setTwoFaSetup] = useState(null); // { qrCode, secret }
  const [totpCode, setTotpCode] = useState('');
  const [verifying2Fa, setVerifying2Fa] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load notification preferences
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoadingPrefs(true);
        const data = await api.getNotificationPreferences();
        if (data) {
          setPrefs(data);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e.message);
      } finally {
        setLoadingPrefs(false);
      }
    }
    loadSettings();
  }, []);

  // Fetch active sessions
  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await api.getSessions();
      setSessions(data || []);
    } catch (e) {
      console.error('Failed to load sessions:', e.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadSessions();
    }
  }, [activeTab]);

  const handleExportCSV = () => {
    navigate('/records');
    toast('Use the Export button in the Records page to download your transaction CSV.', { icon: '📋' });
  };

  const handleExportJSON = async () => {
    try {
      toast.loading('Preparing profile export...', { id: 'export-json' });
      await api.exportAllUserData();
      toast.success('All data exported successfully!', { id: 'export-json' });
    } catch (e) {
      toast.error('Export failed: ' + e.message, { id: 'export-json' });
    }
  };

  const handleClearData = () => {
    setConfirmAction('clear_data');
    setShowConfirm(true);
  };

  const handleDeleteAccount = () => {
    setConfirmAction('delete_account');
    setShowConfirm(true);
  };

  const confirmActionExecution = async () => {
    setShowConfirm(false);
    if (confirmAction === 'clear_data') {
      try {
        const records = await api.getRecords();
        await Promise.all(records.map(r => api.deleteRecord(r.id)));
        toast.success(`Cleared ${records.length} records successfully.`);
      } catch(e) {
        toast.error('Failed to clear data: ' + e.message);
      }
    } else if (confirmAction === 'delete_account') {
      try {
        toast.loading('Deleting account...', { id: 'del-acc' });
        await api.deleteUserAccount();
        toast.success('Account permanently deleted.', { id: 'del-acc' });
        // Purge tokens and reload
        localStorage.removeItem('ipo_token');
        localStorage.removeItem('ipo_user');
        window.location.reload();
      } catch(e) {
        toast.error('Failed to delete account: ' + e.message, { id: 'del-acc' });
      }
    }
  };

  const handleSavePreferences = async () => {
    try {
      localStorage.setItem('ipo_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      
      await api.updateNotificationPreferences(prefs);
      toast.success('Preferences saved successfully!');
    } catch(e) {
      toast.error('Failed to save preferences: ' + e.message);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await api.revokeSession(sessionId);
      if (res?.userRequiresApproval) {
        toast.success('Session revoked! User locked out and requires Admin approval to log back in.', { icon: '🔒' });
      } else {
        toast.success('Device session revoked successfully');
      }
      loadSessions();
    } catch(e) {
      toast.error('Failed to revoke session: ' + e.message);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await api.revokeAllSessions();
      toast.success('Revoked access for all other devices. User accounts locked until Admin re-approval.');
      loadSessions();
    } catch(e) {
      toast.error('Failed to revoke sessions: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-secondary">Manage security, active sessions, layout preferences, and self-service data options.</p>
      </div>

      {/* Settings Sub-navigation Tabs */}
      <div className="flex border-b border-border gap-2 pb-px overflow-x-auto">
        {[
          { id: 'app_download', label: 'Download App & PWA', icon: Download },
          { id: 'security', label: 'Security & Sessions', icon: ShieldAlert },
          { id: 'preferences', label: 'Display & Theme', icon: User },
          { id: 'notifications', label: 'Alert Channels & Webhooks', icon: BellRing },
          { id: 'custom_fields', label: 'Custom Fields', icon: Layers },
          { id: 'import_history', label: 'Import History', icon: Clock },
          { id: 'data', label: 'Account & Data', icon: Trash2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white bg-indigo-500/5'
                  : 'border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        
        {/* --- APP DOWNLOAD & PWA TAB --- */}
        {activeTab === 'app_download' && (
          <AppDownloadCard />
        )}

        {/* --- SECURITY TAB --- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <PasskeyAuth />

            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Two-Factor Authentication (TOTP)</h2>
              <div className="p-4 bg-black/20 border border-border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-white text-sm">Authenticator App (Google/Duo/Authy)</h3>
                  <p className="text-xs text-secondary">Verify verification tokens upon login to lock access to Demat and Bank details.</p>
                  <div className="pt-1">
                    {is2FaEnabled ? (
                      <span className="badge badge-emerald">2FA Active</span>
                    ) : (
                      <span className="badge badge-gray">2FA Disabled</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!is2FaEnabled && !twoFaSetup && (
                    <button onClick={async () => {
                      try {
                        setVerifying2Fa(true);
                        const res = await api.setup2FA();
                        setTwoFaSetup(res);
                      } catch(e) {
                        toast.error("Failed to initiate 2FA: " + e.message);
                      } finally {
                        setVerifying2Fa(false);
                      }
                    }} className="btn-primary flex items-center gap-2">
                      <Key size={14} /> Enable 2FA
                    </button>
                  )}
                  {is2FaEnabled && (
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        maxLength={6} 
                        value={totpCode} 
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        className="input-field max-w-[110px] text-center font-mono text-xs" 
                        placeholder="OTP Code" 
                      />
                      <button onClick={async () => {
                        if (!totpCode || totpCode.length !== 6) {
                          toast.error("Please enter a 6-digit code");
                          return;
                        }
                        try {
                          setVerifying2Fa(true);
                          await api.disable2FA(totpCode);
                          setIs2FaEnabled(false);
                          setTotpCode('');
                          toast.success("2FA disabled successfully");
                        } catch(e) {
                          toast.error(e.message || "Failed to disable 2FA");
                        } finally {
                          setVerifying2Fa(false);
                        }
                      }} className="px-3 py-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors text-xs font-semibold">
                        Disable 2FA
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {twoFaSetup && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-black/35 border border-border rounded-xl space-y-4">
                  <h4 className="font-semibold text-white text-sm">Configure Authenticator App</h4>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <img src={twoFaSetup.qrCode} alt="TOTP QR Code" className="w-32 h-32" />
                    </div>
                    <div className="space-y-2 text-xs text-gray-300 flex-1">
                      <p>1. Scan the QR code with your authenticator application.</p>
                      <p>2. Or, key in this secret code manually:</p>
                      <p className="font-mono bg-black/40 p-2 rounded border border-border text-emerald-400 select-all tracking-wider text-center text-sm">{twoFaSetup.secret}</p>
                      <p>3. Confirm setup by verification below:</p>
                      <div className="flex gap-2 items-center pt-2">
                        <input 
                          type="text" 
                          maxLength={6} 
                          value={totpCode} 
                          onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} 
                          className="input-field max-w-[120px] text-center font-mono" 
                          placeholder="000000" 
                        />
                        <button onClick={async () => {
                          if (!totpCode || totpCode.length !== 6) {
                            toast.error("Please enter a 6-digit code");
                            return;
                          }
                          try {
                            setVerifying2Fa(true);
                            await api.verify2FA(totpCode);
                            setIs2FaEnabled(true);
                            setTwoFaSetup(null);
                            setTotpCode('');
                            toast.success("2FA enabled successfully!");
                          } catch(e) {
                            toast.error(e.message || "Failed to verify 2FA token");
                          } finally {
                            setVerifying2Fa(false);
                          }
                        }} disabled={verifying2Fa} className="btn-primary">
                          Verify & Activate
                        </button>
                        <button onClick={() => { setTwoFaSetup(null); setTotpCode(''); }} className="btn-outline">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </section>


            {/* Session Management Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Active Sessions & Device Management</h2>
                  <button 
                    onClick={loadSessions} 
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Refresh Sessions"
                  >
                    <RefreshCw size={13} className={loadingSessions ? 'animate-spin' : ''} />
                  </button>
                </div>
                {sessions.filter(s => !s.isCurrent).length > 0 && (
                  <button 
                    onClick={handleRevokeAllOtherSessions} 
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-lg transition-colors text-xs font-semibold"
                  >
                    <LogOut size={13} /> Revoke All Other Devices ({sessions.filter(s => !s.isCurrent).length})
                  </button>
                )}
              </div>

              {/* Policy Banner */}
              {user?.subscription === 'free' && user?.role === 'user' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold text-amber-400 block mb-0.5">Free Tier Restriction — 1 Active Device Limit</span>
                    <span>Free accounts are restricted to <strong>1 active device login</strong> at a time. Logging in from a new device automatically terminates previous sessions. Upgrade to Pro for multi-device concurrent access.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span><strong>{user?.role === 'master' ? 'Master Admin' : user?.role === 'admin' ? 'Admin' : 'Pro Tier'}</strong> — Multi-device concurrent session management is active.</span>
                </div>
              )}

              {loadingSessions ? (
                <div className="p-4 rounded-xl bg-black/20 border border-border text-xs text-[var(--text-muted)] animate-pulse flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                  Fetching active session records...
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-6 rounded-xl bg-black/20 border border-border text-center text-xs text-[var(--text-muted)] space-y-2">
                  <Monitor size={24} className="mx-auto text-zinc-600" />
                  <p>No active sessions tracked.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <div 
                      key={sess.id} 
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                        sess.isCurrent 
                          ? 'bg-indigo-500/5 border-indigo-500/30 shadow-sm' 
                          : 'bg-[#141418] border-border hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2.5 rounded-lg shrink-0 ${sess.isCurrent ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                          <Monitor size={18} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {user?.role === 'master' && sess.username && (
                              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold font-mono">
                                @{sess.username}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-white truncate max-w-sm">
                              {sess.deviceAgent}
                            </span>
                            {user?.role === 'master' && (
                              <span className={`px-1.5 py-0.5 rounded text-[0.625rem] font-bold uppercase tracking-wider ${
                                sess.role === 'master' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                sess.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                sess.subscription === 'pro' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>
                                {sess.role === 'master' ? 'Master Admin' : sess.role === 'admin' ? 'Admin' : sess.subscription?.toUpperCase() || 'FREE'}
                              </span>
                            )}
                            {sess.isCurrent ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Current Session
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[0.65rem] font-bold uppercase tracking-wider">
                                Active Device
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.72rem] text-[var(--text-muted)] font-mono">
                            <span>IP: <strong className="text-zinc-300 font-normal">{sess.ipAddress}</strong></span>
                            <span>Login: <strong className="text-zinc-300 font-normal">{new Date(sess.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></span>
                            <span>Last Active: <strong className="text-zinc-300 font-normal">{new Date(sess.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      {!sess.isCurrent && (
                        <button 
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-3 py-1.5 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all text-xs font-semibold shrink-0"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* --- DISPLAY PREFERENCES TAB --- */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Display & Currency Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Default Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-field bg-black/40">
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              {/* Theme Switcher */}
              <div className="pt-4 border-t border-border">
                <ThemeSwitcher />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Celebration Toggles</h2>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white text-sm">Confetti & Celebrations</h4>
                  <p className="text-xs text-secondary font-medium mt-0.5">Enable visual animations (confetti) and trophy overlays when viewing successful allotments.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={prefs.gamificationEnabled === 1} 
                  onChange={e => setPrefs({...prefs, gamificationEnabled: e.target.checked ? 1 : 0})} 
                  className="rounded border-border text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-transparent" 
                />
              </div>
            </section>

            <div className="pt-6 border-t border-border flex justify-end">
              <button className="btn-primary flex items-center gap-2" onClick={handleSavePreferences}>
                <Save size={16} /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* --- NOTIFICATIONS TAB --- */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Alert Notification Channels</h2>
              {loadingPrefs ? <div className="text-xs text-[var(--text-muted)]">Loading preferences...</div> : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white text-sm">Email Alerts</h4>
                      <p className="text-xs text-secondary mt-0.5">Receive daily digests and notifications via email.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={prefs.emailNotifications === 1} 
                      onChange={e => setPrefs({...prefs, emailNotifications: e.target.checked ? 1 : 0})} 
                      className="rounded border-border text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-transparent" 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white text-sm">Push Notifications</h4>
                      <p className="text-xs text-secondary mt-0.5">Receive live browser alerts and updates.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={prefs.pushNotifications === 1} 
                      onChange={e => setPrefs({...prefs, pushNotifications: e.target.checked ? 1 : 0})} 
                      className="rounded border-border text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-transparent" 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white text-sm">In-App Inbox Alerts</h4>
                      <p className="text-xs text-secondary mt-0.5">Store notifications in your in-app inbox.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={prefs.inAppNotifications === 1} 
                      onChange={e => setPrefs({...prefs, inAppNotifications: e.target.checked ? 1 : 0})} 
                      className="rounded border-border text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-transparent" 
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Telegram Bot Section */}
            <section className="space-y-4 pt-4 border-t border-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>💬 Telegram Alert Bot Integration</span>
              </h2>
              <p className="text-xs text-secondary">Connect a Telegram Bot to receive instant GMP surges, daily digests, and allotment announcements directly on your Telegram app.</p>
              
              <TelegramSettingsForm />
              <WhatsappSettingsForm />
            </section>

            <div className="pt-6 border-t border-border flex justify-end">
              <button className="btn-primary flex items-center gap-2" onClick={handleSavePreferences}>
                <Save size={16} /> Save Alert Settings
              </button>
            </div>
          </div>
        )}

        {/* --- CUSTOM FIELDS TAB --- */}
        {activeTab === 'custom_fields' && (
          <CustomFieldsManager />
        )}

        {/* --- IMPORT HISTORY TAB --- */}
        {activeTab === 'import_history' && (
          <ImportHistoryDrawer />
        )}

        {/* --- ACCOUNT & DATA TAB --- */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Profile Backups & Self-Service Export</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Export Ledger (CSV)</h3>
                    <p className="text-xs text-secondary mt-1">Download transaction history ledger in standard CSV template.</p>
                  </div>
                  <button onClick={handleExportCSV} className="btn-outline flex items-center gap-2 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 text-xs py-1.5">
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Self-Service Profile Export (JSON)</h3>
                    <p className="text-xs text-secondary mt-1">Export profile details, applicant metadata, PANs, bank accounts, and transaction tables.</p>
                  </div>
                  <button onClick={handleExportJSON} className="btn-outline flex items-center gap-2 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 text-xs py-1.5">
                    <Download size={14} /> Export All Data (JSON)
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-border pb-2">Danger Zone</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex flex-col justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-rose-400 text-sm flex items-center gap-1.5">
                      <ShieldAlert size={16} /> Factory Reset
                    </h3>
                    <p className="text-xs text-secondary mt-1">Permanently purge all applicant, record, and transaction rows while retaining account profile and 2FA credentials.</p>
                  </div>
                  <button onClick={handleClearData} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold">
                    <Trash2 size={14} /> Factory Reset
                  </button>
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex flex-col justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-rose-400 text-sm flex items-center gap-1.5">
                      <ShieldAlert size={16} /> Delete Account
                    </h3>
                    <p className="text-xs text-secondary mt-1">Permanently delete user profile, 2FA credentials, family profiles, bank details, and all transaction sheets. This action is irreversible.</p>
                  </div>
                  <button onClick={handleDeleteAccount} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold">
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

      </div>
      
      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmActionExecution}
        title={confirmAction === 'clear_data' ? "Clear All Records" : "Delete Account"}
        message={
          confirmAction === 'clear_data'
            ? "WARNING: This will permanently delete ALL applicant and transaction records. Your account credentials will be kept. Are you sure?"
            : "WARNING: This will permanently delete your user profile, 2FA settings, applicants, bank details, and transaction tables. This action cannot be undone. Are you sure?"
        }
      />
    </div>
  );
};

export default Settings;
