import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, CheckCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    try {
      await api.put('/auth/password', { password });
      toast.success('Password updated successfully!');
      setPassword('');
    } catch (e) {
      toast.error('Failed to update password');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl h-full">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <User className="text-emerald-500" /> My Profile
        </h1>
        <p className="text-sm text-secondary">View your account details and security settings.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8">
        <div className="flex items-center gap-6 mb-10 border-b border-border pb-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <User size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">{user?.username}</h2>
            <div className="flex flex-wrap gap-3 items-center text-sm mt-2">
              <span className="flex items-center gap-1 text-secondary bg-black/40 px-3 py-1 rounded-full border border-border">
                {user?.email}
              </span>
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${user?.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                {user?.role === 'admin' ? <Shield size={14} /> : <User size={14} />} {user?.role}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-bold tracking-widest uppercase">
                <CheckCircle size={14} /> Active
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Security</h3>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2">Change Password</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field bg-black/40 w-full pr-10"
                  placeholder="Enter new password..."
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button onClick={handleUpdatePassword} className="btn-primary shrink-0">
                Update
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
