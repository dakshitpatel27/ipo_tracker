import React, { useState, useEffect } from 'react';
import { X, Users, CheckSquare, Square, Zap, ShieldAlert } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function QuickApplyModal({ isOpen, onClose, ipo = null, onApplied }) {
  const [applicants, setApplicants] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [quota, setQuota] = useState('Retail');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchApplicants();
    }
  }, [isOpen]);

  const fetchApplicants = async () => {
    try {
      const data = await api.getApplicants();
      setApplicants(data || []);
      // Select all by default
      if (data && data.length > 0) {
        setSelectedIds(data.map(a => a.id));
      }
    } catch (err) {
      toast.error('Failed to load applicants');
    }
  };

  if (!isOpen || !ipo) return null;

  const parseIpoPrices = (ipoData) => {
    if (!ipoData) return { minPrice: 0, maxPrice: 0, lotSize: 1 };

    const priceStr = ipoData.priceRange || ipoData.priceBand || (ipoData.price ? String(ipoData.price) : '');
    const numbers = priceStr.match(/\d+(?:\.\d+)?/g) || [];

    let minPrice = 0;
    let maxPrice = 0;

    if (numbers.length >= 2) {
      minPrice = parseFloat(numbers[0]) || 0;
      maxPrice = parseFloat(numbers[numbers.length - 1]) || minPrice;
    } else if (numbers.length === 1) {
      minPrice = parseFloat(numbers[0]) || 0;
      maxPrice = minPrice;
    } else if (ipoData.price) {
      minPrice = parseFloat(ipoData.price) || 0;
      maxPrice = minPrice;
    }

    const lotStr = ipoData.lotSize || ipoData.lot ? String(ipoData.lotSize || ipoData.lot) : '1';
    const lotMatch = lotStr.match(/\d+/);
    const lotSize = lotMatch ? parseInt(lotMatch[0], 10) : 1;

    return { minPrice, maxPrice, lotSize };
  };

  const { minPrice, maxPrice, lotSize } = parseIpoPrices(ipo);
  const totalAmountPerApp = maxPrice * lotSize;

  const toggleSelectAll = () => {
    if (selectedIds.length === applicants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applicants.map(a => a.id));
    }
  };

  const toggleApplicant = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchApply = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error('Select at least one applicant');
      return;
    }

    setLoading(true);
    try {
      await api.batchApply({
        ipoName: ipo.name,
        listingDate: ipo.listingDate || '',
        lotSize: ipo.lotSize || '1',
        price: maxPrice,
        quota,
        applicantIds: selectedIds
      });
      toast.success(`Successfully created ${selectedIds.length} application records for ${ipo.name}!`);
      if (onApplied) onApplied();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Batch application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-6 text-[#f4f4f5]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Quick Apply All — {ipo.name}</h3>
              <p className="text-xs text-[var(--text-secondary)]">Create records for multiple applicants in 1 click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleBatchApply} className="space-y-4">
          {/* Summary Box */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Cutoff Price:</span>
              <span className="text-white font-semibold">₹{maxPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Lot Size:</span>
              <span className="text-white font-semibold">{lotSize} shares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Amount / Applicant:</span>
              <span className="text-emerald-400 font-bold">₹{totalAmountPerApp.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Quota Category</label>
            <select
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="input-field bg-[#18181b]"
            >
              <option value="Retail">Retail (IND)</option>
              <option value="sHNI">Small HNI (sHNI)</option>
              <option value="bHNI">Big HNI (bHNI)</option>
              <option value="Employee">Employee Quota</option>
              <option value="Shareholder">Shareholder Quota</option>
            </select>
          </div>

          {/* Applicant Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                <Users size={14} /> Select Applicants ({selectedIds.length}/{applicants.length})
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[0.7rem] text-indigo-400 hover:underline font-medium"
              >
                {selectedIds.length === applicants.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {applicants.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)] bg-[#18181b] rounded-lg">
                  No applicants registered yet. Go to Applicants tab to add family members.
                </div>
              ) : (
                applicants.map(app => {
                  const isSelected = selectedIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleApplicant(app.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30 text-white' : 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-zinc-200'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} className="text-zinc-600" />}
                        <div>
                          <span className="font-semibold block">{app.name}</span>
                          <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">{app.pan || 'No PAN'} • {app.family || 'Family'}</span>
                        </div>
                      </div>
                      <span className="font-mono text-zinc-400">₹{totalAmountPerApp.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer calculation */}
          <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
            <div>
              <span className="text-xs text-[var(--text-muted)] block">Total Investment Required</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ₹{(totalAmountPerApp * selectedIds.length).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-outline text-xs">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedIds.length === 0}
                className="btn-primary text-xs"
              >
                {loading ? 'Creating Records...' : `Apply for ${selectedIds.length} Applicants`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
