import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { Shield, Check, X, Trash2, User, ShieldOff, Ban, Activity, BarChart2, Settings as SettingsIcon, Download, ScrollText, Users, Terminal, Palette, LogIn, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import TestEmailModal from '../components/ui/TestEmailModal';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/ui/PageLoader';

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState('users');
  
  // Data States
  const [users, setUsers] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToImpersonate, setUserToImpersonate] = useState(null);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  
  // Custom Notification State
  const [notiTitle, setNotiTitle] = useState('');
  const [notiBody, setNotiBody] = useState('');
  const [sendingNoti, setSendingNoti] = useState(false);
  const [testChannel, setTestChannel] = useState('push');

  // FCM Master Table & Direct Push State
  const [fcmTokens, setFcmTokens] = useState([]);
  const [directPushTokenModal, setDirectPushTokenModal] = useState(null);
  const [directPushTitle, setDirectPushTitle] = useState('');
  const [directPushBody, setDirectPushBody] = useState('');
  const [sendingDirectPush, setSendingDirectPush] = useState(false);

  // FCM Token CRUD State
  const [fcmModalOpen, setFcmModalOpen] = useState(false);
  const [editingFcmToken, setEditingFcmToken] = useState(null);
  const [fcmForm, setFcmForm] = useState({ username: '', email: '', deviceType: 'Desktop Browser', token: '' });
  const [tokenToDeleteModal, setTokenToDeleteModal] = useState(null);

  // Settings State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [globalBanner, setGlobalBanner] = useState('');
  
  // Advanced Features State
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [brandNameLocal, setBrandNameLocal] = useState('');
  const [brandColorLocal, setBrandColorLocal] = useState('');
  
  // Phase 1 Features State
  const [cronJobs, setCronJobs] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkNotifyModalOpen, setBulkNotifyModalOpen] = useState(false);
  const [bulkNotifyForm, setBulkNotifyForm] = useState({ subject: '', body: '' });

  // Phase 2 Features State
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', bodyHtml: '' });
  const [templateToDelete, setTemplateToDelete] = useState(null);

  // Phase 3 Features State
  const [subscriptionTiers, setSubscriptionTiers] = useState({
      free: { name: 'Free', maxApplicants: 2, maxRecords: 10, hasAnalytics: false },
      pro: { name: 'Pro', maxApplicants: 1000, maxRecords: 10000, hasAnalytics: true }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users').catch(() => []);
      const userList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setUsers(userList);
      
      if (currentUser?.role === 'master' || currentUser?.role === 'admin') {
        const [logs, stats, sets, audit] = await Promise.all([
          api.getNotificationLogs().catch(() => []),
          api.getGlobalAnalytics().catch(() => null),
          api.getAdminSettings().catch(() => ({})),
          api.getAuditLogs().catch(() => [])
        ]);
        
        setNotificationLogs(Array.isArray(logs) ? logs : (logs?.data || []));
        setAnalytics(stats?.data || stats);
        
        const setsData = sets?.data || sets || {};
        setSettings(setsData);
        setAuditLogs(Array.isArray(audit) ? audit : (audit?.data || []));
        
        setSmtpHost(setsData.smtpHost || '');
        setSmtpPort(setsData.smtpPort || '');
        setSmtpUser(setsData.smtpUser || '');
        setSmtpPass(setsData.smtpPass || '');
        setGlobalBanner(setsData.globalBanner || '');
        setBrandNameLocal(setsData.brandName || 'IPO Tracker');
        setBrandColorLocal(setsData.brandColor || '');
        if (setsData.subscriptionTiers) {
           try { setSubscriptionTiers(JSON.parse(setsData.subscriptionTiers)); } catch(e) {}
        }
      }
    } catch (err) {
      console.error("AdminPanel loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleUpdateStatus = async (id, status, role = 'user', subscription = undefined) => {
    try {
      await api.put(`/users/${id}/status`, { status, role, subscription });
      toast.success(`User updated successfully`);
      loadData();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete}`);
      toast.success('User deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!notiTitle || !notiBody) return toast.error('Title and body are required');
    try {
      setSendingNoti(true);
      await api.broadcastNotification(notiTitle, notiBody);
      toast.success('Custom notification broadcasted to all users!');
      setNotiTitle('');
      setNotiBody('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to send notification');
      loadData();
    } finally {
      setSendingNoti(false);
    }
  };
  
  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return toast.error('Please fill in all SMTP fields first');
    }
    setTestEmailModalOpen(true);
  };

  const handleSendTestEmail = async ({ testEmail, subject, body }) => {
    try {
        setLoading(true);
        await api.sendTestEmail({ smtpHost, smtpPort, smtpUser, smtpPass, testEmail, subject, body });
        toast.success('Test email sent successfully!');
        loadData();
    } catch (err) {
        toast.error(err.message || 'Failed to send test email');
    } finally {
        setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
        await api.saveAdminSetting('smtpHost', smtpHost);
        await api.saveAdminSetting('smtpPort', smtpPort);
        await api.saveAdminSetting('smtpUser', smtpUser);
        await api.saveAdminSetting('smtpPass', smtpPass);
        await api.saveAdminSetting('globalBanner', globalBanner);
        await api.saveAdminSetting('brandName', brandNameLocal);
        await api.saveAdminSetting('brandColor', brandColorLocal);
        await api.saveAdminSetting('subscriptionTiers', JSON.stringify(subscriptionTiers));
        toast.success('System Settings Saved!');
        loadData();
    } catch (err) {
        toast.error('Failed to save settings');
    }
  };

  const handleImpersonate = async (id) => {
    try {
      const res = await api.impersonateUser(id);
      localStorage.setItem('ipo_master_token', localStorage.getItem('ipo_token'));
      localStorage.setItem('ipo_token', res.token);
      toast.success(`Impersonating ${res.user.username}...`);
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to impersonate user');
    }
  };

  const fetchConsoleLogs = async () => {
    try {
      const logs = await api.getLiveConsole();
      setConsoleLogs(logs);
    } catch(err) {
      toast.error('Failed to fetch logs');
    }
  };

  const fetchCronStatus = async () => {
    try {
      const jobs = await api.getCronJobs();
      setCronJobs(jobs);
    } catch (err) {
      toast.error('Failed to fetch cron status');
    }
  };

  const handleTriggerCron = async (job) => {
    try {
      await api.triggerCronJob(job);
      toast.success(`Job ${job} triggered successfully!`);
      fetchCronStatus();
    } catch (err) {
      toast.error('Failed to trigger job');
    }
  };

  const toggleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uId => uId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleBulkRole = async (role) => {
     if (!selectedUsers.length) return;
     try {
       await api.bulkUpdateUsers({ userIds: selectedUsers, role });
       toast.success(`Roles updated for ${selectedUsers.length} users`);
       setSelectedUsers([]);
       loadData();
     } catch (err) {
       toast.error('Bulk update failed');
     }
  };

  const handleBulkNotifyClick = () => {
      if (!selectedUsers.length) return;
      setBulkNotifyModalOpen(true);
  };

  const handleBulkNotifySubmit = async (e) => {
      e.preventDefault();
      if (!bulkNotifyForm.subject || !bulkNotifyForm.body) {
          return toast.error("Subject and body are required");
      }
      try {
          await api.bulkNotifyUsers({ userIds: selectedUsers, title: bulkNotifyForm.subject, body: bulkNotifyForm.body });
          toast.success(`Notification sent to ${selectedUsers.length} users`);
          setSelectedUsers([]);
          setBulkNotifyModalOpen(false);
          setBulkNotifyForm({ subject: '', body: '' });
      } catch(err) {
          toast.error("Failed to send bulk notification");
      }
  };
  const fetchTemplates = async () => {
    try {
      const data = await api.getEmailTemplates();
      setTemplates(data);
    } catch (err) {
      toast.error('Failed to fetch templates');
    }
  };

  const handleSaveTemplate = async (e) => {
      e.preventDefault();
      try {
          if (editingTemplate) {
              await api.updateEmailTemplate(editingTemplate.id, templateForm);
              toast.success('Template updated successfully');
          } else {
              await api.createEmailTemplate(templateForm);
              toast.success('Template created successfully');
          }
          setEditingTemplate(null);
          setTemplateForm({ name: '', subject: '', bodyHtml: '' });
          fetchTemplates();
      } catch (err) {
          toast.error('Failed to save template');
      }
  };

  const handleDeleteTemplate = async () => {
      if (!templateToDelete) return;
      try {
          await api.deleteEmailTemplate(templateToDelete);
          toast.success('Template deleted');
          fetchTemplates();
      } catch(err) {
          toast.error('Failed to delete template');
      } finally {
          setTemplateToDelete(null);
      }
  };
  const fetchFcmTokens = async () => {
    try {
      const data = await api.getFcmTokensMaster();
      setFcmTokens(data);
    } catch (e) {
      toast.error('Failed to load FCM tokens master list');
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      const res = await api.get('/admin/notifications/logs');
      setNotificationLogs(Array.isArray(res) ? res : (res?.data || []));
    } catch (e) {
      console.warn('Failed to fetch notification logs');
    }
  };

  const handleTestBroadcast = async (e) => {
    e.preventDefault();
    if (!notiTitle || !notiBody) return toast.error('Title and message body are required');
    setSendingNoti(true);
    try {
      const res = await api.sendTestNotificationSuite({
        channel: testChannel,
        title: notiTitle,
        body: notiBody
      });
      toast.success(res.message || 'Test alert dispatched!');
      setNotiTitle('');
      setNotiBody('');
      fetchNotificationLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to send test alert');
    } finally {
      setSendingNoti(false);
    }
  };

  const handleSendDirectPush = async (e) => {
    e.preventDefault();
    if (!directPushTokenModal) return;
    setSendingDirectPush(true);
    try {
      const res = await api.sendDirectFcmPush(
        directPushTokenModal.token,
        directPushTitle || '⚡ Direct Push Alert',
        directPushBody || 'Hello! Test notification from Master Admin'
      );
      toast.success(res.message || 'Direct Push Sent!');
      setDirectPushTokenModal(null);
      setDirectPushTitle('');
      setDirectPushBody('');
      fetchNotificationLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to send direct push');
    } finally {
      setSendingDirectPush(false);
    }
  };

  const handleSaveFcmToken = async (e) => {
    e.preventDefault();
    if (!fcmForm.token) return toast.error('FCM Token string is required');
    try {
      if (editingFcmToken) {
        await api.updateFcmToken(editingFcmToken.id, fcmForm);
        toast.success('FCM Token updated successfully!');
      } else {
        await api.createFcmToken(fcmForm);
        toast.success('FCM Token added successfully!');
      }
      setFcmModalOpen(false);
      setEditingFcmToken(null);
      setFcmForm({ username: '', email: '', deviceType: 'Desktop Browser', token: '' });
      fetchFcmTokens();
    } catch (err) {
      toast.error(err.message || 'Failed to save FCM token');
    }
  };

  const handleDeleteFcmToken = async () => {
    if (!tokenToDeleteModal) return;
    try {
      await api.deleteFcmToken(tokenToDeleteModal.id || tokenToDeleteModal.token);
      toast.success('FCM Token deleted successfully!');
      setTokenToDeleteModal(null);
      fetchFcmTokens();
    } catch (err) {
      toast.error(err.message || 'Failed to delete token');
    }
  };

  const handlePurgeDummyTokens = async () => {
    try {
      const res = await api.purgeDummyFcmTokens();
      toast.success(res.message || 'Dummy tokens purged successfully!');
      fetchFcmTokens();
    } catch (err) {
      toast.error('Failed to purge dummy tokens');
    }
  };

  useEffect(() => {
     if (activeTab === 'console' && currentUser?.role === 'master') {
         fetchConsoleLogs();
     }
     if (activeTab === 'cron' && currentUser?.role === 'master') {
         fetchCronStatus();
     }
     if (activeTab === 'templates' && currentUser?.role === 'master') {
         fetchTemplates();
     }
     if (activeTab === 'fcm' && (currentUser?.role === 'master' || currentUser?.role === 'admin')) {
         fetchFcmTokens();
     }
     if (activeTab === 'notifications' && (currentUser?.role === 'master' || currentUser?.role === 'admin')) {
         fetchNotificationLogs();
     }
  }, [activeTab]);

  if (loading) {
    return <PageLoader text="Loading Admin Dashboard..." />;
  }
  
  const tabs = [
    { id: 'users', label: 'Users & Roles', icon: Users },
  ];
  if (currentUser?.role === 'master') {
      tabs.push({ id: 'subscriptions', label: 'Subscriptions', icon: Activity });
      tabs.push({ id: 'analytics', label: 'Global Analytics', icon: BarChart2 });
      tabs.push({ id: 'fcm', label: 'FCM Token Master', icon: Shield });
      tabs.push({ id: 'notifications', label: 'Notifications & Logs', icon: Activity });
      tabs.push({ id: 'templates', label: 'Email Templates', icon: ScrollText });
      tabs.push({ id: 'cron', label: 'Background Tasks', icon: Terminal });
      tabs.push({ id: 'settings', label: 'System Settings', icon: SettingsIcon });
      tabs.push({ id: 'branding', label: 'Branding', icon: Palette });
      tabs.push({ id: 'console', label: 'Live Console', icon: Terminal });
      tabs.push({ id: 'audit', label: 'Audit Logs', icon: ScrollText });
      tabs.push({ id: 'backup', label: 'Database Backup', icon: Download });
  }

  return (
    <div className="space-y-6 flex-1 w-full h-full flex flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="text-emerald-500" /> Admin Panel
          </h1>
          <p className="text-sm text-secondary">Manage the platform.</p>
        </div>
      </motion.div>
      
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
         {tabs.map(tab => {
             const Icon = tab.icon;
             return (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-surface/50 text-secondary hover:text-white border border-transparent'}`}
                 >
                     <Icon size={16} /> {tab.label}
                 </button>
             )
         })}
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {activeTab === 'users' && (
            <div className="flex flex-col h-full">
              {selectedUsers.length > 0 && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-3 flex justify-between items-center text-sm">
                  <div className="text-emerald-400 font-medium">
                    {selectedUsers.length} user(s) selected
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleBulkRole('admin')} className="px-3 py-1 bg-surface border border-border rounded hover:bg-white/5 transition-colors">Make Admins</button>
                    <button onClick={() => handleBulkRole('user')} className="px-3 py-1.5 bg-black/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-border transition-colors">Make Users</button>
                    <button onClick={handleBulkNotifyClick} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30 transition-colors">Send Message</button>
                    <button onClick={() => setSelectedUsers([])} className="px-3 py-1.5 text-secondary text-xs hover:text-white transition-colors">Cancel</button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-black/40 text-secondary font-semibold sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-4 w-12 text-center">
                        <input type="checkbox" className="rounded bg-black/20 border-border cursor-pointer accent-emerald-500" 
                               checked={selectedUsers.length > 0 && selectedUsers.length === users.length} 
                               onChange={selectAllUsers} />
                      </th>
                      <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Subscription</th>
                    <th className="px-6 py-4">Registered Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-white/5 transition-colors ${selectedUsers.includes(user.id) ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input type="checkbox" className="rounded bg-black/20 border-border cursor-pointer accent-emerald-500" 
                               checked={selectedUsers.includes(user.id)} 
                               onChange={() => toggleSelectUser(user.id)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-emerald-500">
                            <User size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-100">{user.username}</div>
                            <div className="text-xs text-secondary">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs tracking-wider">
                        {user.role === 'master' ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1"><Shield size={12} /> MASTER ADMIN</span>
                        ) : user.role === 'admin' ? (
                          <span className="text-emerald-400 font-bold">{user.role}</span>
                        ) : (
                          user.role
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs font-medium border border-amber-500/20">Pending</span>}
                        {user.status === 'approved' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium border border-emerald-500/20">Approved</span>}
                        {user.status === 'rejected' && <span className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded text-xs font-medium border border-rose-500/20">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 uppercase text-xs tracking-wider">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold border ${user.subscription === 'pro' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                           {user.subscription || 'free'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        {user.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateStatus(user.id, 'approved', user.role)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Approve">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleUpdateStatus(user.id, 'rejected', user.role)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Reject">
                              <X size={16} />
                            </button>
                          </>
                        )}
                        
                        {user.status === 'approved' && (
                          <>
                            {user.id === currentUser?.id ? (
                               <span className="text-xs text-secondary/50 italic flex items-center mr-2">Current User</span>
                            ) : (user.role === 'admin' || user.role === 'master') && currentUser?.role !== 'master' ? (
                               <span className="text-xs text-secondary/50 italic flex items-center mr-2">Admin Protected</span>
                            ) : (
                              <>
                                {currentUser?.role === 'master' && (
                                   <button onClick={() => setUserToImpersonate(user)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 mr-2" title="Login As User">
                                     <LogIn size={16} />
                                   </button>
                                )}
                                {currentUser?.role === 'master' && user.subscription !== 'pro' && (
                                   <button onClick={() => handleUpdateStatus(user.id, user.status, user.role, 'pro')} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 mr-2" title="Upgrade to Pro">
                                     <ArrowUpCircle size={16} />
                                   </button>
                                )}
                                {currentUser?.role === 'master' && user.subscription === 'pro' && (
                                   <button onClick={() => handleUpdateStatus(user.id, user.status, user.role, 'free')} className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 mr-2" title="Downgrade to Free">
                                     <ArrowDownCircle size={16} />
                                   </button>
                                )}
                                {user.role === 'admin' || user.role === 'master' ? (
                                  <button onClick={() => handleUpdateStatus(user.id, user.status, 'user')} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" title="Demote to User">
                                    <ShieldOff size={16} />
                                  </button>
                                ) : (
                                  <button onClick={() => handleUpdateStatus(user.id, user.status, 'admin')} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" title="Promote to Admin">
                                    <Shield size={16} />
                                  </button>
                                )}
                                <button onClick={() => handleUpdateStatus(user.id, 'rejected', user.role)} className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" title="Suspend User">
                                  <Ban size={16} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        
                        {user.status === 'rejected' && user.id !== currentUser?.id && (
                          <button onClick={() => handleUpdateStatus(user.id, 'approved', user.role)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Restore User">
                            <Check size={16} />
                          </button>
                        )}
                        
                        {user.id !== currentUser?.id ? (
                          (user.role === 'admin' || user.role === 'master') && currentUser?.role !== 'master' ? null :
                          <button onClick={() => setUserToDelete(user.id)} className="p-2 rounded-lg text-secondary hover:text-rose-400 hover:bg-rose-500/10 ml-2" title="Delete User">
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button disabled className="p-2 rounded-lg text-secondary/30 ml-2 cursor-not-allowed" title="Cannot delete yourself">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-8 text-secondary">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'cron' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Terminal className="text-emerald-500"/> Background Tasks</h2>
                <div className="grid gap-6 max-w-4xl">
                    <div className="glass-card p-6 rounded-xl border border-border">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-white">Daily IPO Digest</h3>
                            <button onClick={() => handleTriggerCron('dailyDigest')} className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 font-medium rounded-lg hover:bg-emerald-500/30 transition-colors border border-emerald-500/30">Run Now</button>
                        </div>
                        <p className="text-sm text-secondary mb-4">Emails daily IPO updates to users and sends a push notification. Runs automatically at 9:00 AM.</p>
                        <div className="text-xs text-gray-400 flex gap-4">
                            <span>Status: <span className={cronJobs?.dailyDigest?.status === 'error' ? 'text-rose-400' : 'text-emerald-400'}>{cronJobs?.dailyDigest?.status || 'idle'}</span></span>
                            <span>Last Run: {cronJobs?.dailyDigest?.lastRun ? new Date(cronJobs.dailyDigest.lastRun).toLocaleString() : 'Never'}</span>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-border">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-white">Auto-Sync Live GMP</h3>
                            <button onClick={() => handleTriggerCron('gmpSync')} className="px-4 py-1.5 bg-blue-500/20 text-blue-400 font-medium rounded-lg hover:bg-blue-500/30 transition-colors border border-blue-500/30">Run Now</button>
                        </div>
                        <p className="text-sm text-secondary mb-4">Fetches the latest live GMP prices and automatically updates database records. Runs automatically every hour.</p>
                        <div className="text-xs text-gray-400 flex gap-4">
                            <span>Status: <span className={cronJobs?.gmpSync?.status === 'error' ? 'text-rose-400' : 'text-emerald-400'}>{cronJobs?.gmpSync?.status || 'idle'}</span></span>
                            <span>Last Run: {cronJobs?.gmpSync?.lastRun ? new Date(cronJobs.gmpSync.lastRun).toLocaleString() : 'Never'}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'subscriptions' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Subscription Tiers</h2>
                    <button onClick={handleSaveSettings} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20">
                        Save Tiers
                    </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
                    {Object.entries(subscriptionTiers).map(([tierKey, tierData]) => (
                        <div key={tierKey} className="glass-card p-6 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white uppercase tracking-wider">{tierData.name} Tier</h3>
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${tierKey === 'pro' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-secondary/20 text-secondary border border-border'}`}>
                                    {tierKey}
                                </span>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Max Applicants Allowed</label>
                                    <input 
                                        type="number" 
                                        value={tierData.maxApplicants} 
                                        onChange={(e) => setSubscriptionTiers({...subscriptionTiers, [tierKey]: {...tierData, maxApplicants: parseInt(e.target.value) || 0}})}
                                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Max IPO Records Allowed</label>
                                    <input 
                                        type="number" 
                                        value={tierData.maxRecords} 
                                        onChange={(e) => setSubscriptionTiers({...subscriptionTiers, [tierKey]: {...tierData, maxRecords: parseInt(e.target.value) || 0}})}
                                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                                    />
                                </div>
                                
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={tierData.hasAnalytics}
                                        onChange={(e) => setSubscriptionTiers({...subscriptionTiers, [tierKey]: {...tierData, hasAnalytics: e.target.checked}})}
                                        className="w-4 h-4 rounded bg-black border-border checked:bg-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-300">Has Access to Advanced Analytics</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'templates' && currentUser?.role === 'master' && (
            <div className="flex flex-col h-full">
               <div className="p-4 border-b border-border/50 flex justify-between items-center bg-black/20 shrink-0">
                  <h2 className="text-lg font-bold text-white">Email Templates Builder</h2>
                  <button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', bodyHtml: ''}); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20">
                     + New Template
                  </button>
               </div>
               
               <div className="flex-1 flex overflow-hidden">
                  {/* Sidebar - Template List */}
                  <div className="w-1/4 min-w-[250px] border-r border-border/50 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-surface/30">
                      {templates.length === 0 ? (
                         <div className="text-sm text-secondary text-center py-4">No templates yet.</div>
                      ) : (
                         templates.map(t => (
                             <div key={t.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${editingTemplate?.id === t.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-border hover:bg-white/5'}`} onClick={() => { setEditingTemplate(t); setTemplateForm(t); }}>
                                <div className="font-medium text-white text-sm mb-1 truncate">{t.name}</div>
                                <div className="text-xs text-secondary truncate">{t.subject}</div>
                                <div className="flex justify-end mt-2">
                                   <button onClick={(e) => { e.stopPropagation(); setTemplateToDelete(t.id); }} className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"><Trash2 size={12}/> Delete</button>
                                </div>
                             </div>
                         ))
                      )}
                  </div>
                  
                  {/* Editor & Preview Area */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                      <form onSubmit={handleSaveTemplate} className="p-4 border-b border-border/50 shrink-0 flex gap-4 items-end bg-surface/10">
                          <div className="flex-1">
                              <label className="block text-xs font-medium text-secondary mb-1">Internal Name</label>
                              <input type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="w-full bg-black/20 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none" required placeholder="e.g. Welcome Email" />
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-medium text-secondary mb-1">Email Subject</label>
                              <input type="text" value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} className="w-full bg-black/20 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none" required placeholder="Welcome to {{appName}}!" />
                          </div>
                          <button type="submit" className="px-6 py-1.5 h-[34px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                              Save Template
                          </button>
                      </form>
                      
                      <div className="flex-1 flex overflow-hidden">
                          {/* Code Editor */}
                          <div className="w-1/2 flex flex-col border-r border-border/50 bg-black/40">
                             <div className="p-2 border-b border-border/50 text-xs font-bold text-secondary flex justify-between">
                                <span>Raw HTML Editor</span>
                                <span>Use {'{{varName}}'} for dynamic data</span>
                             </div>
                             <textarea 
                                value={templateForm.bodyHtml}
                                onChange={e => setTemplateForm({...templateForm, bodyHtml: e.target.value})}
                                className="flex-1 w-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
                                placeholder="<h1>Welcome</h1><p>Start coding your email...</p>"
                             ></textarea>
                          </div>
                          
                          {/* Live Preview */}
                          <div className="w-1/2 flex flex-col bg-white">
                             <div className="p-2 border-b border-gray-200 text-xs font-bold text-gray-500 bg-gray-50">
                                Live Preview
                             </div>
                             <div className="flex-1 overflow-auto custom-scrollbar p-8">
                                <div className="mx-auto w-full max-w-[600px] border border-gray-200 shadow-sm min-h-[400px]" dangerouslySetInnerHTML={{ __html: templateForm.bodyHtml || '<div style="color:#aaa; text-align:center; margin-top:100px;">Preview will appear here</div>' }}>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
               </div>
            </div>
        )}
        
        {activeTab === 'analytics' && currentUser?.role === 'master' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <h2 className="text-xl font-bold mb-6">Global Platform Analytics</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-surface/50 p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center shadow-lg shadow-black/20">
                       <span className="text-secondary text-sm font-medium mb-2">Total Active Users</span>
                       <span className="text-4xl font-black text-white">{analytics?.totalUsers}</span>
                   </div>
                   <div className="bg-surface/50 p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center shadow-lg shadow-black/20">
                       <span className="text-secondary text-sm font-medium mb-2">Total Portfolios Tracked</span>
                       <span className="text-4xl font-black text-white">{analytics?.totalPortfolios}</span>
                   </div>
                   <div className="bg-surface/50 p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center shadow-lg shadow-black/20">
                       <span className="text-secondary text-sm font-medium mb-2">Aggregate Platform P&L</span>
                       <span className={`text-4xl font-black ${analytics?.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                           ₹{analytics?.totalProfit?.toLocaleString()}
                       </span>
                   </div>
               </div>
            </div>
        )}

        {/* FCM Token Master Table */}
        {activeTab === 'fcm' && (currentUser?.role === 'master' || currentUser?.role === 'admin') && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border/50 flex flex-wrap justify-between items-center bg-black/20 gap-3 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="text-emerald-400" size={18} /> FCM Device Tokens Master Table
                  </h2>
                  <p className="text-xs text-secondary">All registered Firebase Cloud Messaging push devices linked to User Name & Email ID</p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <button onClick={() => { setEditingFcmToken(null); setFcmForm({ username: '', email: '', deviceType: 'Desktop Browser', token: '' }); setFcmModalOpen(true); }} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/20">
                    + Add Token
                  </button>
                  <button onClick={handlePurgeDummyTokens} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-xs transition-all">
                    🧹 Purge Dummy Tokens
                  </button>
                  <button onClick={async () => {
                    try {
                      const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop Browser';
                      const { requestForToken } = await import('../firebase');
                      const token = await requestForToken();
                      if (!token || token.length < 30 || token.startsWith('fcm_token_')) {
                        return toast.error('Notification permission required to obtain real FCM token. Please allow notifications in browser settings.');
                      }
                      await api.post('/notifications/register', { token, deviceType });
                      toast.success('Real FCM Push Token registered successfully!');
                      fetchFcmTokens();
                    } catch (e) {
                      toast.error(e.message || 'Failed to register real FCM token');
                    }
                  }} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600">
                    ⚡ Register Real FCM Token
                  </button>
                  <button onClick={fetchFcmTokens} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <Activity size={14} /> Refresh ({fcmTokens.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-black/40 text-secondary font-semibold sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4">User Name</th>
                      <th className="px-6 py-4">Email ID</th>
                      <th className="px-6 py-4">Device Token</th>
                      <th className="px-6 py-4">Device Type</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {fcmTokens.map((tokenRow) => (
                      <tr key={tokenRow.id || tokenRow.token} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{tokenRow.username || 'Investor User'}</td>
                        <td className="px-6 py-4 text-secondary">{tokenRow.email || 'N/A'}</td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-300">
                          <span className="bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 max-w-[200px] inline-block truncate" title={tokenRow.token}>
                            {tokenRow.token ? `${tokenRow.token.substring(0, 24)}...` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge badge-blue text-[10px] font-bold uppercase">{tokenRow.deviceType || 'Web Browser'}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-secondary">
                          {tokenRow.lastUsedAt ? new Date(tokenRow.lastUsedAt).toLocaleString() : 'Recent'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1.5">
                          <button
                            onClick={() => { setDirectPushTokenModal(tokenRow); setDirectPushTitle(''); setDirectPushBody(''); }}
                            className="px-2.5 py-1 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 rounded-lg inline-flex items-center gap-1 font-medium transition-colors"
                          >
                            ⚡ Direct Push
                          </button>
                          <button
                            onClick={() => { setEditingFcmToken(tokenRow); setFcmForm(tokenRow); setFcmModalOpen(true); }}
                            className="px-2.5 py-1 text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 rounded-lg inline-flex items-center gap-1 font-medium transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setTokenToDeleteModal(tokenRow)}
                            className="px-2.5 py-1 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-lg inline-flex items-center gap-1 font-medium transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {fcmTokens.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-10 text-secondary">
                          No FCM device tokens registered yet. Click <strong>+ Add Token</strong> or <strong>⚡ Register Real FCM Token</strong> above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* Test Notification Module & History Logs */}
        {activeTab === 'notifications' && (currentUser?.role === 'master' || currentUser?.role === 'admin') && (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Test Notification Module Form */}
              <div className="bg-surface-1/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Activity className="text-emerald-400" size={18} /> Master Admin Test Notification Module
                    </h3>
                    <p className="text-xs text-secondary">Test & dispatch alerts across Push, Telegram, WhatsApp, and Email channels</p>
                  </div>
                  <span className="badge badge-emerald text-[10px] font-bold">Multi-Channel Live Engine</span>
                </div>

                <form onSubmit={handleTestBroadcast} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="section-label block mb-1">Notification Channel</label>
                      <select
                        value={testChannel}
                        onChange={e => setTestChannel(e.target.value)}
                        className="input-field"
                      >
                        <option value="push">📱 FCM Web Push Notification</option>
                        <option value="telegram">✈️ Telegram Bot Alert</option>
                        <option value="whatsapp">💬 WhatsApp Message</option>
                        <option value="email">📧 SMTP Email Digest</option>
                      </select>
                    </div>

                    <div>
                      <label className="section-label block mb-1">Alert Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Tata Tech Allotment Out!"
                        value={notiTitle}
                        onChange={e => setNotiTitle(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label block mb-1">Alert Message Body</label>
                    <textarea
                      placeholder="e.g. Allotment status for Tata Technologies is live on KFintech portal. Check your records now!"
                      value={notiBody}
                      onChange={e => setNotiBody(e.target.value)}
                      className="input-field min-h-[70px]"
                      required
                    />
                  </div>

                  <button
                    disabled={sendingNoti}
                    type="submit"
                    className="btn-primary py-2.5 px-6 font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-indigo-600 shadow-lg shadow-emerald-500/20"
                  >
                    {sendingNoti ? 'Dispatching Alert...' : '🚀 Trigger Test Alert'}
                  </button>
                </form>
              </div>

              {/* Notification History Log Table */}
              <div className="bg-surface-1/90 border border-border rounded-2xl p-6 shadow-xl space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="font-bold text-white text-base">Notification History Log</h3>
                  <span className="text-xs text-secondary">{notificationLogs.length} total logs</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="text-xs uppercase bg-black/40 text-secondary font-semibold sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3">Sent Time</th>
                        <th className="px-4 py-3">Channel</th>
                        <th className="px-4 py-3">User / Email</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Message Body</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {notificationLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-secondary">
                            {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${log.channel === 'push' || log.type === 'push' ? 'badge-blue' : (log.channel === 'telegram' ? 'badge-amber' : 'badge-emerald')} text-[10px] uppercase font-bold`}>
                              {log.channel || log.type || 'push'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-bold text-white">{log.username || 'System User'}</div>
                            <div className="text-[11px] text-secondary">{log.email || ''}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{log.title}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate" title={log.body}>{log.body}</td>
                          <td className="px-4 py-3">
                            {log.status === 'success' ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">Success</span>
                            ) : log.status === 'simulated' ? (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold border border-amber-500/20">Simulated</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold border border-rose-500/20" title={log.error}>Failed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {notificationLogs.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-secondary">No notification logs recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        )}
        
        {activeTab === 'settings' && currentUser?.role === 'master' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="max-w-2xl">
                 <h2 className="text-xl font-bold mb-6">System Settings</h2>
                 <form onSubmit={handleSaveSettings} className="space-y-8">
                   
                   <div className="space-y-4">
                       <h3 className="text-lg font-bold border-b border-border/50 pb-2">Global Announcement Banner</h3>
                       <div>
                           <label className="block text-sm font-medium text-secondary mb-1">Banner Text (Leave empty to disable)</label>
                           <input type="text" value={globalBanner} onChange={e => setGlobalBanner(e.target.value)} placeholder="System Maintenance at Midnight" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                       </div>
                   </div>

                   <div className="space-y-4">
                       <h3 className="text-lg font-bold border-b border-border/50 pb-2">Live SMTP Server</h3>
                       <p className="text-xs text-secondary">Provide valid SMTP credentials to enable live emails. Leave empty to use test Ethereal fallback.</p>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-secondary mb-1">SMTP Host</label>
                               <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-secondary mb-1">SMTP Port</label>
                               <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                           </div>
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-secondary mb-1">SMTP Username</label>
                           <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="alert@ipotracker.com" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-secondary mb-1">SMTP Password</label>
                           <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                       </div>
                   </div>

                   <div className="flex gap-4">
                       <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
                          Save Settings
                       </button>
                       <button type="button" onClick={handleTestEmail} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20">
                          Test SMTP Connection
                       </button>
                   </div>
                 </form>
               </div>
            </div>
        )}

        {activeTab === 'branding' && currentUser?.role === 'master' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="max-w-2xl">
                 <h2 className="text-xl font-bold mb-6">White-Label Branding</h2>
                 <form onSubmit={handleSaveSettings} className="space-y-8">
                   <div className="space-y-4">
                       <h3 className="text-lg font-bold border-b border-border/50 pb-2">Application Appearance</h3>
                       <p className="text-xs text-secondary">Customize the core identity of the platform.</p>
                       <div>
                           <label className="block text-sm font-medium text-secondary mb-1">Platform Name</label>
                           <input type="text" value={brandNameLocal} onChange={e => setBrandNameLocal(e.target.value)} placeholder="IPO Tracker" className="w-full bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-secondary mb-1">Primary Brand Color (Hex)</label>
                           <div className="flex gap-2">
                             <input type="color" value={brandColorLocal || '#10b981'} onChange={e => setBrandColorLocal(e.target.value)} className="h-10 w-10 rounded border border-border cursor-pointer bg-black/20" />
                             <input type="text" value={brandColorLocal} onChange={e => setBrandColorLocal(e.target.value)} placeholder="#10b981" className="flex-1 bg-black/20 border border-border rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                           </div>
                       </div>
                   </div>
                   <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
                      Save Branding
                   </button>
                 </form>
               </div>
            </div>
        )}

        {activeTab === 'console' && currentUser?.role === 'master' && (
            <div className="p-6 h-full flex flex-col">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">Live Server Console</h2>
                 <button onClick={fetchConsoleLogs} className="text-sm px-3 py-1 bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors text-secondary">Refresh</button>
               </div>
               <div className="flex-1 bg-black rounded-xl border border-border/50 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar shadow-inner shadow-black/50">
                  {consoleLogs.length === 0 ? (
                      <div className="text-secondary/50 h-full flex items-center justify-center">No logs available...</div>
                  ) : (
                      consoleLogs.map((log, i) => (
                          <div key={i} className={`mb-1 break-all ${log.includes('[ERROR]') ? 'text-rose-400' : 'text-emerald-400/80'}`}>{log}</div>
                      ))
                  )}
               </div>
            </div>
        )}

        {activeTab === 'audit' && currentUser?.role === 'master' && (
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-full">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-xs uppercase bg-black/40 text-secondary font-semibold sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Admin</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-secondary">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-200">{log.adminUsername}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-mono">{log.action}</span></td>
                      <td className="px-6 py-4 text-xs font-mono text-secondary">{log.target}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-8 text-secondary">No audit logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        )}

        {activeTab === 'backup' && currentUser?.role === 'master' && (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center">
               <Download size={64} className="text-blue-500 mb-6 opacity-80" />
               <h2 className="text-2xl font-bold mb-2">Database Backup</h2>
               <p className="text-secondary max-w-md mb-8">Download a full, encrypted `.sqlite` backup of your entire platform database. Store this file securely.</p>
               <div className="flex gap-4">
                 <button onClick={() => api.downloadBackup()} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                    <Download size={18} /> Download Backup
                 </button>
                 <button onClick={() => api.downloadExport()} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2">
                    <Download size={18} /> Export Data to CSV
                 </button>
               </div>
            </div>
        )}

      </div>
      
      <ConfirmModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to permanently delete this user and all their records? This action cannot be undone."
      />
      <ConfirmModal 
        isOpen={!!userToImpersonate}
        onClose={() => setUserToImpersonate(null)}
        onConfirm={() => {
           if (userToImpersonate) handleImpersonate(userToImpersonate.id);
           setUserToImpersonate(null);
        }}
        title="Confirm Impersonation"
        message={`Are you sure you want to log in as ${userToImpersonate?.username}? You will browse the application exactly as they do.`}
        confirmText="Confirm"
      />
      <ConfirmModal 
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message="Are you sure you want to delete this template? This cannot be undone."
      />
      <TestEmailModal
         isOpen={testEmailModalOpen}
         onClose={() => setTestEmailModalOpen(false)}
         onSend={handleSendTestEmail}
      />
      <Modal isOpen={bulkNotifyModalOpen} onClose={() => setBulkNotifyModalOpen(false)} title="Send Bulk Message">
          <form onSubmit={handleBulkNotifySubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-300">Subject (Title) <span className="text-rose-500">*</span></label>
                  <input type="text" required value={bulkNotifyForm.subject} onChange={e => setBulkNotifyForm({...bulkNotifyForm, subject: e.target.value})} className="input-field" placeholder="Notification title" />
              </div>
              <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-300">Message (Body) <span className="text-rose-500">*</span></label>
                  <textarea required value={bulkNotifyForm.body} onChange={e => setBulkNotifyForm({...bulkNotifyForm, body: e.target.value})} className="input-field min-h-[100px] resize-y" placeholder="Type your message here..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setBulkNotifyModalOpen(false)} className="btn-outline">Cancel</button>
                  <button type="submit" className="btn-primary">Send to {selectedUsers.length} user(s)</button>
              </div>
          </form>
      </Modal>

      {/* Direct Push FCM Modal */}
      <Modal isOpen={!!directPushTokenModal} onClose={() => setDirectPushTokenModal(null)} title="⚡ Direct FCM Push Alert">
        <form onSubmit={handleSendDirectPush} className="space-y-4">
          <div className="text-xs text-secondary bg-surface-2 p-3 rounded-xl border border-indigo-500/20 space-y-1">
            <div>Target User: <strong className="text-white">{directPushTokenModal?.username || 'Investor User'}</strong></div>
            <div>Email ID: <span className="text-indigo-300">{directPushTokenModal?.email || 'N/A'}</span></div>
            <div className="truncate text-[11px] font-mono text-gray-400">Token: {directPushTokenModal?.token}</div>
          </div>

          <div>
            <label className="section-label block mb-1">Push Alert Title</label>
            <input
              type="text"
              value={directPushTitle}
              onChange={e => setDirectPushTitle(e.target.value)}
              placeholder="⚡ Allotment Priority Notification"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="section-label block mb-1">Push Alert Body</label>
            <textarea
              value={directPushBody}
              onChange={e => setDirectPushBody(e.target.value)}
              placeholder="Your allotment status for Bajaj Housing Finance is updated."
              className="input-field min-h-[80px]"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDirectPushTokenModal(null)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={sendingDirectPush} className="btn-primary">
              {sendingDirectPush ? 'Dispatching...' : '🚀 Send Direct Push'}
            </button>
      {/* Create / Edit FCM Token Modal */}
      <Modal isOpen={fcmModalOpen} onClose={() => setFcmModalOpen(false)} title={editingFcmToken ? '✏️ Edit FCM Device Token' : '➕ Add FCM Device Token'}>
        <form onSubmit={handleSaveFcmToken} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="section-label block mb-1">User Name</label>
              <input
                type="text"
                placeholder="e.g. Dakshit Patel"
                value={fcmForm.username}
                onChange={e => setFcmForm({ ...fcmForm, username: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="section-label block mb-1">Email ID</label>
              <input
                type="email"
                placeholder="e.g. user@ipotracker.com"
                value={fcmForm.email}
                onChange={e => setFcmForm({ ...fcmForm, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="section-label block mb-1">Device Type</label>
            <select
              value={fcmForm.deviceType}
              onChange={e => setFcmForm({ ...fcmForm, deviceType: e.target.value })}
              className="input-field"
            >
              <option value="Desktop Browser">🖥️ Desktop Browser (Chrome/Edge)</option>
              <option value="Android Mobile App">📱 Android App</option>
              <option value="iOS Device"> iOS Device (Safari Push)</option>
              <option value="Custom Device">💻 Custom Device</option>
            </select>
          </div>

          <div>
            <label className="section-label block mb-1">FCM Registration Token</label>
            <textarea
              placeholder="Paste Firebase FCM registration token string here..."
              value={fcmForm.token}
              onChange={e => setFcmForm({ ...fcmForm, token: e.target.value })}
              className="input-field min-h-[90px] font-mono text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFcmModalOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">
              {editingFcmToken ? 'Save Changes' : 'Create FCM Token'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete FCM Token Confirmation Modal */}
      <ConfirmModal
        isOpen={!!tokenToDeleteModal}
        onClose={() => setTokenToDeleteModal(null)}
        onConfirm={handleDeleteFcmToken}
        title="Delete FCM Device Token"
        message={`Are you sure you want to delete the FCM token for ${tokenToDeleteModal?.username || 'this user'}? Push notifications will no longer be delivered to this device.`}
      />
    </div>
  );
};

export default AdminPanel;
