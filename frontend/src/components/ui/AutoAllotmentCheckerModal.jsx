import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, CheckCircle2, XCircle, RefreshCw, ShieldCheck, UserCheck, Building2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const AutoAllotmentCheckerModal = ({ isOpen, onClose, onRefreshRecords, defaultIpoName = '' }) => {
  const [ipoName, setIpoName] = useState(defaultIpoName);
  const [registrar, setRegistrar] = useState('Link Intime');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIpoName(defaultIpoName);
      setResults(null);
      fetchApplicants();
    }
  }, [isOpen, defaultIpoName]);

  const fetchApplicants = async () => {
    try {
      const data = await api.getApplicants();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setApplicants(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunChecker = async () => {
    if (!ipoName.trim()) {
      toast.error('Please enter an IPO Company Name');
      return;
    }
    if (applicants.length === 0) {
      toast.error('No applicant profiles found. Please add applicants first.');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const payloadApplicants = applicants.map(a => ({ id: a.id, name: a.name, pan: a.pan }));
      const res = await api.checkAllotmentBulk(ipoName, registrar, payloadApplicants);
      setResults(res.data || []);
      toast.success(`Checked allotment for ${res.count || applicants.length} accounts!`);
      if (onRefreshRecords) onRefreshRecords();
    } catch (e) {
      toast.error(e.message || 'Failed to query registrar servers');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-surface-1 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden text-white"
      >
        <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Search size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Auto Allotment Status Checker</h3>
              <p className="text-xs text-secondary">Batch-check LinkIntime, KFinTech & BigShare in 1-Click</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary hover:text-white rounded-lg hover:bg-surface-2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="section-label block mb-1.5">IPO Company Name</label>
              <input
                type="text"
                value={ipoName}
                onChange={e => setIpoName(e.target.value)}
                placeholder="e.g. Tata Technologies, Bajaj Housing"
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Registrar Portal</label>
              <select value={registrar} onChange={e => setRegistrar(e.target.value)} className="input-field">
                <option value="Link Intime">Link Intime India Pvt Ltd</option>
                <option value="KFintech">KFin Technologies (Karvy)</option>
                <option value="Bigshare">Bigshare Services Pvt Ltd</option>
                <option value="Skyline">Skyline Financial Services</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface-2 p-3.5 rounded-xl border border-border text-xs">
            <span className="text-secondary flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-400" /> Active Applicants: <strong className="text-white font-mono">{applicants.length} Family Accounts</strong>
            </span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck size={14} /> Auto-Updates Record Status
            </span>
          </div>

          <button
            onClick={handleRunChecker}
            disabled={loading}
            className="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Querying Registrar Servers...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search size={16} /> Batch Check Allotment ({applicants.length} Accounts)
              </span>
            )}
          </button>

          {/* Results Table */}
          {results && (
            <div className="mt-5 space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 size={16} className="text-indigo-400" /> Allotment Query Results ({results.length})
              </h4>
              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 text-secondary font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Applicant Name</th>
                      <th className="p-3">PAN</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Shares Allotted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((r, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                        <td className="p-3 font-medium text-white">{r.applicantName}</td>
                        <td className="p-3 font-mono text-secondary">{r.pan}</td>
                        <td className="p-3">
                          {r.status === 'ALLOTTED' ? (
                            <span className="badge badge-emerald flex items-center gap-1 w-fit">
                              <CheckCircle2 size={12} /> ALLOTTED
                            </span>
                          ) : (
                            <span className="badge badge-rose flex items-center gap-1 w-fit">
                              <XCircle size={12} /> NOT ALLOTTED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {r.sharesAllotted} shares
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AutoAllotmentCheckerModal;
