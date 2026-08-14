import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, AlertTriangle, Send, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const MandateTrackerWidget = ({ onStatusChange }) => {
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  const loadPendingMandates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPendingMandates();
      setMandates(data || []);
    } catch (err) {
      console.error('Failed to load pending mandates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingMandates();
    const interval = setInterval(loadPendingMandates, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadPendingMandates]);

  // 5 PM Cutoff Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(17, 0, 0, 0); // 5:00 PM today

      if (now > cutoff) {
        setTimeLeft('Cutoff Passed (5:00 PM)');
      } else {
        const diffMs = cutoff - now;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s left before 5 PM Cutoff`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendNudge = async (recordId, applicantName) => {
    setSendingId(recordId);
    try {
      await api.sendMandateNudge(recordId);
      toast.success(`Urgent WhatsApp nudge sent to ${applicantName}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp nudge');
    } finally {
      setSendingId(null);
    }
  };

  const handleMarkApproved = async (recordId) => {
    try {
      await api.updateMandateStatus(recordId, { mandateStatus: 'Approved' });
      toast.success('Mandate marked as Approved!');
      loadPendingMandates();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      toast.error('Failed to update mandate status');
    }
  };

  if (loading && mandates.length === 0) return null;
  if (!loading && mandates.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xl mb-6 relative overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Pending UPI Mandates Action Required ({mandates.length})</h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                Action Required
              </span>
            </div>
            <p className="text-xs text-amber-300/80 font-medium flex items-center gap-1.5 mt-0.5">
              <Clock size={12} className="text-amber-400" />
              <span>{timeLeft}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); loadPendingMandates(); }}
            className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
            title="Refresh mandates"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-amber-500/20 space-y-2.5">
          {mandates.map(m => {
            const ipoAmount = parseFloat(m.amount) || (parseFloat(m.shares || 1) * parseFloat(m.price || 0));
            return (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-black/40 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {m.applicantName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {m.ipoName} <span className="text-secondary font-normal">• {m.applicantName}</span>
                    </h4>
                    <p className="text-[10px] text-secondary mt-0.5">
                      UPI ID: <code className="text-amber-300 font-mono">{m.mandateUpiId || m.upiId || 'N/A'}</code> • Amount: <strong className="text-white">₹{ipoAmount.toLocaleString('en-IN')}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleSendNudge(m.id, m.applicantName)}
                    disabled={sendingId === m.id}
                    className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs py-1.5 px-2.5 flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                    title="Send WhatsApp Nudge"
                  >
                    <Send size={12} />
                    <span>WhatsApp Nudge</span>
                  </button>

                  <button
                    onClick={() => handleMarkApproved(m.id)}
                    className="btn-outline border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                    title="Mark Approved"
                  >
                    <CheckCircle2 size={12} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MandateTrackerWidget;
