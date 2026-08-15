import React, { useState } from 'react';
import { X, Bell, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function GmpAlertModal({ isOpen, onClose, defaultIpoName = '', onAlertCreated }) {
  const [ipoName, setIpoName] = useState(defaultIpoName);
  const [targetGmp, setTargetGmp] = useState('');
  const [direction, setDirection] = useState('above');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (defaultIpoName) setIpoName(defaultIpoName);
  }, [defaultIpoName]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ipoName || targetGmp === '') {
      toast.error('Please enter IPO name and target GMP');
      return;
    }

    setLoading(true);
    try {
      await api.addGmpAlert({
        ipoName,
        targetGmp: parseFloat(targetGmp),
        direction
      });
      toast.success(`GMP Alert set for ${ipoName} at ₹${targetGmp}!`);
      if (onAlertCreated) onAlertCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to set GMP alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-6 text-[#f4f4f5]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Set Target GMP Alert</h3>
              <p className="text-xs text-[var(--text-secondary)]">Get notified via push & email on GMP movement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">IPO Name</label>
            <input
              type="text"
              value={ipoName}
              onChange={(e) => setIpoName(e.target.value)}
              placeholder="e.g. Acme Limited"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Target GMP (₹)</label>
              <input
                type="number"
                step="any"
                value={targetGmp}
                onChange={(e) => setTargetGmp(e.target.value)}
                placeholder="50"
                className="input-field font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Condition</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="input-field bg-[#18181b]"
              >
                <option value="above">Above or Equal (≥)</option>
                <option value="below">Below or Equal (≤)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-[var(--text-secondary)] flex items-start gap-2">
            <ShieldCheck size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <span>When GMP reaches <strong>₹{targetGmp || '0'}</strong> ({direction === 'above' ? 'or higher' : 'or lower'}), we will trigger instant browser push & FCM notifications.</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api')}/gmp-alerts/test-trigger`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('ipo_token')}`
                    },
                    body: JSON.stringify({ ipoName: ipoName || 'Mainboard IPO', currentGmp: parseFloat(targetGmp) || 350, targetGmp: parseFloat(targetGmp) || 300 })
                  });
                  if (!res.ok) throw new Error('Failed to trigger test alert');
                  toast.success('Realtime test notification dispatched!', { icon: '🚀' });
                } catch(e) {
                  toast.error('Test alert failed: ' + e.message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all text-xs font-semibold"
            >
              ⚡ Test Realtime Alert
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs"
              >
                {loading ? 'Setting Alert...' : 'Create Alert'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
