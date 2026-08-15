import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Layers, Plus, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const KostakDealTracker = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({
    ipoName: '', applicantName: '', lotCount: 1, ratePerLot: 500, dealType: 'KOSTAK'
  });

  const loadDeals = async () => {
    try {
      setLoading(true);
      const data = await api.getKostakDeals();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setDeals(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeals(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.addKostakDeal(form);
      toast.success('Kostak deal recorded!');
      setIsFormOpen(false);
      loadDeals();
    } catch (err) {
      toast.error('Failed to add deal: ' + err.message);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Layers size={16} className="text-amber-400" /> Kostak & Subject-to-Sauda Deal Tracker
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Record third-party application Kostak rates and fixed profit deal agreements.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
        >
          <Plus size={14} /> New Kostak Deal
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-surface-2 p-4 rounded-xl border border-border space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-secondary mb-1">IPO Name *</label>
              <input
                required
                type="text"
                value={form.ipoName}
                onChange={e => setForm({...form, ipoName: e.target.value})}
                className="input-field py-1 text-xs"
                placeholder="e.g. Swiggy IPO"
              />
            </div>
            <div>
              <label className="block text-secondary mb-1">Applicant Profile</label>
              <input
                type="text"
                value={form.applicantName}
                onChange={e => setForm({...form, applicantName: e.target.value})}
                className="input-field py-1 text-xs"
                placeholder="e.g. Rahul Patel"
              />
            </div>
            <div>
              <label className="block text-secondary mb-1">Lot Count</label>
              <input
                type="number"
                value={form.lotCount}
                onChange={e => setForm({...form, lotCount: Number(e.target.value)})}
                className="input-field py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-secondary mb-1">Rate Per Lot (₹)</label>
              <input
                type="number"
                value={form.ratePerLot}
                onChange={e => setForm({...form, ratePerLot: Number(e.target.value)})}
                className="input-field py-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-semibold text-emerald-400">
              Total Deal Amount: ₹{(form.lotCount * form.ratePerLot).toLocaleString('en-IN')}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn-outline text-xs py-1 px-3">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs py-1 px-3">
                Save Deal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Deals list */}
      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        {(Array.isArray(deals) ? deals : []).map((d) => (
          <div key={d.id} className="p-3 rounded-xl bg-surface-2 border border-border flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-white text-sm">{d.ipoName}</span>
              <p className="text-[11px] text-secondary mt-0.5">
                Applicant: {d.applicantName} • {d.lotCount} Lot(s) @ ₹{d.ratePerLot}/lot
              </p>
            </div>
            <span className="font-bold text-emerald-400 font-mono text-sm">
              +₹{Number(d.totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        ))}

        {(!Array.isArray(deals) || deals.length === 0) && !loading && (
          <p className="text-xs text-secondary italic text-center py-4">No Kostak deals recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default KostakDealTracker;
