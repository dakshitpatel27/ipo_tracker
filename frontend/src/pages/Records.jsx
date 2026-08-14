import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, SlidersHorizontal, Trash2, Edit2,
  Upload, Download, ExternalLink, RotateCcw, RefreshCw,
  ChevronDown, X, FileText, AlertCircle, FileSpreadsheet, Sparkles, Trophy
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import UpgradeModal from '../components/ui/UpgradeModal';
import SmartImportModal from '../components/ui/SmartImportModal';
import AllotmentVictoryModal from '../components/ui/AllotmentVictoryModal';
import IpoForm from '../components/forms/IpoForm';
import BatchAsbaModal from '../components/forms/BatchAsbaModal';
import CountdownBadge from '../components/ui/CountdownBadge';
import MandateTrackerWidget from '../components/ui/MandateTrackerWidget';
import SubscriptionOddsModal from '../components/ui/SubscriptionOddsModal';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

const CSV_HEADERS = [
  'ipoName', 'applicantName', 'quota', 'listingDate',
  'lotSize', 'shares', 'price', 'gmp', 'listingPrice', 'amount', 'applied',
  'alloted', 'profit', 'notes'
];

const REGISTRAR_URLS = {
  'KFintech':   'https://ipoallotment.kfintech.com/',
  'LinkIntime': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
  'Bigshare':   'https://ipo.bigshareonline.com/ipo_allotment.html',
  'MUFG':       'https://mufindia.com/ipo-allotment-status/',
  'Skyline':    'https://www.skylinerta.com/ipo_allotment.php',
  'Cameo':      'https://www.cameoindia.com/ipoallotment/',
};

const getAllotmentUrl = (record) => REGISTRAR_URLS[record.registrar] || 'https://ipowatch.in/ipo-allotment-status/';

/* ── Status badge ── */
const StatusBadge = ({ applied, alloted }) => {
  if (applied === 'Pending')
    return <span className="badge badge-amber"><span className="status-dot" style={{ background: '#f59e0b' }} />Pending</span>;
  if (applied === 'No')
    return <span className="badge badge-gray"><span className="status-dot" style={{ background: '#64748b' }} />Not Applied</span>;
  if (parseFloat(alloted) > 0)
    return <span className="badge badge-emerald"><span className="status-dot" style={{ background: '#10b981' }} />Allotted</span>;
  if (applied === 'Yes' && (alloted === '0' || alloted === 0))
    return <span className="badge badge-rose"><span className="status-dot" style={{ background: '#f43f5e' }} />Not Allotted</span>;
  return <span className="badge badge-blue"><span className="status-dot" style={{ background: '#3b82f6' }} />Applied</span>;
};

/* ── Records Page ── */
const Records = () => {
  const { user, subscriptionTiers } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterQuota, setFilterQuota] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchAsbaOpen, setIsBatchAsbaOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const [isOddsModalOpen, setIsOddsModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [victoryRecord, setVictoryRecord] = useState(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const filterRef = useRef(null);

  // PDF Parser state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [parsedMatches, setParsedMatches] = useState([]);
  const [selectedIpo, setSelectedIpo] = useState('');
  const [issuePrice, setIssuePrice] = useState('');
  const [lotSize, setLotSize] = useState('15');

  // Close filter on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const handleAddOrEdit = async (formData) => {
    try {
      if (editingRecord) {
        await api.updateRecord(editingRecord.id, formData);
      } else {
        await api.addRecord(formData);
      }
      setIsModalOpen(false);
      loadRecords();
      toast.success(editingRecord ? 'Record updated!' : 'Record added!');
      const alloted = parseFloat(formData.alloted) || 0;
      const profit = parseFloat(formData.profit) || 0;
      if (alloted > 0 && profit > 0 && (!editingRecord || (parseFloat(editingRecord.alloted) || 0) === 0)) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
        toast.success(`Congratulations on your ₹${profit} profit! 🎉`, { icon: '💰' });
      }
    } catch (error) {
      toast.error('Error saving record');
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await api.deleteRecord(recordToDelete);
      setRecordToDelete(null);
      loadRecords();
      toast.success('Record deleted');
    } catch (error) {
      toast.error('Error deleting record');
    }
  };

  const openAddModal = () => {
    const userTier = user?.subscription || 'free';
    const tierLimits = subscriptionTiers?.[userTier];
    if (tierLimits && records.length >= tierLimits.maxRecords) {
      setShowUpgradeModal(true);
    } else {
      setEditingRecord(null);
      setIsModalOpen(true);
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    if (records.length === 0) { toast.error('No records to export.'); return; }
    const exportHeaders = ['IPO Name', 'Applicant Name', 'Quota', 'Listing Date', 'Lot Size', 'Shares', 'Price', 'GMP', 'Listing Price', 'Investment Amount', 'Applied', 'Allotted', 'Notes'];
    const keys = ['ipoName', 'applicantName', 'quota', 'listingDate', 'lotSize', 'shares', 'price', 'gmp', 'listingPrice', 'amount', 'applied', 'alloted', 'notes'];
    const headerRow = exportHeaders.join(',');
    const csvRows = records.map(r =>
      keys.map(k => {
        let val = r[k] || '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',')
    );
    const csvString = [headerRow, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipo_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Records exported!');
  };

  const handleDownloadTemplate = () => {
    const templateCsv = `IPO Name,Applicant Name,Quota,Listing Date,Lot Size,Shares,Price,GMP,Listing Price,Investment Amount,Applied,Allotted,Notes`;

    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ipo_records_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded IPO Records Blank CSV Template!', { icon: '📥' });
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    import('papaparse').then((Papa) => {
      Papa.default.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const HEADER_MAP = {
              'ipoName': ['IPO Name', 'ipoName', 'iponame', 'ipo'],
              'applicantName': ['Applicant Name', 'applicantName', 'applicantname', 'applicant'],
              'quota': ['Quota', 'quota'],
              'listingDate': ['Listing Date', 'listingDate', 'listingdate'],
              'lotSize': ['Lot Size', 'lotSize', 'lotsize'],
              'shares': ['Shares', 'shares', 'qty', 'quantity'],
              'price': ['Price', 'price', 'issueprice'],
              'gmp': ['GMP', 'gmp'],
              'listingPrice': ['Listing Price', 'listingPrice', 'listingprice'],
              'amount': ['Investment Amount', 'Amount', 'amount', 'totalamount'],
              'applied': ['Applied', 'applied'],
              'alloted': ['Allotted', 'alloted', 'status'],
              'notes': ['Notes', 'notes', 'remarks']
            };

            const recordsToImport = [];
            results.data.forEach(row => {
              const recordData = {};
              Object.keys(HEADER_MAP).forEach(internalKey => {
                const possibleHeaders = HEADER_MAP[internalKey];
                const matchedHeader = Object.keys(row).find(k =>
                  possibleHeaders.some(ph => ph.toLowerCase() === k.toLowerCase().trim())
                );
                if (matchedHeader && row[matchedHeader]) {
                  recordData[internalKey] = String(row[matchedHeader]).trim();
                }
              });
              if (recordData.ipoName && recordData.applicantName) {
                recordData.id = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                recordData.createdAt = new Date().toISOString();
                recordsToImport.push(recordData);
              }
            });
            if (recordsToImport.length > 0) {
              const res = await api.bulkAddRecords(recordsToImport);
              toast.success(`Successfully imported ${res.count} records!`);
              loadRecords();
            } else {
              toast.error('No valid records found to import.');
            }
          } catch (err) {
            toast.error('Error during bulk import: ' + err.message);
          }
          e.target.value = null;
        },
        error: () => toast.error('Error parsing CSV file')
      });
    });
  };

  const refundRecords = records.filter(r => r.applied === 'Yes' && !(parseFloat(r.alloted) > 0));

  const markRefund = async (record, status) => {
    try {
      await api.updateRecord(record.id, { ...record, refundStatus: status });
      await loadRecords();
      toast.success(status === 'received' ? '✅ Refund marked as received!' : 'Refund marked as pending');
    } catch (e) {
      toast.error('Failed to update refund status');
    }
  };

  const hasFilters = filterStatus !== 'ALL' || filterQuota !== 'ALL' || sortOrder !== 'newest';

  const filteredRecords = records
    .filter(r =>
      ((r.ipoName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.applicantName || '').toLowerCase().includes(search.toLowerCase())) &&
      (filterStatus === 'ALL' ||
        (filterStatus === 'allotted' && parseFloat(r.alloted) > 0) ||
        (filterStatus === 'not_allotted' && r.applied === 'Yes' && parseFloat(r.alloted) <= 0) ||
        (filterStatus === 'pending' && r.applied === 'Pending') ||
        (filterStatus === 'not_applied' && r.applied === 'No')
      ) &&
      (filterQuota === 'ALL' || (r.quota || 'Retail') === filterQuota)
    )
    .sort((a, b) => {
      if (sortOrder === 'profit_desc') return (parseFloat(b.profit) || 0) - (parseFloat(a.profit) || 0);
      if (sortOrder === 'profit_asc')  return (parseFloat(a.profit) || 0) - (parseFloat(b.profit) || 0);
      if (sortOrder === 'oldest')      return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="space-y-5 h-full flex flex-col">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Top row */}
        <div className="page-header">
          <div>
            <h1 className="page-title">IPO Records</h1>
            <p className="page-subtitle">
              {records.length} records · {records.filter(r => parseFloat(r.alloted) > 0).length} allotted
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Tab switcher */}
            <div className="tab-switcher">
              <button
                onClick={() => setActiveTab('records')}
                className={`tab-item ${activeTab === 'records' ? 'active' : ''}`}
                style={activeTab === 'records' ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' } : {}}
              >
                All Records
                <span className="ml-1.5 text-[0.65rem] opacity-60 font-bold">({records.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('refunds')}
                className={`tab-item flex items-center gap-1.5 ${activeTab === 'refunds' ? 'active' : ''}`}
                style={activeTab === 'refunds' ? { background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' } : {}}
              >
                💸 Refunds
                {refundRecords.length > 0 && (
                  <span className={`min-w-[18px] h-[18px] text-[0.6rem] font-black px-1 rounded-full flex items-center justify-center ${activeTab === 'refunds' ? 'bg-rose-500 text-white' : 'bg-white/10 text-white'}`}>
                    {refundRecords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('pdfParser')}
                className={`tab-item flex items-center gap-1.5 ${activeTab === 'pdfParser' ? 'active' : ''}`}
                style={activeTab === 'pdfParser' ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' } : {}}
              >
                📄 BoA PDF Parser
              </button>
            </div>

            {/* Actions */}
            {activeTab === 'records' && (
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
                <button onClick={() => setIsOddsModalOpen(true)} className="btn-outline border-amber-500/30 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1.5" title="Live QIB/NII/Retail Subscription Odds">
                  <span>✨ Live Odds</span>
                </button>
                <button onClick={() => setIsBatchAsbaOpen(true)} className="btn-outline flex items-center gap-1.5" title="Generate Multi-Account Batch ASBA Payload">
                  <FileSpreadsheet size={14} className="text-indigo-400" /> Batch ASBA
                </button>
                <button onClick={handleDownloadTemplate} className="btn-outline flex items-center gap-1.5" title="Download CSV Import Template">
                  <FileSpreadsheet size={14} className="text-emerald-400" /> Template
                </button>
                <button onClick={() => setIsSmartImportOpen(true)} className="btn-outline flex items-center gap-1.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10" title="Smart Import Records with Extra Column Detection">
                  <Sparkles size={14} className="text-indigo-400" /> Smart Import
                </button>
                <button onClick={handleExportCSV} className="btn-outline flex items-center gap-1.5" title="Export Records to CSV">
                  <Download size={14} className="text-amber-400" /> Export
                </button>
                <button onClick={openAddModal} className="btn-primary">
                  <Plus size={16} /> Add Record
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mandate Tracker Widget */}
      <MandateTrackerWidget onStatusChange={loadRecords} />

      {/* ── Refund Tab ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'refunds' && (
          <motion.div
            key="refunds"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass-card flex-1 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-[0.9375rem]">Refund Tracker</div>
                <div className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">Non-allotted applications where ASBA refund should be processed</div>
              </div>
              {refundRecords.length > 0 && (
                <span className="badge badge-rose">{refundRecords.length} pending</span>
              )}
            </div>

            {refundRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <div className="font-semibold text-white mb-1">All Clear!</div>
                <div className="text-sm text-[var(--text-secondary)]">All your applications were allotted. No pending refunds.</div>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="data-table whitespace-nowrap">
                  <thead>
                    <tr>
                      <th>IPO Name</th>
                      <th>Applicant</th>
                      <th>Quota</th>
                      <th className="text-right">Amount</th>
                      <th className="text-center">Listing Date</th>
                      <th className="text-center">Refund Status</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundRecords.map(r => (
                      <tr key={r.id}>
                        <td className="font-semibold text-white">{r.ipoName}</td>
                        <td className="text-[var(--text-secondary)]">{r.applicantName}</td>
                        <td><span className="badge badge-gray">{r.quota || 'Retail'}</span></td>
                        <td className="text-right font-mono-num font-semibold text-rose-400">₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="text-center text-[var(--text-secondary)] text-xs">{r.listingDate || '—'}</td>
                        <td className="text-center">
                          {r.refundStatus === 'received'
                            ? <span className="badge badge-emerald">✅ Received</span>
                            : <span className="badge badge-amber">⏳ Pending</span>
                          }
                        </td>
                        <td className="text-center">
                          {r.refundStatus === 'received' ? (
                            <button onClick={() => markRefund(r, 'pending')} className="btn-ghost text-xs flex items-center gap-1 mx-auto">
                              <RotateCcw size={11} /> Undo
                            </button>
                          ) : (
                            <button onClick={() => markRefund(r, 'received')} className="badge badge-emerald cursor-pointer hover:bg-emerald-500/20 transition-colors flex items-center gap-1 mx-auto">
                              <RefreshCw size={10} /> Mark Received
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PDF Parser Tab ── */}
        {activeTab === 'pdfParser' && (
          <motion.div
            key="pdfParser"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-surface border border-border rounded-xl flex-1 flex flex-col overflow-hidden p-6 space-y-6"
          >
            <div>
              <h2 className="font-semibold text-white text-[0.9375rem]">Basis of Allotment (BoA) PDF Parser</h2>
              <p className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">Upload a registrar allotment PDF to match your saved portfolios and import results in bulk.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-secondary uppercase tracking-wider">IPO Name</label>
                <input 
                  type="text" 
                  value={selectedIpo} 
                  onChange={e => setSelectedIpo(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. Ola Electric" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Issue Price (₹)</label>
                <input 
                  type="number" 
                  value={issuePrice} 
                  onChange={e => setIssuePrice(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. 76" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Retail Lot Size (Shares)</label>
                <input 
                  type="number" 
                  value={lotSize} 
                  onChange={e => setLotSize(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. 195" 
                />
              </div>
            </div>

            {/* Drag Drop Upload Container */}
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface-2 flex flex-col items-center justify-center space-y-3 hover:border-emerald-500/30 transition-colors">
              <Upload size={32} className="text-secondary" />
              <div>
                <p className="text-sm font-medium text-white">
                  {pdfFile ? pdfFile.name : 'Select or drag & drop allotment PDF'}
                </p>
                <p className="text-xs text-secondary mt-1">Supports Registrar Basis of Allotment PDF files up to 20MB</p>
              </div>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={e => setPdfFile(e.target.files[0])} 
                className="hidden" 
                id="allotment-pdf-upload" 
              />
              <div className="flex gap-2">
                <label htmlFor="allotment-pdf-upload" className="btn-outline cursor-pointer">
                  Choose File
                </label>
                {pdfFile && (
                  <button 
                    onClick={async () => {
                      if (!selectedIpo) {
                        toast.error("Please enter the IPO Name first");
                        return;
                      }
                      try {
                        setPdfParsing(true);
                        const res = await api.parseAllotmentPdf(pdfFile);
                        setParsedMatches(res);
                        toast.success(`Parsed PDF successfully! Found ${res.length} matches.`);
                      } catch(e) {
                        toast.error("Parsing failed: " + e.message);
                      } finally {
                        setPdfParsing(false);
                      }
                    }}
                    disabled={pdfParsing}
                    className="btn-primary"
                  >
                    {pdfParsing ? 'Parsing...' : 'Parse Allotment PDF'}
                  </button>
                )}
              </div>
            </div>

            {/* Matches Table */}
            {parsedMatches.length > 0 && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-semibold text-white">Matches against Portfolio Profiles</h3>
                  <button 
                    onClick={async () => {
                      try {
                        const recordsToImport = parsedMatches.map(m => {
                          const shares = m.appliedShares || parseInt(lotSize) || 15;
                          const priceNum = parseFloat(issuePrice) || 0;
                          const amount = shares * priceNum;
                          return {
                            id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                            ipoName: selectedIpo,
                            applicantName: m.applicantName,
                            pan: m.pan,
                            quota: 'Retail',
                            listingDate: '',
                            lotSize: parseInt(lotSize) || 15,
                            shares: shares,
                            price: priceNum,
                            amount: amount,
                            applied: 'Yes',
                            alloted: m.allottedShares,
                            profit: 0,
                            holdingStatus: 'Holding',
                            dematId: m.dematId,
                            bankAccount: m.bankAccount,
                            ifscCode: m.ifscCode,
                            createdAt: new Date().toISOString()
                          };
                        });
                        await api.bulkAddRecords(recordsToImport);
                        toast.success(`Successfully imported ${recordsToImport.length} allotment records!`);
                        loadRecords();
                        setActiveTab('records');
                        setParsedMatches([]);
                        setPdfFile(null);
                      } catch(e) {
                        toast.error("Failed to import: " + e.message);
                      }
                    }}
                    className="btn-primary"
                  >
                    Bulk Import matched records
                  </button>
                </div>

                <div className="flex-1 overflow-auto border border-border rounded-xl">
                  <table className="data-table whitespace-nowrap">
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>PAN</th>
                        <th>Status</th>
                        <th className="text-right">Applied</th>
                        <th className="text-right">Allotted</th>
                        <th>Demat / Bank</th>
                        <th>Snippet Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedMatches.map((m, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold text-white">{m.applicantName}</td>
                          <td className="font-mono text-xs">{m.pan}</td>
                          <td>
                            {m.allottedShares > 0 ? (
                              <span className="badge badge-emerald">Allotted</span>
                            ) : (
                              <span className="badge badge-rose">Not Allotted</span>
                            )}
                          </td>
                          <td className="text-right font-mono">{m.appliedShares}</td>
                          <td className="text-right font-mono text-emerald-400 font-bold">{m.allottedShares}</td>
                          <td className="text-xs text-secondary">
                            <div>Demat: {m.dematId || '—'}</div>
                            <div>Bank A/C: {m.bankAccount || '—'}</div>
                          </td>
                          <td className="text-[10px] font-mono text-secondary max-w-xs truncate" title={m.snippet}>
                            {m.snippet}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Records Tab ── */}
        {activeTab === 'records' && (
          <motion.div
            key="records"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass-card flex-1 flex flex-col overflow-hidden"
          >
            {/* Toolbar */}
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                <input
                  type="text"
                  placeholder="Search IPO or applicant…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/20 border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-[0.8125rem] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filter */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`btn-outline flex items-center gap-2 ${hasFilters ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : ''}`}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  <ChevronDown size={13} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 glass-card border border-[var(--border-light)] rounded-2xl p-4 space-y-4 z-30 shadow-2xl shadow-black/60"
                    >
                      <div className="font-semibold text-white text-[0.8125rem]">Filter & Sort</div>

                      <div>
                        <label className="section-label block mb-1.5">Status</label>
                        <select
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value)}
                          className="input-field text-[0.8125rem] py-2"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="allotted">Allotted</option>
                          <option value="not_allotted">Not Allotted</option>
                          <option value="pending">Pending</option>
                          <option value="not_applied">Not Applied</option>
                        </select>
                      </div>

                      <div>
                        <label className="section-label block mb-1.5">Quota</label>
                        <select
                          value={filterQuota}
                          onChange={e => setFilterQuota(e.target.value)}
                          className="input-field text-[0.8125rem] py-2"
                        >
                          <option value="ALL">All Quotas</option>
                          <option value="Retail">Retail</option>
                          <option value="sHNI">sHNI</option>
                          <option value="bHNI">bHNI</option>
                          <option value="Shareholder">Shareholder</option>
                          <option value="Employee">Employee</option>
                        </select>
                      </div>

                      <div>
                        <label className="section-label block mb-1.5">Sort By</label>
                        <select
                          value={sortOrder}
                          onChange={e => setSortOrder(e.target.value)}
                          className="input-field text-[0.8125rem] py-2"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="profit_desc">Highest Profit</option>
                          <option value="profit_asc">Lowest Profit</option>
                        </select>
                      </div>

                      {hasFilters && (
                        <button
                          onClick={() => { setFilterStatus('ALL'); setFilterQuota('ALL'); setSortOrder('newest'); setFilterOpen(false); }}
                          className="w-full text-xs text-[var(--text-secondary)] hover:text-rose-400 transition-colors py-1 border-t border-[var(--border)] pt-3 flex items-center justify-center gap-1.5"
                        >
                          <X size={11} /> Reset Filters
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Result count */}
              {search && (
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {filteredRecords.length} result{filteredRecords.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="shimmer h-12 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : (
                <table className="data-table whitespace-nowrap">
                  <thead className="sticky top-0 z-10" style={{ background: 'rgba(8,11,18,0.95)', backdropFilter: 'blur(12px)' }}>
                    <tr>
                      <th>IPO Name</th>
                      <th>Applicant</th>
                      <th>Quota</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Profit</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, i) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.02 * Math.min(i, 15) }}
                        className="group cursor-pointer"
                      >
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-white text-[0.8125rem]">{record.ipoName}</span>
                            {record.listingDate && (
                              <CountdownBadge targetDate={record.listingDate} label="Lists" variant="listing" />
                            )}
                            {record.tags && (() => {
                              try {
                                const parsedTags = typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags;
                                if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                                  return (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {parsedTags.map((t, idx) => (
                                        <span key={idx} className="text-[0.6rem] font-medium px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{t}</span>
                                      ))}
                                    </div>
                                  );
                                }
                              } catch(e) {}
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="text-[var(--text-secondary)]">{record.applicantName}</td>
                        <td>
                          <span className="badge badge-gray">{record.quota || 'Retail'}</span>
                        </td>
                        <td>
                          <StatusBadge applied={record.applied} alloted={record.alloted} />
                        </td>
                        <td className="text-right font-mono-num text-[var(--text-secondary)]">
                          ₹{parseFloat(record.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className={`text-right font-mono-num font-semibold ${parseFloat(record.profit) > 0 ? 'text-emerald-400' : parseFloat(record.profit) < 0 ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
                          {parseFloat(record.profit) > 0 ? '+' : ''}{parseFloat(record.profit || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(String(record.status || '').toUpperCase() === 'ALLOTTED' || parseFloat(record.alloted) > 0) && (
                              <button
                                onClick={() => { setVictoryRecord(record); setIsVictoryModalOpen(true); }}
                                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Generate Shareable Victory Card (PNG / WhatsApp)"
                              >
                                <Trophy size={14} />
                              </button>
                            )}
                            <a
                              href={getAllotmentUrl(record)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                if (record.pan) {
                                  navigator.clipboard.writeText(record.pan);
                                  toast.success(`PAN copied! Opening ${record.registrar || 'allotment checker'}…`);
                                }
                              }}
                              className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title={`Check Allotment${record.registrar ? ` (${record.registrar})` : ''}`}
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => openEditModal(record)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setRecordToDelete(record.id)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}

                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                              {search ? <Search size={22} /> : <FileText size={22} />}
                            </div>
                            <div>
                              <div className="font-semibold text-white mb-1 text-sm">
                                {search ? 'No matching records' : 'No records yet'}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {search ? 'Try a different search term or reset filters' : 'Click "Add Record" to get started'}
                              </div>
                            </div>
                            {!search && (
                              <button onClick={openAddModal} className="btn-primary mt-1">
                                <Plus size={14} /> Add First Record
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRecord ? 'Edit IPO Record' : 'Add New IPO Record'}>
        <IpoForm initialData={editingRecord} onSubmit={handleAddOrEdit} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <ConfirmModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="Are you sure you want to delete this IPO record? This action cannot be undone."
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Record Limit Reached"
        message={`Your current subscription tier (${user?.subscription || 'free'}) only allows up to ${subscriptionTiers?.[user?.subscription || 'free']?.maxRecords || 0} IPO records.`}
      />

      <BatchAsbaModal
        isOpen={isBatchAsbaOpen}
        onClose={() => setIsBatchAsbaOpen(false)}
      />

      <SubscriptionOddsModal
        isOpen={isOddsModalOpen}
        onClose={() => setIsOddsModalOpen(false)}
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        defaultTable="records"
        onSuccess={loadRecords}
      />

      <AllotmentVictoryModal
        isOpen={isVictoryModalOpen}
        onClose={() => setIsVictoryModalOpen(false)}
        record={victoryRecord}
      />
    </div>
  );
};

export default Records;
