import React, { useState, useEffect, useMemo } from 'react';
import { X, Zap, Users, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Calculator, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function AutomatedIpoFormModal({ isOpen, onClose, onApplied }) {
  const [step, setStep] = useState(1); // Step 1: Select IPO & Applicants | Step 2: Bidding & Lots
  const [ipos, setIpos] = useState([]);
  const [statusFilter, setStatusFilter] = useState('LIVE'); // 'LIVE', 'CLOSED', 'ALL'
  const [applicants, setApplicants] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [lots, setLots] = useState(1);
  const [quota, setQuota] = useState('Retail');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [appData, acctData, ipoRes] = await Promise.all([
        api.getApplicants(),
        api.getBankAccounts(),
        fetch('https://finapi.upvaly.com/api/ipo').then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      setApplicants(appData || []);
      setBankAccounts(acctData || []);
      const allFetchedIpos = ipoRes.data || [];
      setIpos(allFetchedIpos);
      
      const liveIpos = allFetchedIpos.filter(i => (i.status || '').toUpperCase() === 'LIVE' || (i.status || '').toUpperCase() === 'UPCOMING');
      if (liveIpos.length > 0) {
        setSelectedIpo(liveIpos[0]);
      } else if (allFetchedIpos.length > 0) {
        setSelectedIpo(allFetchedIpos[0]);
      }

      if (appData && appData.length > 0) {
        setSelectedApplicantIds(appData.map(a => a.id));
      }
    } catch (err) {
      toast.error('Failed to load IPO and applicant data');
    } finally {
      setLoading(false);
    }
  };

  const filteredIpos = useMemo(() => {
    if (statusFilter === 'LIVE') {
      const live = ipos.filter(i => {
        const s = (i.status || '').toUpperCase();
        return s === 'LIVE' || s === 'UPCOMING';
      });
      return live.length > 0 ? live : ipos;
    }
    if (statusFilter === 'CLOSED') {
      return ipos.filter(i => {
        const s = (i.status || '').toUpperCase();
        return s === 'CLOSED' || s === 'LISTED';
      });
    }
    return ipos;
  }, [ipos, statusFilter]);

  if (!isOpen) return null;

  // Helper to parse price & lot size from selected IPO object
  const parseIpoDetails = (ipoData) => {
    if (!ipoData) return { price: 0, lotSize: 1, registrar: 'KFintech' };

    const priceStr = ipoData.priceRange || ipoData.priceBand || (ipoData.price ? String(ipoData.price) : '');
    const numbers = priceStr.match(/\d+(?:\.\d+)?/g) || [];
    const maxPrice = numbers.length >= 1 ? parseFloat(numbers[numbers.length - 1]) : parseFloat(ipoData.price) || 100;

    const lotStr = ipoData.lotSize || ipoData.lot ? String(ipoData.lotSize || ipoData.lot) : '1';
    const lotMatch = lotStr.match(/\d+/);
    const lotSize = lotMatch ? parseInt(lotMatch[0], 10) : 1;

    const registrar = ipoData.registrar || ipoData.detailsUrl?.includes('linkintime') ? 'Link Intime' : 'KFintech';

    return { price: maxPrice, lotSize, registrar };
  };

  const { price, lotSize, registrar } = parseIpoDetails(selectedIpo);
  const totalShares = lots * lotSize;
  const amountPerApplicant = totalShares * price;
  const grandTotalInvestment = amountPerApplicant * selectedApplicantIds.length;

  const handleNextStep = () => {
    if (!selectedIpo) {
      toast.error('Please select an IPO');
      return;
    }
    if (selectedApplicantIds.length === 0) {
      toast.error('Please select at least one applicant');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedApps = applicants.filter(a => selectedApplicantIds.includes(a.id));
      const recordsToCreate = selectedApps.map(app => ({
        ipoName: selectedIpo.name,
        applicantName: app.name,
        pan: app.pan,
        upiId: app.upiId,
        quota,
        listingDate: selectedIpo.schedule?.listingDate || '',
        lotSize: String(lotSize),
        shares: totalShares,
        price,
        amount: amountPerApplicant,
        applied: 'Yes',
        alloted: 'Pending',
        registrar,
        dematId: app.dematId,
        bankAccount: app.bankAccount,
        ifscCode: app.ifscCode,
        holdingStatus: 'Pending',
        bankAccountId: bankAccountId || null,
        gmp: parseFloat((selectedIpo.greyMarketPremium?.gmpTrends?.[0]?.gmp || '0').replace(/[^\d.-]/g, '')) || 0
      }));

      await api.bulkAddRecords(recordsToCreate);
      toast.success(`Successfully created ${recordsToCreate.length} automated IPO applications!`);
      if (onApplied) onApplied();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit automated applications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-white space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Automated IPO Bidding Form</h3>
              <p className="text-xs text-zinc-400">Step {step} of 2 — {step === 1 ? 'Select IPO & Family Bidders' : 'Configure Lots & Calculate Mandate'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? 'text-indigo-400' : 'text-emerald-400'}`}>
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">1</span>
            Select IPO & Applicants
          </div>
          <div className="h-0.5 flex-1 bg-zinc-800 mx-4" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? 'text-indigo-400' : 'text-zinc-500'}`}>
            <span className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">2</span>
            Lots & Auto Amount
          </div>
        </div>

        {/* STEP 1: Select IPO & Applicants */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select IPO</label>
                <div className="flex items-center gap-1 bg-[#141418] p-0.5 rounded-lg border border-[#27272a]">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('LIVE');
                      const live = ipos.filter(i => (i.status || '').toUpperCase() === 'LIVE' || (i.status || '').toUpperCase() === 'UPCOMING');
                      if (live.length > 0) setSelectedIpo(live[0]);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      statusFilter === 'LIVE' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Live & Upcoming
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('CLOSED');
                      const closed = ipos.filter(i => (i.status || '').toUpperCase() === 'CLOSED' || (i.status || '').toUpperCase() === 'LISTED');
                      if (closed.length > 0) setSelectedIpo(closed[0]);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      statusFilter === 'CLOSED' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Closed / Listed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      if (ipos.length > 0) setSelectedIpo(ipos[0]);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All ({ipos.length})
                  </button>
                </div>
              </div>
              <select
                value={selectedIpo?.name || ''}
                onChange={e => {
                  const found = ipos.find(i => i.name === e.target.value);
                  setSelectedIpo(found);
                }}
                className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
              >
                {filteredIpos.map((ipo, idx) => (
                  <option key={idx} value={ipo.name}>
                    [{ipo.status || 'Active'}] {ipo.name} ({ipo.priceRange || `₹${ipo.price || 0}`} • Lot: {ipo.lotSize || 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Users size={14} /> Select Bidding Applicants ({selectedApplicantIds.length}/{applicants.length})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedApplicantIds.length === applicants.length) setSelectedApplicantIds([]);
                    else setSelectedApplicantIds(applicants.map(a => a.id));
                  }}
                  className="text-[11px] font-bold text-indigo-400 hover:underline"
                >
                  {selectedApplicantIds.length === applicants.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {applicants.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500 bg-[#141418] rounded-xl">
                    No applicants added yet. Please add family members in Applicants tab first.
                  </div>
                ) : (
                  applicants.map(app => {
                    const isSelected = selectedApplicantIds.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedApplicantIds(prev =>
                            prev.includes(app.id) ? prev.filter(i => i !== app.id) : [...prev, app.id]
                          );
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected ? 'bg-indigo-500/10 border-indigo-500/40 text-white' : 'bg-[#141418] border-[#27272a] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-sm block text-white">{app.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">PAN: {app.pan || 'N/A'} • {app.family || 'Family'}</span>
                        </div>
                        {isSelected && <CheckCircle2 size={18} className="text-indigo-400" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-5"
              >
                Next: Bidding & Lots <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Bidding & Auto Calculation */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            {/* Auto-Fetched API Details Box */}
            <div className="p-4 bg-[#141418] border border-[#27272a] rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Selected IPO:</span>
                <span className="font-bold text-white">{selectedIpo?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Cutoff Price (Auto):</span>
                <span className="font-bold text-emerald-400">₹{price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Shares per Lot:</span>
                <span className="font-bold text-white">{lotSize} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Registrar (Auto):</span>
                <span className="font-bold text-indigo-400">{registrar}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Number of Lots</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={lots}
                  onChange={e => setLots(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Quota Category</label>
                <select
                  value={quota}
                  onChange={e => setQuota(e.target.value)}
                  className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Retail">Retail (IND)</option>
                  <option value="sHNI">Small HNI (sHNI)</option>
                  <option value="bHNI">Big HNI (bHNI)</option>
                  <option value="Employee">Employee Quota</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Wallet size={14} className="text-indigo-400" /> Bank Account (Auto Balance Management)
                </label>
                <select
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— No Account Linked —</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.bankName}) — ₹{parseFloat(acc.balance || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {bankAccountId && (() => {
                  const selectedAcc = bankAccounts.find(a => a.id === bankAccountId);
                  if (!selectedAcc) return null;
                  const bal = parseFloat(selectedAcc.balance) || 0;
                  const isLow = grandTotalInvestment > bal;
                  return (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mt-2 ${
                      isLow ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {isLow ? <AlertTriangle size={14} /> : <Wallet size={14} />}
                      <span className="font-semibold">Available Balance: ₹{bal.toLocaleString('en-IN')}</span>
                      {isLow && <span className="text-[10px]">• Total grand mandate (₹{grandTotalInvestment.toLocaleString('en-IN')}) exceeds balance!</span>}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Live Calculation Display */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-black border border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Calculated Formula:</span>
                <span className="font-mono text-indigo-300 font-bold">{lots} Lot(s) × {lotSize} Shares × ₹{price}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                <span className="text-xs text-zinc-400">Total Investment / Applicant:</span>
                <span className="font-mono font-black text-lg text-emerald-400">₹{amountPerApplicant.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-baseline text-xs text-zinc-400 font-mono">
                <span>Grand Mandate ({selectedApplicantIds.length} Applicants):</span>
                <span className="font-bold text-white">₹{grandTotalInvestment.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-outline text-xs flex items-center gap-1.5 py-2.5 px-4"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs py-2.5 px-6 font-bold"
              >
                {loading ? 'Creating Applications...' : `Submit ${selectedApplicantIds.length} Application(s)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
