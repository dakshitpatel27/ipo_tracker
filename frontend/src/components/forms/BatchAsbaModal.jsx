import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileSpreadsheet, Users, DollarSign, CheckSquare, Square, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function BatchAsbaModal({ isOpen, onClose }) {
  const [applicants, setApplicants] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [ipoName, setIpoName] = useState('');
  const [lotSize, setLotSize] = useState('1');
  const [price, setPrice] = useState('100');
  const [payloadResult, setPayloadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      const [appData, acctData] = await Promise.all([
        api.getApplicants(),
        api.getBankAccounts()
      ]);
      setApplicants(appData || []);
      setBankAccounts(acctData || []);
      if (appData && appData.length > 0) {
        setSelectedApplicantIds(appData.map(a => a.id));
      }
    } catch (e) {
      toast.error('Failed to load applicants or accounts');
    }
  };

  const toggleSelectApplicant = (id) => {
    if (selectedApplicantIds.includes(id)) {
      setSelectedApplicantIds(selectedApplicantIds.filter(i => i !== id));
    } else {
      setSelectedApplicantIds([...selectedApplicantIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedApplicantIds.length === applicants.length) {
      setSelectedApplicantIds([]);
    } else {
      setSelectedApplicantIds(applicants.map(a => a.id));
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!ipoName.trim()) {
      toast.error('Please enter an IPO Name');
      return;
    }
    if (selectedApplicantIds.length === 0) {
      toast.error('Please select at least one applicant account');
      return;
    }

    setLoading(true);
    try {
      const res = await api.generateBatchAsba({
        applicantIds: selectedApplicantIds,
        ipoName: ipoName.trim(),
        lotSize: parseInt(lotSize) || 1,
        price: parseFloat(price) || 0
      });
      setPayloadResult(res);
      toast.success(`Generated ASBA payload for ${res.count} accounts!`);
    } catch (err) {
      toast.error(err.message || 'Failed to generate ASBA payload');
    } finally {
      setLoading(false);
    }
  };

  const copyAsbaText = () => {
    if (!payloadResult || !payloadResult.payload) return;
    const header = `Sr | Name | PAN | Demat ID | Bank Account | IFSC | Lots | Amount (₹)`;
    const rows = payloadResult.payload.map(p => 
      `${p.srNo} | ${p.applicantName} | ${p.pan} | ${p.dematId} | ${p.bankAccount} | ${p.ifscCode} | ${p.lotSize} | ₹${p.totalAmount.toLocaleString('en-IN')}`
    ).join('\n');
    const text = `${payloadResult.ipoName} — Batch ASBA Application Payload\nTotal Capital: ₹${payloadResult.totalCapital.toLocaleString('en-IN')}\n\n${header}\n${'-'.repeat(80)}\n${rows}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('ASBA table copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Multi-Account Batch ASBA Generator</h2>
              <p className="text-xs text-[var(--text-muted)]">Generate formatted application payloads for 30+ family bank/ASBA portals</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Target IPO Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Ltd"
                value={ipoName}
                onChange={e => setIpoName(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Lot Size (Count)</label>
              <input
                type="number"
                min="1"
                value={lotSize}
                onChange={e => setLotSize(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Issue Cut-off Price (₹)</label>
              <input
                type="number"
                min="1"
                step="any"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1">
                <Wallet size={12} className="text-indigo-400" /> Bank Account
              </label>
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Select Account —</option>
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
            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Users size={15} />
                {loading ? 'Generating Payload...' : 'Generate Batch ASBA Payload'}
              </button>
            </div>
          </form>

          {/* Applicant Selection Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Select Family Applicants ({selectedApplicantIds.length} / {applicants.length})</span>
              </div>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                {selectedApplicantIds.length === applicants.length ? <CheckSquare size={14} /> : <Square size={14} />}
                {selectedApplicantIds.length === applicants.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-[#09090b]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-white/60 sticky top-0 border-b border-white/10">
                  <tr>
                    <th className="p-2.5 w-10 text-center">✓</th>
                    <th className="p-2.5">Applicant Name</th>
                    <th className="p-2.5">PAN</th>
                    <th className="p-2.5">Demat ID</th>
                    <th className="p-2.5">Bank / IFSC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {applicants.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-white/40">No family applicants found. Add applicants in the Applicants tab first.</td>
                    </tr>
                  ) : (
                    applicants.map(app => {
                      const isSel = selectedApplicantIds.includes(app.id);
                      return (
                        <tr
                          key={app.id}
                          onClick={() => toggleSelectApplicant(app.id)}
                          className={`cursor-pointer transition-colors ${isSel ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => {}}
                              className="rounded border-white/20 bg-transparent text-indigo-600 focus:ring-0"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-white">{app.name}</td>
                          <td className="p-2.5 font-mono text-indigo-300">{app.pan ? app.pan.toUpperCase() : '—'}</td>
                          <td className="p-2.5 text-white/60">{app.dematId || '—'}</td>
                          <td className="p-2.5 text-white/60">{app.bankAccount ? `${app.bankAccount} (${app.ifscCode || ''})` : '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated ASBA Payload Results */}
          {payloadResult && (
            <div className="border border-indigo-500/30 rounded-xl bg-indigo-500/5 p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{payloadResult.ipoName} Batch Payload</h3>
                  <p className="text-xs text-indigo-300">
                    Total Required Capital: <strong>₹{payloadResult.totalCapital.toLocaleString('en-IN')}</strong> across {payloadResult.count} accounts
                  </p>
                </div>
                <button
                  onClick={copyAsbaText}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied Table!' : 'Copy Formatted ASBA Table'}
                </button>
              </div>

              <div className="overflow-x-auto border border-white/10 rounded-lg bg-[#09090b]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-indigo-400 border-b border-white/10">
                    <tr>
                      <th className="p-2 text-center">#</th>
                      <th className="p-2">Applicant</th>
                      <th className="p-2">PAN</th>
                      <th className="p-2">Demat ID</th>
                      <th className="p-2">Bank A/C</th>
                      <th className="p-2">IFSC</th>
                      <th className="p-2 text-right">Lots</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/90">
                    {payloadResult.payload.map(row => (
                      <tr key={row.srNo} className="hover:bg-white/5">
                        <td className="p-2 text-center text-white/40">{row.srNo}</td>
                        <td className="p-2 font-sans font-semibold text-white">{row.applicantName}</td>
                        <td className="p-2 text-indigo-300">{row.pan}</td>
                        <td className="p-2 text-white/70">{row.dematId}</td>
                        <td className="p-2 text-white/70">{row.bankAccount}</td>
                        <td className="p-2 text-white/70">{row.ifscCode}</td>
                        <td className="p-2 text-right text-indigo-400 font-bold">{row.lotSize}</td>
                        <td className="p-2 text-right text-emerald-400 font-bold">₹{row.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
