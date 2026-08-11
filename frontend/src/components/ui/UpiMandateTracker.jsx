import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const MANDATE_STAGES = [
  { key: 'Requested', label: 'Mandate Sent', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { key: 'Approved', label: 'Approved in UPI App', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { key: 'Blocked', label: 'ASBA Amount Blocked', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { key: 'Debited', label: 'Funds Debited (Allotted)', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { key: 'Unblocked', label: 'Mandate Revoked / Released', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' }
];

export default function UpiMandateTracker({ record, onStatusUpdate }) {
  const [currentStatus, setCurrentStatus] = useState(record?.mandateStatus || 'Requested');
  const [bank, setBank] = useState(record?.bankName || 'HDFC Bank');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (newStatus) => {
    setLoading(true);
    try {
      await api.updateMandateStatus(record.id, { mandateStatus: newStatus, bankName: bank });
      setCurrentStatus(newStatus);
      toast.success(`Bank Mandate status updated to ${newStatus}`);
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to update mandate status');
    } finally {
      setLoading(false);
    }
  };

  const isDelayedUnblock = record?.alloted === 'No' && currentStatus === 'Blocked';

  return (
    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-indigo-400" />
          <span className="text-xs font-bold text-white">Bank Mandate Tracker ({bank})</span>
        </div>
        {isDelayedUnblock && (
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
            <AlertTriangle size={11} /> Delayed Bank Unblock
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[10px] text-white/50 mb-0.5">Bank Provider</label>
          <select
            value={bank}
            onChange={e => setBank(e.target.value)}
            className="w-full bg-[#141418] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="HDFC Bank">HDFC Bank</option>
            <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
            <option value="ICICI Bank">ICICI Bank</option>
            <option value="Axis Bank">Axis Bank</option>
            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
            <option value="Bank of Baroda">Bank of Baroda</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-white/50 mb-0.5">Mandate Status</label>
          <select
            value={currentStatus}
            onChange={e => handleUpdate(e.target.value)}
            disabled={loading}
            className="w-full bg-[#141418] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
          >
            {MANDATE_STAGES.map(stage => (
              <option key={stage.key} value={stage.key}>{stage.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
