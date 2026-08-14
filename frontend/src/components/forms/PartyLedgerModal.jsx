import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownLeft, Calendar, Tag, CreditCard, FileText, Loader2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const PartyLedgerModal = ({ isOpen, onClose, onSuccess, defaultApplicantId = '', defaultType = 'gave' }) => {
  const [type, setType] = useState(defaultType); // 'gave' | 'got'
  const [applicantId, setApplicantId] = useState(defaultApplicantId);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('IPO_APPLICATION');
  const [recordId, setRecordId] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [applicants, setApplicants] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setApplicantId(defaultApplicantId);
      setAmount('');
      setCategory(defaultType === 'gave' ? 'IPO_APPLICATION' : 'PROFIT_COLLECTION');
      setRecordId('');
      setPaymentMode('UPI');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');

      api.getApplicants().then(data => setApplicants(data || [])).catch(() => {});
      api.getRecords().then(data => setRecords(data || [])).catch(() => {});
    }
  }, [isOpen, defaultApplicantId, defaultType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!applicantId) {
      toast.error('Please select an applicant');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.addPartyLedgerEntry({
        applicantId,
        recordId: recordId || null,
        type,
        amount: parseFloat(amount),
        category,
        paymentMode,
        date,
        note
      });
      toast.success(type === 'gave' ? 'Entry recorded: You Gave ₹' + amount : 'Entry recorded: You Got ₹' + amount);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${type === 'gave' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {type === 'gave' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Ledger Entry</h3>
                <p className="text-xs text-secondary">Record cash or IPO transaction with applicant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type Selector Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-2 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => { setType('gave'); setCategory('IPO_APPLICATION'); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  type === 'gave'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'text-secondary hover:text-white'
                }`}
              >
                <ArrowUpRight size={16} />
                <span>You Gave (Red)</span>
              </button>
              <button
                type="button"
                onClick={() => { setType('got'); setCategory('PROFIT_COLLECTION'); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs transition-all ${
                  type === 'got'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-secondary hover:text-white'
                }`}
              >
                <ArrowDownLeft size={16} />
                <span>You Got (Green)</span>
              </button>
            </div>

            {/* Applicant Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider">Applicant *</label>
              <select
                value={applicantId}
                onChange={(e) => setApplicantId(e.target.value)}
                className="input-field appearance-none bg-black/40"
                required
              >
                <option value="" disabled>Select Applicant</option>
                {applicants.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.pan || 'No PAN'}) {app.family ? `— ${app.family}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`input-field pl-8 font-bold text-lg ${
                    type === 'gave' ? 'text-rose-400 border-rose-500/30' : 'text-emerald-400 border-emerald-500/30'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Category & Payment Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} /> Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="IPO_APPLICATION">IPO Application</option>
                  <option value="PROFIT_COLLECTION">Profit Payout</option>
                  <option value="COMMISSION">Commission Fee</option>
                  <option value="CASH_SETTLEMENT">Cash Settlement</option>
                  <option value="LOAN">Loan / Advances</option>
                  <option value="MANUAL">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={12} /> Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="input-field"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Linked IPO Record (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} /> Linked IPO Record (Optional)
              </label>
              <select
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                className="input-field appearance-none bg-black/40 text-xs"
              >
                <option value="">— None —</option>
                {records.map(rec => (
                  <option key={rec.id} value={rec.id}>
                    {rec.ipoName} ({rec.applicantName}) — ₹{rec.amount || rec.profit || 0}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Transaction Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider">Remark / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Bajaj Housing IPO"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`btn-primary flex items-center gap-2 ${
                  type === 'gave' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>Save Entry</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PartyLedgerModal;
