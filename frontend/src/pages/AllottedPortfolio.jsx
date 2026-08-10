import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckCircle2, XCircle, TrendingUp, DollarSign, Wallet, ShieldCheck, Tag, X, RefreshCw, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLoader from '../components/ui/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import TradingSparkline from '../components/ui/TradingSparkline';
import confetti from 'canvas-confetti';
import Trading3DCard from '../components/ui/Trading3DCard';
import { getRecordProfit } from '../utils/profitCalculator';

export default function AllottedPortfolio() {
  const [records, setRecords] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('allotted'); // 'allotted' | 'notAllotted' | 'holding' | 'sold'

  // Sold Action Modal State
  const [selectedRecordForSale, setSelectedRecordForSale] = useState(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recs, apps] = await Promise.all([
        api.getRecords(),
        api.getApplicants()
      ]);
      setRecords(recs || []);
      setApplicants(apps || []);
    } catch (err) {
      toast.error('Failed to load allotted portfolio');
    } finally {
      setLoading(false);
    }
  };

  // Helper map applicant commission %
  const applicantMap = (applicants || []).reduce((acc, a) => {
    acc[a.name] = a;
    return acc;
  }, {});

  // Action: Hold
  const handleHold = async (recordId) => {
    try {
      await api.put(`/records/${recordId}`, { holdingStatus: 'Hold' });
      toast.success('Moved IPO to Holding Portfolio!');
      fetchData();
    } catch (err) {
      toast.error('Failed to move to holding portfolio');
    }
  };

  // Action: Update Refund Status for Not Allotted IPOs
  const handleUpdateRefundStatus = async (recordId, refundStatus) => {
    try {
      await api.put(`/records/${recordId}`, { refundStatus });
      toast.success(`Refund status updated to ${refundStatus}!`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update refund status');
    }
  };

  // Action: Confirm Sale via Withdrawal Amount
  const handleConfirmSale = async (e) => {
    e.preventDefault();
    if (!selectedRecordForSale || !withdrawalAmount) {
      toast.error('Please enter total withdrawal amount');
      return;
    }

    const rec = selectedRecordForSale;
    const numShares = parseFloat(rec.shares) || 1;
    const numBuyPrice = parseFloat(rec.price) || 0;
    const totalBuyCost = parseFloat(rec.amount) || (numShares * numBuyPrice);

    const withdrawalVal = parseFloat(withdrawalAmount) || 0;
    const calculatedSellPrice = numShares > 0 ? (withdrawalVal / numShares) : 0;
    const grossProfit = withdrawalVal - totalBuyCost;

    // Fetch applicant commission % if available
    const app = applicantMap[rec.applicantName];
    const commissionPct = parseFloat(app?.commissionPct) || 0;
    const commissionAmount = grossProfit > 0 ? (grossProfit * (commissionPct / 100)) : 0;
    const netProfitAfterCommission = grossProfit - commissionAmount;

    try {
      await api.put(`/records/${rec.id}`, {
        holdingStatus: 'Sold',
        sellPrice: calculatedSellPrice,
        sellDate,
        profit: grossProfit,
        netProfit: netProfitAfterCommission
      });

      if (grossProfit >= 0) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }

      toast.success(`IPO Sale recorded! Gross Profit: ₹${grossProfit.toLocaleString('en-IN')}${commissionPct > 0 ? ` (Commission: ₹${commissionAmount.toFixed(2)})` : ''}`);
      setSelectedRecordForSale(null);
      setWithdrawalAmount('');
      fetchData();
    } catch (err) {
      toast.error('Failed to record sale');
    }
  };

  // Filter valid records (ignore empty null test rows)
  const validRecords = (records || []).filter(r => (r.ipoName && r.ipoName.trim()) || (r.applicantName && r.applicantName.trim()) || (r.pan && r.pan.trim()));

  const allottedRecords = validRecords.filter(r => (r.alloted === 'Yes' || r.alloted === 'Allotted') && (r.holdingStatus !== 'Sold' && r.holdingStatus !== 'Hold'));
  const notAllottedRecords = validRecords.filter(r => r.alloted === 'No' || r.alloted === 'Not Allotted' || r.alloted === 'Not Alloted');
  const holdingRecords = validRecords.filter(r => r.holdingStatus === 'Hold');
  const soldRecords = validRecords.filter(r => r.holdingStatus === 'Sold');

  const currentDisplayRecords = activeTab === 'allotted' ? allottedRecords : activeTab === 'notAllotted' ? notAllottedRecords : activeTab === 'holding' ? holdingRecords : soldRecords;

  // Calculate KPI Summary Metrics
  const totalAllottedVal = [...allottedRecords, ...holdingRecords].reduce((acc, r) => acc + (parseFloat(r.amount) || ((parseFloat(r.shares) || 1) * (parseFloat(r.price) || 0))), 0);
  const totalPendingRefunds = notAllottedRecords.filter(r => r.refundStatus !== 'refunded' && r.refundStatus !== 'unlocked').reduce((acc, r) => acc + (parseFloat(r.amount) || ((parseFloat(r.shares) || 1) * (parseFloat(r.price) || 0))), 0);
  const totalRealizedProfit = soldRecords.reduce((acc, r) => acc + getRecordProfit(r), 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Allotted IPOs & Portfolio Desk</h1>
          <p className="page-subtitle">Manage allotted shares, non-allotted refunds, quick Hold/Sold execution, and applicant commission sharing.</p>
        </div>
        <button onClick={fetchData} className="btn-outline flex items-center gap-2 text-xs">
          <RefreshCw size={14} /> Refresh Portfolio
        </button>
      </div>

      {/* Portfolio KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Trading3DCard glowColor="emerald" className="rounded-xl">
          <div className="p-4 bg-[#141418] border border-[#27272a] hover:border-emerald-500/40 rounded-xl flex items-center justify-between transition-all shadow-lg">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Total Allotted Value</span>
              <span className="text-xl font-black font-mono text-emerald-400">₹{totalAllottedVal.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 trading-pulse-emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Trading3DCard>

        <Trading3DCard glowColor="rose" className="rounded-xl">
          <div className="p-4 bg-[#141418] border border-[#27272a] hover:border-rose-500/40 rounded-xl flex items-center justify-between transition-all shadow-lg">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Pending Mandate Refunds</span>
              <span className="text-xl font-black font-mono text-rose-400">₹{totalPendingRefunds.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle size={20} />
            </div>
          </div>
        </Trading3DCard>

        <Trading3DCard glowColor="indigo" className="rounded-xl">
          <div className="p-4 bg-[#141418] border border-[#27272a] hover:border-indigo-500/40 rounded-xl flex items-center justify-between transition-all shadow-lg">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Total Realized Sales Profit</span>
              <span className={`text-xl font-black font-mono ${totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalRealizedProfit >= 0 ? `+₹${totalRealizedProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(totalRealizedProfit).toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 trading-pulse-indigo">
              <TrendingUp size={20} />
            </div>
          </div>
        </Trading3DCard>

        <Trading3DCard glowColor="amber" className="rounded-xl">
          <div className="p-4 bg-[#141418] border border-[#27272a] hover:border-amber-500/40 rounded-xl flex items-center justify-between transition-all shadow-lg">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Est. STCG Tax (@ 20%)</span>
              <span className="text-xl font-black font-mono text-amber-400">
                ₹{(totalRealizedProfit > 0 ? totalRealizedProfit * 0.20 : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <button
                onClick={() => window.open('/api/reports/ca-tax-audit-pdf?token=' + localStorage.getItem('ipo_token'), '_blank')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold block mt-1 underline"
              >
                🖨️ CA Tax Audit Report
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>
        </Trading3DCard>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#27272a] pb-1">
        <button
          onClick={() => setActiveTab('allotted')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'allotted' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <CheckCircle2 size={14} /> Allotted Desk ({allottedRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('notAllotted')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'notAllotted' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <XCircle size={14} /> Not Allotted & Refunds ({notAllottedRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('holding')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'holding' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Wallet size={14} /> Hold Portfolio ({holdingRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('sold')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'sold' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <TrendingUp size={14} /> Realized Sales ({soldRecords.length})
        </button>
      </div>

      {/* Main List Table */}
      <div className="flex-1 overflow-auto custom-scrollbar glass-card p-6">
        {loading ? <PageLoader text="Loading allotted portfolio..." /> : (
          <div className="space-y-4">
            {currentDisplayRecords.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">
                No items in {activeTab} list.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>IPO Name</th>
                      <th>Applicant & PAN</th>
                      <th>Qty & Buy Price</th>
                      <th>Blocked / Mandate Amount</th>
                      {activeTab === 'notAllotted' ? (
                        <>
                          <th>Refund Status</th>
                          <th className="text-right">Refund Action</th>
                        </>
                      ) : (
                        <>
                          <th>Listing / Sell Price</th>
                          <th>Realized Profit & Commission</th>
                          <th className="text-right">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentDisplayRecords.map(r => {
                      const app = applicantMap[r.applicantName];
                      const commPct = parseFloat(app?.commissionPct) || 0;

                      const shares = parseFloat(r.shares) || 1;
                      const buyP = parseFloat(r.price) || 0;
                      const sellP = parseFloat(r.sellPrice) || parseFloat(r.listingPrice) || buyP;

                      const totalBuy = shares * buyP;
                      const totalSell = shares * sellP;
                      const grossProfit = totalSell - totalBuy;
                      const commAmount = grossProfit > 0 ? (grossProfit * (commPct / 100)) : 0;
                      const netProfit = grossProfit - commAmount;

                      if (activeTab === 'notAllotted') {
                        const isRefunded = r.refundStatus === 'refunded' || r.refundStatus === 'unlocked';
                        return (
                          <tr key={r.id} className="cyber-row-hover">
                            <td className="font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span>{r.ipoName || 'IPO Application'}</span>
                                <TradingSparkline isPositive={false} width={45} height={18} />
                              </div>
                              <div className="text-[10px] text-rose-400 font-mono">{r.quota || 'Retail'} • Not Allotted</div>
                            </td>
                            <td>
                              <div className="font-semibold text-zinc-200">{r.applicantName || 'Applicant'}</div>
                              <div className="text-[10px] font-mono text-zinc-400">PAN: {r.pan || 'N/A'}</div>
                            </td>
                            <td className="font-mono text-xs">
                              <div>{shares} shares @ ₹{buyP}</div>
                            </td>
                            <td className="font-mono text-xs font-bold text-rose-300">
                              ₹{(parseFloat(r.amount) || totalBuy).toLocaleString('en-IN')}
                            </td>
                            <td>
                              {isRefunded ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 w-fit">
                                  <CheckCircle2 size={12} /> Refund Credited
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1 w-fit">
                                  <RefreshCcw size={12} className="animate-spin" /> Refund Pending
                                </span>
                              )}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isRefunded ? (
                                  <button
                                    onClick={() => handleUpdateRefundStatus(r.id, 'refunded')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-colors text-xs font-bold"
                                  >
                                    Mark Refund Credited
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateRefundStatus(r.id, 'pending')}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white transition-colors text-xs font-bold"
                                  >
                                    Mark Pending
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={r.id} className="cyber-row-hover">
                          <td className="font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{r.ipoName || 'IPO Application'}</span>
                              <TradingSparkline isPositive={grossProfit >= 0} width={45} height={18} />
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">{r.quota || 'Retail'} • Allotted</div>
                          </td>
                          <td>
                            <div className="font-semibold text-zinc-200">{r.applicantName || 'Applicant'}</div>
                            {commPct > 0 && (
                              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                                {commPct}% Profit Share
                              </div>
                            )}
                          </td>
                          <td className="font-mono text-xs">
                            <div>{shares} shares @ ₹{buyP}</div>
                          </td>
                          <td className="font-mono text-xs font-bold text-white">
                            ₹{(parseFloat(r.amount) || totalBuy).toLocaleString('en-IN')}
                          </td>
                          <td className="font-mono text-xs">
                            {r.holdingStatus === 'Sold' ? (
                              <span className="text-emerald-400 font-bold">₹{sellP} (Sold)</span>
                            ) : (
                              <span className="text-zinc-300">₹{buyP}</span>
                            )}
                          </td>
                          <td>
                            {r.holdingStatus === 'Sold' ? (
                              <div className="font-mono text-xs">
                                <span className={`font-bold block ${grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {grossProfit >= 0 ? `+₹${grossProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(grossProfit).toLocaleString('en-IN')}`}
                                </span>
                                {commPct > 0 && grossProfit > 0 && (
                                  <span className="text-[10px] text-amber-400 block font-semibold">
                                    Comm: ₹{commAmount.toFixed(2)} (Net: ₹{netProfit.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-xs font-mono">Unrealized</span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.holdingStatus !== 'Hold' && r.holdingStatus !== 'Sold' && (
                                <button
                                  onClick={() => handleHold(r.id)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white transition-colors text-xs font-bold"
                                >
                                  Hold
                                </button>
                              )}
                              {r.holdingStatus !== 'Sold' && (
                                <button
                                  onClick={() => {
                                    setSelectedRecordForSale(r);
                                    setSellPrice(String(r.price || ''));
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-colors text-xs font-bold"
                                >
                                  Sold
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sold Action Modal Popup */}
      <AnimatePresence>
        {selectedRecordForSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Record Realized Sale — {selectedRecordForSale.ipoName}</h3>
                    <p className="text-xs text-zinc-400">{selectedRecordForSale.applicantName} • {selectedRecordForSale.shares} shares</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecordForSale(null)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmSale} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Total Withdrawal / Sale Proceeds Amount (₹)</label>
                  <p className="text-[11px] text-zinc-500 mb-2">Enter total bank credit amount received after selling all {selectedRecordForSale.shares || 1} shares.</p>
                  <input
                    type="number"
                    step="any"
                    value={withdrawalAmount}
                    onChange={e => setWithdrawalAmount(e.target.value)}
                    className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 18500 (Total proceeds credited to bank)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Sale Date</label>
                  <input
                    type="date"
                    value={sellDate}
                    onChange={e => setSellDate(e.target.value)}
                    className="w-full bg-[#141418] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Real-time Calculation Breakdown Box */}
                {(() => {
                  const numShares = parseFloat(selectedRecordForSale.shares) || 1;
                  const numBuy = parseFloat(selectedRecordForSale.price) || 0;
                  const buyTot = parseFloat(selectedRecordForSale.amount) || (numShares * numBuy);
                  const withdrawalVal = parseFloat(withdrawalAmount) || 0;
                  const calcPerShare = numShares > 0 ? (withdrawalVal / numShares) : 0;
                  const grossP = withdrawalVal > 0 ? (withdrawalVal - buyTot) : 0;

                  const app = applicantMap[selectedRecordForSale.applicantName];
                  const commP = parseFloat(app?.commissionPct) || 0;
                  const commA = grossP > 0 ? (grossP * (commP / 100)) : 0;
                  const netP = grossP - commA;

                  return (
                    <div className="p-4 bg-[#141418] border border-[#27272a] rounded-xl space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total Investment Cost:</span>
                        <span className="text-white">₹{buyTot.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Withdrawal Amount:</span>
                        <span className="text-emerald-400 font-bold">₹{withdrawalVal.toLocaleString('en-IN')}</span>
                      </div>
                      {withdrawalVal > 0 && (
                        <div className="flex justify-between text-zinc-400">
                          <span>Auto-Calculated Price / Share:</span>
                          <span className="text-indigo-400 font-semibold">₹{calcPerShare.toFixed(2)} / share</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#27272a] pt-2">
                        <span className="text-zinc-400">Gross Allotment Profit:</span>
                        <span className={`font-bold ${grossP >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {grossP >= 0 ? `+₹${grossP.toLocaleString('en-IN')}` : `-₹${Math.abs(grossP).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      {commP > 0 && grossP > 0 && (
                        <>
                          <div className="flex justify-between text-amber-400">
                            <span>Applicant Commission ({commP}%):</span>
                            <span className="font-bold">-₹{commA.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-indigo-400 font-bold border-t border-[#27272a] pt-1">
                            <span>Net Profit (After Comm):</span>
                            <span>+₹{netP.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                  <button type="button" onClick={() => setSelectedRecordForSale(null)} className="btn-outline text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs py-2.5 px-5 font-bold btn-cyber-pulse">
                    Confirm Sale & Record Profit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
