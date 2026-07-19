import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Settings, Construction } from 'lucide-react';

export const Analytics = () => (
  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="p-6 bg-emerald-500/10 rounded-full text-emerald-400 mb-4"
    >
      <PieChart size={64} strokeWidth={1.5} />
    </motion.div>
    <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
    <p className="text-secondary max-w-md">
      Advanced portfolio analytics, win-rate charts, and profit breakdowns are currently under construction. Check back soon!
    </p>
  </div>
);

export const SettingsPage = () => (
  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="p-6 bg-blue-500/10 rounded-full text-blue-400 mb-4"
    >
      <Settings size={64} strokeWidth={1.5} />
    </motion.div>
    <h1 className="text-3xl font-bold text-white">System Settings</h1>
    <p className="text-secondary max-w-md">
      Application settings and preferences will be available in a future update.
    </p>
  </div>
);
