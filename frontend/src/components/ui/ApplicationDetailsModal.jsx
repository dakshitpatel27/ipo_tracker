import React, { useState } from 'react';
import { X, CheckCircle2, Building2, User, CreditCard, Shield, Clock, Trash2, Edit3, Calendar, Layers, IndianRupee, Tag, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

export default function ApplicationDetailsModal({ isOpen, onClose, record, applicant, ipo, onDeleteSuccess, onUpdateSuccess }) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !record) return null;

  const appName = record.applicantName || applicant?.name || 'Applicant';
  const appPan = record.applicantPan || applicant?.pan || 'N/A';
  const ipoName = record.ipoName || ipo?.name || 'IPO';

  const shares = parseFloat(record.shares) || 0;
  const lotSize = parseFloat(record.lotSize || ipo?.lotSize) || 1;
  const lotCount = record.lots || (shares > 0 && lotSize > 0 ? Math.max(1, Math.round(shares / lotSize)) : 1);
  const price = parseFloat(record.price || ipo?.price) || 0;
  const amount = parseFloat(record.amount) || (shares * price) || 0;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete application record for "${ipoName}" by ${appName}?`)) {
      return;
    }

    setDeleting(true);
    try {
      if (record.id) {
        await api.deleteRecord(record.id);
      }
      toast.success(`Application for ${ipoName} deleted successfully`);
      if (onDeleteSuccess) onDeleteSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete application record');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-[#f4f4f5] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black flex items-center justify-center shadow-md shadow-emerald-500/10">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">{ipoName}</h3>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full font-extrabold text-[10px] uppercase">
                  {record.quota || 'Retail'}
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={12} /> Bidding Submitted & Active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Applicant Profile Bar */}
        <div className="p-3.5 bg-black/40 border border-border rounded-xl flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
              {appName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-extrabold text-white text-xs">{appName}</div>
              <div className="text-[10px] text-zinc-400 font-mono">PAN: {appPan}</div>
            </div>
          </div>

          {(applicant?.groupTag || applicant?.family || record.family) && (
            <span className="text-[10px] px-2 py-0.5 bg-surface border border-border text-zinc-300 rounded-full font-medium">
              {applicant?.groupTag || applicant?.family || record.family}
            </span>
          )}
        </div>

        {/* Applied Application Metric Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 font-mono">
          <div className="p-3 bg-[#18181b] border border-border rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 font-sans uppercase font-bold flex items-center gap-1">
              <Layers size={12} className="text-indigo-400" /> Bidding Lots
            </div>
            <div className="text-sm font-black text-white">{lotCount} {lotCount === 1 ? 'Lot' : 'Lots'}</div>
            <div className="text-[10px] text-zinc-400 font-sans">{shares > 0 ? `${shares} shares` : ''}</div>
          </div>

          <div className="p-3 bg-[#18181b] border border-border rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 font-sans uppercase font-bold flex items-center gap-1">
              <IndianRupee size={12} className="text-emerald-400" /> Cutoff Price
            </div>
            <div className="text-sm font-black text-emerald-400">₹{price > 0 ? price : 'N/A'}</div>
            <div className="text-[10px] text-zinc-400 font-sans">Per Share</div>
          </div>

          <div className="p-3 bg-[#18181b] border border-border rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 font-sans uppercase font-bold flex items-center gap-1">
              <Tag size={12} className="text-amber-400" /> Total Bidding Amount
            </div>
            <div className="text-sm font-black text-emerald-400">₹{amount.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-zinc-400 font-sans">Blocked in Bank</div>
          </div>

          <div className="p-3 bg-[#18181b] border border-border rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 font-sans uppercase font-bold flex items-center gap-1">
              <Award size={12} className="text-indigo-400" /> Allotment Status
            </div>
            <div className="text-xs font-black pt-0.5">
              {record.alloted === 'Yes' ? (
                <span className="text-emerald-400 font-bold">🎉 Allotted</span>
              ) : record.alloted === 'No' ? (
                <span className="text-rose-400 font-bold">❌ Not Allotted</span>
              ) : (
                <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                  <Clock size={10} className="animate-spin text-amber-400" /> Pending
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 font-sans">Registrar Check</div>
          </div>
        </div>

        {/* Bank & Payment Info */}
        <div className="p-3.5 bg-[#18181b] border border-border rounded-xl space-y-2 text-xs mb-6">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <Building2 size={13} className="text-indigo-400" /> Payment Bank:
            </span>
            <span className="font-bold text-white font-mono">{record.bankName || record.bankAccount || 'ASBA / UPI Direct'}</span>
          </div>

          {record.listingDate && (
            <div className="flex items-center justify-between text-zinc-300 border-t border-border/40 pt-2">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <Calendar size={13} className="text-blue-400" /> Listing Date:
              </span>
              <span className="font-bold text-white font-mono">{record.listingDate}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} /> <span>{deleting ? 'Deleting...' : 'Delete Application'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface border border-border text-white hover:bg-white/10 font-extrabold text-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
