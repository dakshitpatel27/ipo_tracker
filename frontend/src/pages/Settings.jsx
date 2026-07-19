import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Download, Trash2, ShieldAlert, BellRing, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const Settings = () => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState(localStorage.getItem('ipo_theme') || 'dark');

  const handleExport = () => {
    toast("Data export is available from the IPO Records page!");
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    toast.error("This is a destructive action and has been disabled in the demo.");
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('ipo_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      
      toast.success('Settings saved successfully!');
    } catch(e) {
      toast.error('Failed to save settings: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-secondary">Manage your application preferences and data.</p>
      </div>

      <div className="glass-card p-6 space-y-8">
        {/* Preferences Section */}
        <section>
          <h2 className="text-lg font-bold text-white border-b border-border pb-2 mb-4">Display Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Default Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-field appearance-none bg-black/40">
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="USD">$ USD (US Dollar)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value)} className="input-field appearance-none bg-black/40">
                <option value="dark">Terminal Dark (Default)</option>
                <option value="light">Light Mode</option>
              </select>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section>
          <h2 className="text-lg font-bold text-white border-b border-border pb-2 mb-4">Data Management</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <div>
                <h3 className="font-semibold text-white">Export Backup</h3>
                <p className="text-sm text-secondary">Download all your records as a CSV file for backup.</p>
              </div>
              <button onClick={handleExport} className="btn-outline flex items-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              <div>
                <h3 className="font-semibold text-rose-400 flex items-center gap-2"><ShieldAlert size={18} /> Danger Zone</h3>
                <p className="text-sm text-secondary">Permanently delete all data from the database.</p>
              </div>
              <button onClick={handleClearData} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors flex items-center gap-2 font-medium text-sm">
                <Trash2 size={16} /> Factory Reset
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 className="text-lg font-bold text-white border-b border-border pb-2 mb-4">Push Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <div>
                <h3 className="font-semibold text-white">Test FCM Push</h3>
                <p className="text-sm text-secondary">Send a real push notification via Firebase.</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    await api.testNotification();
                    toast.success("Test notification triggered!");
                  } catch (e) {
                    toast.error(e.message || "Failed to trigger notification");
                  }
                }} 
                className="btn-outline flex items-center gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <BellRing size={16} /> Send FCM
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <div>
                <h3 className="font-semibold text-white">Test Local OS Notification</h3>
                <p className="text-sm text-secondary">Verify if your browser and OS allow notifications at all.</p>
              </div>
              <button 
                onClick={() => {
                  if (Notification.permission === 'granted') {
                    new Notification("Local OS Test", { body: "If you see this, your OS settings are correct!" });
                    toast.success("Local notification requested");
                  } else {
                    Notification.requestPermission().then(perm => {
                       if(perm === 'granted') new Notification("Local OS Test", { body: "Permission granted!" });
                       else toast.error("Permission: " + perm);
                    });
                  }
                }} 
                className="btn-outline flex items-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                <BellRing size={16} /> Local Test
              </button>
            </div>
          </div>
        </section>

        <div className="pt-6 border-t border-border flex justify-end">
          <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearData}
        title="Clear All Data"
        message="WARNING: This will delete ALL records and applicants. Are you absolutely sure?"
      />
    </div>
  );
};

export default Settings;
