import React, { useState, useEffect } from 'react';
import { X, Users, CheckSquare, Square, Zap, ShieldAlert, Wallet, AlertTriangle, Calculator, Lock } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function QuickApplyModal({ isOpen, onClose, ipo = null, initialIpo = null, initialApplicant = null, onApplied, onSuccess }) {
  const [applicants, setApplicants] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [quota, setQuota] = useState('Retail');
  const [lotCount, setLotCount] = useState(1); // User enters/selects number of lots (e.g., 1, 2, 14, 35)
  const [loading, setLoading] = useState(false);

  const activeIpo = ipo || initialIpo;

  useEffect(() => {
    if (isOpen) {
      setLotCount(1);
      fetchInitialData();
    }
  }, [isOpen, initialApplicant]);

  const fetchInitialData = async () => {
    try {
      const [appData, acctData] = await Promise.all([
        api.getApplicants().catch(() => []),
        api.getBankAccounts().catch(() => [])
      ]);
      const appList = Array.isArray(appData) ? appData : (appData?.data || []);
      setApplicants(appList || []);
      setBankAccounts(Array.isArray(acctData) ? acctData : (acctData?.data || []));

      if (initialApplicant && initialApplicant.id) {
        setSelectedIds([initialApplicant.id]);
      } else if (initialApplicant && initialApplicant.name) {
        const found = appList.find(a => a.name?.toLowerCase().trim() === initialApplicant.name?.toLowerCase().trim());
        if (found) setSelectedIds([found.id]);
        else if (appList.length > 0) setSelectedIds(appList.map(a => a.id));
      } else if (appList && appList.length > 0) {
        setSelectedIds(appList.map(a => a.id));
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    }
  };

  if (!isOpen || !activeIpo) return null;

  // Auto-parse Share Price and Shares Per Lot from API data
  const parseIpoPrices = (ipoData) => {
    if (!ipoData) return { minPrice: 0, maxPrice: 0, lotSize: 1 };

    const rawObj = ipoData.raw || ipoData;

    const priceVal =
      ipoData.priceBand ||
      ipoData.priceRange ||
      ipoData.price ||
      ipoData.issuePrice ||
      ipoData.cutoffPrice ||
      rawObj.priceBand ||
      rawObj.priceRange ||
      rawObj.price ||
      rawObj.issuePrice ||
      rawObj.cutoffPrice ||
      rawObj.biddingPrice ||
      '';

    const priceStr = String(priceVal || '');
    const numbers = priceStr.match(/\d+(?:\.\d+)?/g) || [];

    let minPrice = 0;
    let maxPrice = 0;

    if (numbers.length >= 2) {
      minPrice = parseFloat(numbers[0]) || 0;
      maxPrice = parseFloat(numbers[numbers.length - 1]) || minPrice;
    } else if (numbers.length === 1) {
      minPrice = parseFloat(numbers[0]) || 0;
      maxPrice = minPrice;
    } else {
      const numVal = parseFloat(priceVal);
      if (!isNaN(numVal) && numVal > 0) {
        minPrice = numVal;
        maxPrice = numVal;
      }
    }

    const lotVal =
      ipoData.lotSize ||
      ipoData.lot ||
      ipoData.minQty ||
      rawObj.lotSize ||
      rawObj.lot ||
      rawObj.minQty ||
      rawObj.marketLot ||
      1;

    const lotStr = String(lotVal || '1');
    const lotMatch = lotStr.match(/\d+/);
    const lotSize = lotMatch ? parseInt(lotMatch[0], 10) : 1;

    return { minPrice, maxPrice, lotSize };
  };

  const { minPrice, maxPrice, lotSize: sharesPerLot } = parseIpoPrices(activeIpo);
  
  // Automated calculations:
  const validLots = Math.max(1, parseInt(lotCount, 10) || 1);
  const totalSharesPerApplicant = validLots * sharesPerLot;
  const amountPerApplicant = totalSharesPerApplicant * maxPrice;
  const totalInvestmentRequired = amountPerApplicant * selectedIds.length;

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
        ipoName: activeIpo.name,
        listingDate: activeIpo.listingDate || '',
        lots: validLots,
        lotSize: sharesPerLot,
        shares: totalSharesPerApplicant,
        price: maxPrice,
        amount: amountPerApplicant,
        quota,
        applicantIds: selectedIds,
        bankAccountId: bankAccountId || null
      });
      toast.success(`Successfully created ${selectedIds.length} application records for ${activeIpo.name}!`);
      if (onApplied) onApplied();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Batch application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-[#f4f4f5] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Quick Apply — {activeIpo.name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Automated calculation from API pricing data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleBatchApply} className="space-y-4">
          {/* Automated API Pricing Summary Box (READ-ONLY) */}
          <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <Lock size={12} className="text-amber-400" /> Share Price (API Cutoff):
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                ₹{maxPrice > 0 ? maxPrice : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <Lock size={12} className="text-amber-400" /> Shares Per Lot (API):
              </span>
              <span className="text-white font-bold">
                {sharesPerLot} shares/lot
              </span>
            </div>

            <div className="border-t border-border/50 pt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-sans">Amount / Applicant:</span>
              <span className="text-emerald-400 font-extrabold">
                ₹{amountPerApplicant.toLocaleString('en-IN')} <span className="text-[10px] text-zinc-400 font-normal">({totalSharesPerApplicant} shares)</span>
              </span>
            </div>
          </div>

          {/* User Selection: Lots & Quota */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calculator size={12} className="text-indigo-400" /> Lots Applied
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={lotCount}
                onChange={e => setLotCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#18181b] border border-border rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Quota Category</label>
              <select
                value={quota}
                onChange={(e) => {
                  const newQ = e.target.value;
                  setQuota(newQ);
                  if (newQ === 'sHNI' && lotCount < 14) setLotCount(14);
                  else if (newQ === 'bHNI' && lotCount < 35) setLotCount(35);
                  else if (newQ === 'Retail') setLotCount(1);
                }}
                className="w-full bg-[#18181b] border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="Retail">Retail (IND)</option>
                <option value="sHNI">Small HNI (sHNI)</option>
                <option value="bHNI">Big HNI (bHNI)</option>
                <option value="Employee">Employee Quota</option>
                <option value="Shareholder">Shareholder Quota</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wallet size={12} className="text-indigo-400" /> Bank Account
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full bg-[#18181b] border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer truncate"
              >
                <option value="">— No Account —</option>
                {bankAccounts.map((acc, idx) => {
                  const rawName = acc.accountName || acc.name;
                  const bankN = acc.bankName || acc.bank || '';
                  const accountTitle = (rawName && rawName.trim() !== '' && rawName !== 'Bank Account')
                    ? rawName
                    : (bankN ? `${bankN} Account` : (acc.accountNumber ? `A/C ••••${acc.accountNumber.slice(-4)}` : `Bank Account #${idx + 1}`));

                  const bankSub = (bankN && bankN !== accountTitle) ? bankN : (acc.accountType || '');
                  const maskedAcc = acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : '';
                  
                  let detailParts = [];
                  if (bankSub) detailParts.push(bankSub);
                  if (maskedAcc) detailParts.push(maskedAcc);
                  const detailStr = detailParts.length > 0 ? ` (${detailParts.join(' • ')})` : '';

                  return (
                    <option key={acc.id} value={acc.id}>
                      {accountTitle}{detailStr} — ₹{parseFloat(acc.balance || 0).toLocaleString('en-IN')}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {bankAccountId && (() => {
            const selectedAcc = bankAccounts.find(a => a.id === bankAccountId);
            if (!selectedAcc) return null;
            const bal = parseFloat(selectedAcc.balance) || 0;
            const isLow = totalInvestmentRequired > bal;
            return (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${
                isLow ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {isLow ? <AlertTriangle size={14} /> : <Wallet size={14} />}
                <span className="font-semibold">Available: ₹{bal.toLocaleString('en-IN')}</span>
                {isLow && <span className="text-[10px]">• Total required (₹{totalInvestmentRequired.toLocaleString('en-IN')}) exceeds balance!</span>}
              </div>
            );
          })()}

          {/* Applicant Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1 uppercase tracking-wider">
                <Users size={14} className="text-indigo-400" /> Select Applicants ({selectedIds.length}/{applicants.length})
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[0.7rem] text-indigo-400 hover:underline font-bold"
              >
                {selectedIds.length === applicants.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {applicants.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 bg-[#18181b] rounded-xl border border-border">
                  No applicants registered yet. Go to Applicants tab to add family members.
                </div>
              ) : (
                applicants.map(app => {
                  const isSelected = selectedIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleApplicant(app.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm' : 'bg-[#18181b] border-border text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-400 shrink-0" /> : <Square size={16} className="text-zinc-600 shrink-0" />}
                        <div className="truncate">
                          <span className="font-bold block text-white text-xs truncate">{app.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono truncate">{app.pan || 'No PAN'} • {app.family || 'Family'}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 shrink-0 text-xs">₹{amountPerApplicant.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer total calculation */}
          <div className="flex items-center justify-between pt-3 border-t border-[#27272a]">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Total Investment Required</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                ₹{totalInvestmentRequired.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-secondary hover:text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedIds.length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                {loading ? 'Creating Records...' : `Apply for ${selectedIds.length} Applicant${selectedIds.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
