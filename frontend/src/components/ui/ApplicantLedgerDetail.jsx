import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, Send, Printer, Plus, Trash2, 
  User, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, FileText, Loader2
} from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const ApplicantLedgerDetail = ({ applicant, onOpenAddModal, onUpdate }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!applicant?.id) return;
    setLoading(true);
    try {
      const data = await api.getPartyLedger(applicant.id);
      setEntries(data || []);
    } catch (err) {
      toast.error('Failed to load applicant ledger');
    } finally {
      setLoading(false);
    }
  }, [applicant?.id]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this ledger entry?')) return;
    try {
      await api.deletePartyLedgerEntry(id);
      toast.success('Entry deleted');
      loadLedger();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const handleSendWhatsappReminder = async () => {
    try {
      setSendingReminder(true);
      const res = await api.sendPartyLedgerReminder(applicant.id);
      toast.success('WhatsApp statement reminder sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleOpenPrintStatement = () => {
    const token = localStorage.getItem('ipo_token') || localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
    window.open(`${apiUrl}/party-ledger/statement-html/${applicant.id}?token=${token}`, '_blank');
  };

  if (!applicant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-secondary py-16">
        <FileText size={48} className="stroke-[1] opacity-30 mb-3" />
        <p className="text-sm font-medium">Select an applicant to view their Khatabook passbook</p>
      </div>
    );
  }

  // Calculate totals
  let totalGave = 0;
  let totalGot = 0;
  let runningBal = 0;

  const calculatedEntries = entries.map(e => {
    const amt = parseFloat(e.amount) || 0;
    if (e.type === 'gave') {
      totalGave += amt;
      runningBal += amt;
    } else {
      totalGot += amt;
      runningBal -= amt;
    }
    return { ...e, runningBal };
  });

  const diff = totalGave - totalGot;
  const absDiff = Math.abs(diff);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Profile Header & Summary */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg">
              {applicant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {applicant.name}
                {applicant.family && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {applicant.family}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                <span>PAN: <strong className="text-zinc-200">{applicant.pan || 'N/A'}</strong></span>
                <span>UPI: <strong className="text-zinc-200">{applicant.upiId || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => onOpenAddModal(applicant.id, 'gave')}
              className="flex-1 md:flex-none btn-primary bg-rose-600 hover:bg-rose-700 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight size={14} /> You Gave
            </button>
            <button
              onClick={() => onOpenAddModal(applicant.id, 'got')}
              className="flex-1 md:flex-none btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft size={14} /> You Got
            </button>
            <button
              onClick={handleSendWhatsappReminder}
              disabled={sendingReminder}
              className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Send WhatsApp Reminder"
            >
              {sendingReminder ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
            <button
              onClick={handleOpenPrintStatement}
              className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              title="Download / Print PDF Statement"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* Khatabook Net Balance Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
            <p className="text-[10px] uppercase tracking-wider font-bold text-rose-400">Total You Gave (Dr)</p>
            <p className="text-base font-extrabold text-rose-400 mt-0.5">
              ₹{totalGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Total You Got (Cr)</p>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">
              ₹{totalGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${
            diff > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : diff < 0
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-surface-2 border-border text-secondary'
          }`}>
            <p className="text-[10px] uppercase tracking-wider font-bold">Net Status</p>
            <p className="text-base font-extrabold mt-0.5">
              {diff > 0 && `You Will Get ₹${absDiff.toLocaleString('en-IN')}`}
              {diff < 0 && `You Will Give ₹${absDiff.toLocaleString('en-IN')}`}
              {diff === 0 && `Fully Settled (₹0)`}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div className="flex-1 bg-surface border border-border rounded-2xl p-5 shadow-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-indigo-400" /> Transaction Passbook
          </h3>
          <span className="text-xs text-secondary">{entries.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 text-secondary py-12">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-secondary py-12">
            <p className="text-xs">No ledger transactions recorded yet for {applicant.name}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onOpenAddModal(applicant.id, 'gave')}
                className="text-xs font-semibold text-rose-400 hover:underline"
              >
                + Record You Gave
              </button>
              <span className="text-secondary">•</span>
              <button
                onClick={() => onOpenAddModal(applicant.id, 'got')}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                + Record You Got
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {calculatedEntries.map(entry => {
              const isGave = entry.type === 'gave';
              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isGave ? 'bg-rose-500/[0.03] border-rose-500/10 hover:border-rose-500/30' : 'bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isGave ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {isGave ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {entry.note || entry.category || 'Transaction'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 border border-border text-secondary uppercase font-semibold">
                          {entry.paymentMode || 'UPI'}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary mt-0.5">
                        {entry.date ? new Date(entry.date).toLocaleDateString('en-IN') : '—'}
                        {entry.category ? ` • ${entry.category.replace('_', ' ')}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${isGave ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isGave ? '-' : '+'}₹{parseFloat(entry.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-secondary mt-0.5">
                        Bal: ₹{Math.abs(entry.runningBal).toLocaleString('en-IN')} {entry.runningBal >= 0 ? 'Dr' : 'Cr'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1.5 text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantLedgerDetail;
