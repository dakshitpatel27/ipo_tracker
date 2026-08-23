import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Grid, CheckCircle2, AlertCircle, Plus, RefreshCw, Filter, Search,
  Download, Users, Globe, Building2, Wallet, Check, X, Shield, ArrowUpRight, Clock, Sparkles, UserPlus, LayoutList, Table, Eye, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { usePrivacy } from '../context/PrivacyContext';
import PageLoader from '../components/ui/PageLoader';
import QuickApplyModal from '../components/ui/QuickApplyModal';
import ApplicationDetailsModal from '../components/ui/ApplicationDetailsModal';
import Modal from '../components/ui/Modal';
import Card3D from '../components/ui/Card3D';

const ApplicationMatrix = () => {
  const { isStealth } = usePrivacy();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [records, setRecords] = useState([]);
  const [liveIpos, setLiveIpos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [ipoCategoryFilter, setIpoCategoryFilter] = useState('MAINBOARD_LIVE'); // 'MAINBOARD_LIVE' | 'SME_LIVE' | 'ALL'
  
  // Auto-detect mobile screen width on load (default to 'cards' for mobile < 640px, 'table' for desktop)
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  );
  
  // Quick Apply Modal State
  const [quickApplyModalOpen, setQuickApplyModalOpen] = useState(false);
  const [targetApplicant, setTargetApplicant] = useState(null);
  const [targetIpo, setTargetIpo] = useState(null);

  // Application Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState(null);

  // Add Applicant Modal State
  const [addApplicantModalOpen, setAddApplicantModalOpen] = useState(false);
  const [newApplicantForm, setNewApplicantForm] = useState({
    name: '',
    pan: '',
    family: 'Primary Family',
    dematId: '',
    bankAccount: '',
    upiId: ''
  });

  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const [appData, recData, liveIpoData] = await Promise.all([
        api.getApplicants().catch(err => { console.warn('getApplicants:', err); return []; }),
        api.getRecords().catch(err => { console.warn('getRecords:', err); return []; }),
        api.getLiveIpos().catch(err => { console.warn('getLiveIpos:', err); return []; })
      ]);

      let rawApps = Array.isArray(appData) ? appData : (appData?.data || []);
      let sortedApps = Array.isArray(rawApps) ? rawApps.filter(Boolean) : [];

      let rawRecs = Array.isArray(recData) ? recData : (recData?.data || []);
      let sortedRecs = Array.isArray(rawRecs) ? rawRecs.filter(Boolean) : [];

      let rawLiveIpos = Array.isArray(liveIpoData) ? liveIpoData : (liveIpoData?.data || []);
      let sortedLiveIpos = Array.isArray(rawLiveIpos) ? rawLiveIpos.filter(Boolean) : [];

      // Extract applicant profiles from records if applicants list is empty
      const existingPanOrName = new Set();
      sortedApps.forEach(a => {
        if (a && a.name) existingPanOrName.add(a.name.toLowerCase().trim());
      });

      sortedRecs.forEach(r => {
        const name = (r?.applicantName || '').trim();
        if (name && !existingPanOrName.has(name.toLowerCase())) {
          existingPanOrName.add(name.toLowerCase());
          sortedApps.push({
            id: 'extracted_' + name,
            name: name,
            pan: r.applicantPan || 'ABCDE1234F',
            groupTag: r.family || 'Family',
            dematId: r.dematId || '1208160000000000',
            bankAccount: r.bankName || r.bankAccount || 'HDFC Bank'
          });
        }
      });

      setApplicants(sortedApps);
      setRecords(sortedRecs);
      setLiveIpos(sortedLiveIpos);

      if (showToast) toast.success('Application Matrix updated');
    } catch (e) {
      console.error('Load Application Matrix error:', e);
      if (showToast) toast.error('Failed to update matrix data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute unique IPO names from records and live IPO master
  const activeIpoMap = new Map();
  
  // 1. Add IPOs from actual user application records if matching filter
  (records || []).forEach(r => {
    if (r && r.ipoName) {
      const type = (r.type || r.quota || '').toUpperCase();
      const isSme = type.includes('SME');
      
      if (ipoCategoryFilter === 'MAINBOARD_LIVE' && isSme) return;
      if (ipoCategoryFilter === 'SME_LIVE' && !isSme) return;

      if (!activeIpoMap.has(r.ipoName.toLowerCase())) {
        activeIpoMap.set(r.ipoName.toLowerCase(), {
          name: r.ipoName,
          category: r.quota || (isSme ? 'SME' : 'Mainboard'),
          price: r.price || 0,
          lotSize: r.lotSize || 1,
          isLive: true
        });
      }
    }
  });

  // 2. Add active live IPOs from IPO Master / Live API if matching filter
  (liveIpos || []).forEach(i => {
    const name = (i?.name || i?.ipoName || i?.company || '').trim();
    if (!name) return;

    const status = (i.status || 'LIVE').toUpperCase();
    const type = (i.type || i.category || '').toUpperCase();
    const isSme = type === 'SME';

    // Must be Live IPO unless viewing All
    const isLive = status === 'LIVE' || status === 'OPEN';

    if (ipoCategoryFilter === 'MAINBOARD_LIVE') {
      if (!isLive || isSme) return; // Only Live Mainboard
    } else if (ipoCategoryFilter === 'SME_LIVE') {
      if (!isLive || !isSme) return; // Only Live SME
    }

    if (!activeIpoMap.has(name.toLowerCase())) {
      activeIpoMap.set(name.toLowerCase(), {
        ...i,
        name: name,
        category: isSme ? 'SME' : 'Mainboard',
        priceBand: i.priceBand || i.priceRange || i.price || i.issuePrice || i.cutoffPrice || '',
        price: i.priceBand || i.priceRange || i.price || i.issuePrice || 0,
        lotSize: i.lotSize || i.lot || i.minQty || 1,
        isLive: true,
        raw: i
      });
    }
  });

  const ipoColumns = Array.from(activeIpoMap.values());

  // Filter applicants by search query and group
  const filteredApplicants = (applicants || []).filter(a => {
    if (!a) return false;
    if (selectedGroup !== 'All' && (a.groupTag || a.family || 'Family') !== selectedGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (a.name || '').toLowerCase().includes(q);
      const panMatch = (a.pan || '').toLowerCase().includes(q);
      const upiMatch = (a.upiId || '').toLowerCase().includes(q);
      return nameMatch || panMatch || upiMatch;
    }
    return true;
  });

  // Helper to find record for specific applicant and IPO
  const getApplicationRecord = (applicantName, ipoName) => {
    if (!applicantName || !ipoName) return null;
    return (records || []).find(r => 
      r && (r.applicantName || '').trim().toLowerCase() === applicantName.trim().toLowerCase() &&
      (r.ipoName || '').trim().toLowerCase() === ipoName.trim().toLowerCase()
    );
  };

  const handleOpenQuickApply = (applicant, ipo) => {
    setTargetApplicant(applicant);
    setTargetIpo(ipo);
    setQuickApplyModalOpen(true);
  };

  const handleOpenDetails = (record, applicant, ipo) => {
    setTargetRecord(record);
    setTargetApplicant(applicant);
    setTargetIpo(ipo);
    setDetailsModalOpen(true);
  };

  const handleCreateApplicant = async (e) => {
    e.preventDefault();
    if (!newApplicantForm.name.trim() || !newApplicantForm.pan.trim()) {
      toast.error('Applicant Name and PAN are mandatory!');
      return;
    }

    try {
      await api.addApplicant({
        name: newApplicantForm.name.trim(),
        pan: newApplicantForm.pan.trim().toUpperCase(),
        family: newApplicantForm.family || 'Primary Family',
        dematId: newApplicantForm.dematId.trim(),
        bankAccount: newApplicantForm.bankAccount.trim(),
        upiId: newApplicantForm.upiId.trim()
      });

      toast.success(`Applicant ${newApplicantForm.name} added!`);
      setAddApplicantModalOpen(false);
      setNewApplicantForm({ name: '', pan: '', family: 'Primary Family', dematId: '', bankAccount: '', upiId: '' });
      loadData(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create applicant');
    }
  };

  const exportMatrixCsv = () => {
    if (filteredApplicants.length === 0 || ipoColumns.length === 0) {
      toast.error('No matrix data to export');
      return;
    }

    let csvContent = 'Applicant Name,Group,PAN,Demat ID,' + ipoColumns.map(i => `"${i.name}"`).join(',') + '\n';

    filteredApplicants.forEach(app => {
      let row = `"${app.name || ''}","${app.groupTag || app.family || 'Family'}","${app.pan || ''}","${app.dematId || ''}",`;
      const cellValues = ipoColumns.map(ipo => {
        const rec = getApplicationRecord(app.name, ipo.name);
        if (rec) {
          return `"Applied (${rec.quota || 'IND'}, ${rec.shares || 1} shares, Bank: ${rec.bankName || rec.bankAccount || 'UPI'})"`;
        }
        return '"Not Applied"';
      });
      row += cellValues.join(',') + '\n';
      csvContent += row;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IPO_Application_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Matrix CSV exported successfully!');
  };

  if (loading) {
    return <PageLoader text="Building Live Application Matrix..." />;
  }

  // Calculate Overall Matrix Coverage Stats
  let totalPossibleApplications = filteredApplicants.length * ipoColumns.length;
  let totalActualApplied = 0;
  filteredApplicants.forEach(app => {
    ipoColumns.forEach(ipo => {
      if (getApplicationRecord(app.name, ipo.name)) totalActualApplied++;
    });
  });

  const coveragePct = totalPossibleApplications > 0 ? Math.round((totalActualApplied / totalPossibleApplications) * 100) : 0;
  const groups = ['All', ...new Set(applicants.map(a => a?.groupTag || a?.family || 'Family'))];

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 pb-16 font-sans px-2 sm:px-4 md:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Grid className="text-emerald-400 shrink-0" size={26} />
            Applicant Matrix Desk
          </h1>
          <p className="text-[11px] sm:text-xs text-secondary mt-1 leading-relaxed">
            Live grid matching all family applicants against active IPOs with account details, lot counts, and 1-click bidding.
          </p>
        </div>

        {/* Action Controls & Responsive View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 border border-border rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-emerald-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
              title="Mobile Card View"
            >
              <LayoutList size={14} /> <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-emerald-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
              title="Full Table Grid"
            >
              <Table size={14} /> <span>Grid</span>
            </button>
          </div>

          <button
            onClick={() => setAddApplicantModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={15} /> <span>+ Add</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-surface border border-border text-secondary hover:text-white hover:border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Refresh Matrix Data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportMatrixCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards with 3D Tilt Physics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card3D depth={8} className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-secondary truncate">Applicants</div>
            <div className="text-lg sm:text-xl font-black text-white">{filteredApplicants.length}</div>
          </div>
        </Card3D>

        <Card3D depth={8} className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
            <Globe size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-secondary truncate">Live Mainboard IPOs</div>
            <div className="text-lg sm:text-xl font-black text-blue-300">{ipoColumns.length}</div>
          </div>
        </Card3D>

        <Card3D depth={8} className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-secondary truncate">Bids Placed</div>
            <div className="text-lg sm:text-xl font-black text-indigo-300">{totalActualApplied}</div>
          </div>
        </Card3D>

        <Card3D depth={8} className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-secondary truncate">Coverage Rate</div>
            <div className="text-lg sm:text-xl font-black text-amber-300">{coveragePct}%</div>
          </div>
        </Card3D>
      </div>

      {/* Search & Group Filter Bar */}
      <div className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search Applicant by Name, PAN, UPI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* IPO Category Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-bold shrink-0">IPO Type:</span>
            <select
              value={ipoCategoryFilter}
              onChange={e => setIpoCategoryFilter(e.target.value)}
              className="bg-black/40 border border-border rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="MAINBOARD_LIVE">🚀 Live Mainboard Only</option>
              <option value="SME_LIVE">🏢 Live SME Only</option>
              <option value="ALL">⚡ All Active IPOs</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-bold flex items-center gap-1 shrink-0"><Filter size={13} /> Group:</span>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="bg-black/40 border border-border rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              {groups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FULL CENTERED EMPTY STATE CARD WHEN NO APPLICANTS */}
      {filteredApplicants.length === 0 ? (
        <div className="glass-card rounded-2xl border border-border p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 my-6 shadow-2xl w-full">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Users size={32} />
          </div>
          
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">No Family Applicants Added Yet</h2>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              Add family members to start tracking applicant bidding status, Demat details, and bank accounts across all active IPOs.
            </p>
          </div>

          <button
            onClick={() => setAddApplicantModalOpen(true)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/25 cursor-pointer hover:scale-105"
          >
            <UserPlus size={18} /> + Add First Applicant
          </button>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: Touch-Optimized Responsive Table Grid View */}
          {viewMode === 'table' && (
            <div className="glass-card rounded-xl sm:rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col w-full">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[72vh] touch-pan-x w-full">
                <table className="w-full text-left text-xs border-collapse min-w-full">
                  <thead className="sticky top-0 z-20 bg-[#09090b] backdrop-blur-md border-b border-border shadow-md">
                    <tr>
                      {/* Left Sticky Column Header (Compact on mobile) */}
                      <th className="sticky left-0 z-30 bg-[#0c0c10] px-2.5 sm:px-6 py-3.5 w-28 sm:w-64 border-r border-border font-extrabold text-white text-[11px] sm:text-xs uppercase tracking-wider shadow-[4px_0_12px_rgba(0,0,0,0.5)] shrink-0">
                        Applicant ({filteredApplicants.length})
                      </th>

                      {/* IPO Column Headers */}
                      {ipoColumns.map((ipo) => (
                        <th key={ipo.name} className="px-4 py-3.5 min-w-[170px] sm:min-w-[210px] border-r border-border/50 text-center font-bold">
                          <div className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[190px] mx-auto">{ipo.name}</div>
                          <div className="flex items-center justify-center gap-1 mt-1 text-[10px]">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full font-extrabold uppercase">
                              {ipo.category || 'Mainboard'}
                            </span>
                            {ipo.price ? <span className="text-emerald-400 font-mono">₹{ipo.price}</span> : null}
                          </div>
                        </th>
                      ))}

                      {ipoColumns.length === 0 && (
                        <th className="px-6 py-4 text-center text-secondary font-medium">
                          No live mainboard IPOs currently open. Switch filter to "All Active IPOs".
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/50">
                    {filteredApplicants.map((app) => (
                      <tr key={app.id || app.name} className="hover:bg-white/[0.02] transition-colors">
                        {/* Left Sticky Column Cell (Compact width on mobile) */}
                        <td className="sticky left-0 z-10 bg-[#0c0c10] px-2.5 sm:px-6 py-3 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.5)] shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs">
                              {app.name ? app.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="truncate min-w-0">
                              <div className="font-extrabold text-white text-[11px] sm:text-xs truncate">{app.name}</div>
                              <div className="text-[9px] text-secondary font-mono truncate">
                                {isStealth ? 'XX****12X' : (app.pan || 'No PAN')}
                              </div>
                              {(app.groupTag || app.family) && (
                                <span className="hidden sm:inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-black/40 border border-white/10 text-zinc-400 rounded truncate max-w-[120px]">
                                  {app.groupTag || app.family}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Matrix Application Cells */}
                        {ipoColumns.map((ipo) => {
                          const record = getApplicationRecord(app.name, ipo.name);
                          const isApplied = !!record;
                          const shares = parseFloat(record?.shares) || 0;
                          const lotSize = parseFloat(record?.lotSize || ipo.lotSize) || 1;
                          const lotCount = record?.lots || (shares > 0 && lotSize > 0 ? Math.max(1, Math.round(shares / lotSize)) : 1);

                          return (
                            <td key={ipo.name} className="px-3 py-3 border-r border-border/40 text-center align-middle">
                              {isApplied ? (
                                <div
                                  onClick={() => handleOpenDetails(record, app, ipo)}
                                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-1 shadow-sm hover:border-emerald-400 transition-all cursor-pointer hover:scale-[1.02] group"
                                  title="Click to view full application details"
                                >
                                  <div className="flex items-center justify-center gap-1 text-emerald-400 font-black text-[11px] group-hover:text-emerald-300">
                                    <CheckCircle2 size={13} />
                                    <span>APPLIED</span>
                                  </div>

                                  <div className="text-[11px] font-bold text-white font-mono">
                                    {lotCount} {lotCount === 1 ? 'Lot' : 'Lots'} ({record.quota || 'Retail'})
                                  </div>
                                  {shares > 0 && (
                                    <div className="text-[9px] text-zinc-400 font-mono">
                                      {shares} shares
                                    </div>
                                  )}

                                  {/* Bank Account */}
                                  <div className="text-[10px] text-zinc-300 truncate max-w-[140px] mx-auto flex items-center justify-center gap-1">
                                    <Building2 size={10} className="text-indigo-400 shrink-0" />
                                    <span className="truncate">{record.bankName || record.bankAccount || record.dematId || 'UPI Direct'}</span>
                                  </div>

                                  {/* Status Badge */}
                                  <div className="pt-0.5">
                                    {record.alloted === 'Yes' ? (
                                      <span className="px-2 py-0.5 bg-emerald-500 text-black font-extrabold text-[9px] rounded uppercase tracking-wide">
                                        🎉 Allotted
                                      </span>
                                    ) : record.alloted === 'No' ? (
                                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 text-[9px] rounded">
                                        ❌ Not Allotted
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[9px] rounded inline-flex items-center gap-1">
                                        <Clock size={9} className="animate-spin text-amber-400" /> Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 space-y-1">
                                  <div className="text-[10px] text-zinc-600 font-medium italic">
                                    — Not Applied
                                  </div>

                                  <button
                                    onClick={() => handleOpenQuickApply(app, ipo)}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 group cursor-pointer"
                                  >
                                    <Plus size={11} className="group-hover:scale-125 transition-transform" /> Apply
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: HIGH-DENSITY ULTRA-CLEAN MOBILE CARDS VIEW */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {filteredApplicants.map((app) => (
                <div key={app.id || app.name} className="glass-card p-4 rounded-2xl border border-border space-y-3 shadow-xl">
                  {/* Applicant Header */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm">
                        {app.name ? app.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">{app.name}</h3>
                        <div className="text-[10px] text-secondary font-mono">
                          {isStealth ? 'PAN: XX****12X' : (app.pan ? `PAN: ${app.pan}` : 'No PAN')}
                        </div>
                      </div>
                    </div>

                    {(app.groupTag || app.family) && (
                      <span className="text-[10px] px-2.5 py-0.5 bg-black/40 border border-white/10 text-zinc-300 rounded-full font-semibold">
                        {app.groupTag || app.family}
                      </span>
                    )}
                  </div>

                  {/* IPO Cards Stack for this Applicant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ipoColumns.map((ipo) => {
                      const record = getApplicationRecord(app.name, ipo.name);
                      const isApplied = !!record;

                      return (
                        <div
                          key={ipo.name}
                          onClick={() => isApplied && handleOpenDetails(record, app, ipo)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            isApplied
                              ? 'bg-emerald-500/10 border-emerald-500/30 cursor-pointer hover:border-emerald-400 shadow-md shadow-emerald-500/5'
                              : 'bg-[#121216]/60 border-border/50'
                          }`}
                        >
                          <div className="min-w-0 pr-3 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-white text-xs truncate">{ipo.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded font-bold uppercase shrink-0">
                                {ipo.category || 'Mainboard'}
                              </span>
                            </div>

                            {isApplied ? (
                              <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                {(() => {
                                  const sh = parseFloat(record?.shares) || 0;
                                  const ls = parseFloat(record?.lotSize || ipo.lotSize) || 1;
                                  const lc = record?.lots || (sh > 0 && ls > 0 ? Math.max(1, Math.round(sh / ls)) : 1);
                                  return `${lc} ${lc === 1 ? 'Lot' : 'Lots'} (${record.quota || 'Retail'})${sh > 0 ? ` • ${sh} sh` : ''}`;
                                })()}
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-500 italic">— Not Applied</div>
                            )}

                            {isApplied && (
                              <div className="text-[9px] text-zinc-400 font-mono truncate flex items-center gap-1">
                                <Building2 size={9} className="text-indigo-400 shrink-0" />
                                <span className="truncate">{record.bankName || record.bankAccount || 'UPI Direct'}</span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isApplied ? (
                              <button className="px-2.5 py-1.5 bg-emerald-500 text-black font-extrabold text-[10px] rounded-lg inline-flex items-center gap-1 shadow-md shadow-emerald-500/20">
                                View <ChevronRight size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenQuickApply(app, ipo)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-md shadow-indigo-500/20 cursor-pointer"
                              >
                                <Plus size={12} /> Apply
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {ipoColumns.length === 0 && (
                      <div className="text-xs text-secondary italic py-2">No live mainboard IPOs found.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        record={targetRecord}
        applicant={targetApplicant}
        ipo={targetIpo}
        onDeleteSuccess={() => loadData(true)}
        onUpdateSuccess={() => loadData(true)}
      />

      {/* Quick Apply Modal */}
      <QuickApplyModal
        isOpen={quickApplyModalOpen}
        onClose={() => setQuickApplyModalOpen(false)}
        ipo={targetIpo}
        initialApplicant={targetApplicant}
        onApplied={() => loadData(true)}
        onSuccess={() => loadData(true)}
      />

      {/* Add Applicant Modal */}
      <Modal
        isOpen={addApplicantModalOpen}
        onClose={() => setAddApplicantModalOpen(false)}
        title="Add New Family Applicant"
      >
        <form onSubmit={handleCreateApplicant} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Applicant Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newApplicantForm.name}
              onChange={e => setNewApplicantForm({ ...newApplicantForm, name: e.target.value })}
              placeholder="e.g. Dakshit Patel"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              PAN Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={newApplicantForm.pan}
              onChange={e => setNewApplicantForm({ ...newApplicantForm, pan: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
              className="input-field uppercase font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Family Group</label>
              <input
                type="text"
                value={newApplicantForm.family}
                onChange={e => setNewApplicantForm({ ...newApplicantForm, family: e.target.value })}
                placeholder="e.g. Patel Family"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Demat Account ID</label>
              <input
                type="text"
                value={newApplicantForm.dematId}
                onChange={e => setNewApplicantForm({ ...newApplicantForm, dematId: e.target.value })}
                placeholder="16-digit Demat ID"
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Primary Bank Name</label>
              <input
                type="text"
                value={newApplicantForm.bankAccount}
                onChange={e => setNewApplicantForm({ ...newApplicantForm, bankAccount: e.target.value })}
                placeholder="e.g. HDFC Bank"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">UPI ID</label>
              <input
                type="text"
                value={newApplicantForm.upiId}
                onChange={e => setNewApplicantForm({ ...newApplicantForm, upiId: e.target.value })}
                placeholder="e.g. dakshit@okhdfc"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setAddApplicantModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-surface border border-border text-secondary hover:text-white text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              Save Applicant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ApplicationMatrix;
