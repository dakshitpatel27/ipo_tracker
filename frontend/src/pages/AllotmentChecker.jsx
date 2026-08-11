import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, ExternalLink, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Building2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLoader from '../components/ui/PageLoader';
import { motion } from 'framer-motion';
import TradingSparkline from '../components/ui/TradingSparkline';

// Registrar direct allotment check portals
const REGISTRAR_URLS = {
  'Link Intime': 'https://linkintime.co.in/initial_offer/public-issues.html',
  'KFintech': 'https://kosmic.kfintech.com/ipostatus/',
  'Bigshare': 'https://www.bigshareonline.com/ipo_status.html',
  'Skyline': 'https://www.skylinerta.com/ipo.php',
  'Cameo': 'https://service.cameoindia.com/',
  'Beetal': 'https://www.beetalfinancial.com/pgipo.aspx',
  'Maashitla': 'https://maashitla.com/status',
  'Purva': 'https://www.purvashare.com/queries/'
};

export default function AllotmentChecker() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoChecking, setAutoChecking] = useState(false);
  const [checkingRecordId, setCheckingRecordId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRegistrar, setFilterRegistrar] = useState('ALL');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getRecords();
      setRecords(data || []);
    } catch (err) {
      toast.error('Failed to load application records');
    } finally {
      setLoading(false);
    }
  };

  const updateAllotmentStatus = async (recordId, status) => {
    try {
      const isAllotted = status === 'Yes' || status === 'Allotted';
      await api.put(`/records/${recordId}`, {
        alloted: isAllotted ? 'Allotted' : 'Not Allotted',
        holdingStatus: isAllotted ? 'Holding' : 'Pending',
        refundStatus: isAllotted ? 'refunded' : 'pending'
      });
      toast.success(`Allotment status updated to ${isAllotted ? 'Allotted' : 'Not Allotted'}!`);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to update allotment status');
    }
  };

  // Single record auto-check
  const handleSingleAutoCheck = async (rec) => {
    try {
      setCheckingRecordId(rec.id);
      const res = await api.autoCheckAllotment({
        recordId: rec.id,
        ipoName: rec.ipoName,
        pan: rec.pan,
        registrar: rec.registrar
      });

      if (res.status === 'Allotted') {
        toast.success(res.message, { duration: 5000, icon: '🎉' });
      } else {
        toast.error(res.message, { duration: 4000 });
      }
      fetchRecords();
    } catch (err) {
      toast.error(err.message || 'Auto check failed');
    } finally {
      setCheckingRecordId(null);
    }
  };

  // Bulk auto-check all pending applications
  const handleAutoCheckAllPending = async () => {
    const pendingList = records.filter(r => r.alloted === 'Pending');
    if (pendingList.length === 0) {
      toast.success('No pending applications to check!');
      return;
    }

    try {
      setAutoChecking(true);
      toast.loading(`Auto checking allotment for ${pendingList.length} application(s)...`, { id: 'bulk-check' });
      let allottedCount = 0;

      for (const rec of pendingList) {
        try {
          const res = await api.autoCheckAllotment({
            recordId: rec.id,
            ipoName: rec.ipoName,
            pan: rec.pan,
            registrar: rec.registrar
          });
          if (res.status === 'Allotted') allottedCount++;
        } catch (e) {
          console.error(e);
        }
      }

      toast.success(`Auto-check complete! ${allottedCount} Allotted, ${pendingList.length - allottedCount} Not Allotted.`, { id: 'bulk-check', duration: 6000 });
      fetchRecords();
    } catch (err) {
      toast.error('Failed to auto check pending applications', { id: 'bulk-check' });
    } finally {
      setAutoChecking(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  // Filter valid pending records (only show applications with status 'Pending')
  const pendingRecords = (records || []).filter(r => 
    ((r.ipoName && r.ipoName.trim()) || (r.applicantName && r.applicantName.trim()) || (r.pan && r.pan.trim())) &&
    (r.alloted === 'Pending' || !r.alloted || r.alloted === '' || r.alloted === '0')
  );

  // Filter records by search and registrar
  const filtered = pendingRecords.filter(r => {
    const matchSearch = r.ipoName?.toLowerCase().includes(search.toLowerCase()) ||
      r.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
      r.pan?.toLowerCase().includes(search.toLowerCase());
    
    const matchReg = filterRegistrar === 'ALL' || (r.registrar && r.registrar.toLowerCase().includes(filterRegistrar.toLowerCase()));

    return matchSearch && matchReg;
  });

  // Calculate applicant count per registrar (pending applications only)
  const countPerRegistrar = (pendingRecords || []).reduce((acc, r) => {
    const reg = r.registrar || 'Link Intime';
    acc[reg] = (acc[reg] || 0) + 1;
    return acc;
  }, {});

  const handleCopyPanAndOpen = (pan, regName) => {
    if (pan) {
      navigator.clipboard.writeText(pan);
      toast.success(`PAN ${pan} copied to clipboard! Opening ${regName} portal...`, { icon: '📋' });
    }
    const portalUrl = REGISTRAR_URLS[regName] || REGISTRAR_URLS['Link Intime'];
    window.open(portalUrl, '_blank');
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Automated Allotment Checker</h1>
          <p className="page-subtitle">Automatic registrar matching, interactive filter & 1-click PAN status verification.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoCheckAllPending}
            disabled={autoChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Zap size={14} className={autoChecking ? 'animate-bounce text-amber-300' : 'text-amber-300'} />
            {autoChecking ? 'Auto-Checking...' : '⚡ Auto-Check All Pending'}
          </button>
          <button onClick={fetchRecords} className="btn-outline flex items-center gap-2 text-xs">
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      </div>

      {/* Interactive Registrar Cards with Filter & Count Badges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Filter by Official IPO Registrar:</span>
          {filterRegistrar !== 'ALL' && (
            <button
              onClick={() => setFilterRegistrar('ALL')}
              className="text-indigo-400 hover:underline text-xs"
            >
              Clear Filter (Show All)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Object.entries(REGISTRAR_URLS).map(([reg, url]) => {
            const count = countPerRegistrar[reg] || 0;
            const isActive = filterRegistrar.toLowerCase() === reg.toLowerCase();

            return (
              <div
                key={reg}
                onClick={() => setFilterRegistrar(isActive ? 'ALL' : reg)}
                className={`p-2.5 rounded-xl cursor-pointer text-center flex flex-col items-center justify-center gap-1 transition-all border select-none cyber-glow-card ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                    : 'bg-[#141418] border-[#27272a] hover:border-zinc-500 text-zinc-300'
                }`}
              >
                <Building2 size={16} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                <span className="text-[11px] font-bold truncate max-w-full">{reg}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${count > 0 ? 'bg-indigo-500/30 text-indigo-300' : 'bg-zinc-800 text-zinc-500'}`}>
                    {count} App{count !== 1 ? 's' : ''}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-0.5"
                    title={`Open ${reg} Website`}
                  >
                    <ExternalLink size={9} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IPO, applicant or PAN..."
            className="input-field pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar glass-card p-6">
        {loading ? <PageLoader text="Syncing allotment records..." /> : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm space-y-2">
                <div>No active applications found matching filter ({filterRegistrar}).</div>
                {filterRegistrar !== 'ALL' && (
                  <button onClick={() => setFilterRegistrar('ALL')} className="btn-primary text-xs py-1.5 px-4">
                    Show All Applications
                  </button>
                )}
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>IPO Name</th>
                      <th>Applicant & PAN</th>
                      <th>Shares & Price</th>
                      <th>Registrar Portal</th>
                      <th>Status</th>
                      <th className="text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const regName = r.registrar || 'Link Intime';
                      const isAllotted = r.alloted === 'Yes' || r.alloted === 'Allotted';
                      const isNotAllotted = r.alloted === 'No' || r.alloted === 'Not Allotted';

                      return (
                        <tr key={r.id} className="cyber-row-hover">
                          <td className="font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{r.ipoName}</span>
                              <TradingSparkline isPositive={true} width={45} height={18} />
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">{r.quota || 'Retail'} • Applied: {r.applied}</div>
                          </td>
                          <td>
                            <div className="font-semibold text-zinc-200">{r.applicantName}</div>
                            <div className="text-[10px] font-mono text-indigo-400 font-bold">PAN: {r.pan || 'N/A'}</div>
                          </td>
                          <td className="font-mono text-xs">
                            <div>{r.shares || 1} shares @ ₹{r.price || 0}</div>
                            <div className="text-emerald-400 font-bold">₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}</div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleCopyPanAndOpen(r.pan, regName)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all"
                              title="Copy PAN and Open Portal"
                            >
                              <span>📋 Copy PAN & Open {regName}</span> <ExternalLink size={11} />
                            </button>
                          </td>
                          <td>
                            {isAllotted ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 size={12} /> Allotted
                              </span>
                            ) : isNotAllotted ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1 w-fit">
                                <XCircle size={12} /> Not Allotted
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold w-fit">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSingleAutoCheck(r)}
                                disabled={checkingRecordId === r.id}
                                className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Run automated allotment verification"
                              >
                                <Zap size={12} className="text-amber-300" />
                                {checkingRecordId === r.id ? 'Checking...' : 'Auto Check'}
                              </button>
                              <button
                                onClick={() => updateAllotmentStatus(r.id, 'Yes')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-colors text-xs font-bold"
                              >
                                Mark Allotted
                              </button>
                              <button
                                onClick={() => updateAllotmentStatus(r.id, 'No')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors text-xs font-bold"
                              >
                                Mark Not Allotted
                              </button>
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
    </div>
  );
}
