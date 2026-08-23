import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  Users, Wallet, RefreshCw, Send, CheckCircle2, AlertCircle, ChevronRight, FileText, Sparkles
} from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';
import PartyLedgerModal from '../components/forms/PartyLedgerModal';
import ApplicantLedgerDetail from '../components/ui/ApplicantLedgerDetail';
import SmartImportModal from '../components/ui/SmartImportModal';
import FamilyProfitSharingEngine from '../components/ui/FamilyProfitSharingEngine';
import PartySettlementPDF from '../components/ui/PartySettlementPDF';
import KostakDealTracker from '../components/ui/KostakDealTracker';

const PartyLedger = () => {
  const [summary, setSummary] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'YOU_WILL_GET' | 'YOU_WILL_GIVE' | 'SETTLED'
  const [familyFilter, setFamilyFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [modalDefaultApplicantId, setModalDefaultApplicantId] = useState('');
  const [modalDefaultType, setModalDefaultType] = useState('gave');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, appData] = await Promise.all([
        api.getPartyLedgerSummary(),
        api.getApplicants()
      ]);
      setSummary(sumData || null);
      setApplicants(appData || []);

      if (appData && appData.length > 0 && !selectedApplicantId) {
        setSelectedApplicantId(appData[0].id);
      }
    } catch (err) {
      toast.error('Failed to load party ledger summary');
    } finally {
      setLoading(false);
    }
  }, [selectedApplicantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = (applicantId = '', type = 'gave') => {
    setModalDefaultApplicantId(applicantId || selectedApplicantId || '');
    setModalDefaultType(type);
    setModalOpen(true);
  };

  // Get unique family tags
  const familyTags = Array.from(new Set(applicants.map(a => a.family).filter(Boolean)));

  // Combine applicant details with party summaries
  const partyList = (summary?.partySummaries || []).filter(item => {
    // Search query
    const matchSearch = 
      item.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.pan && item.pan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.upiId && item.upiId.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    let matchStatus = true;
    if (statusFilter === 'YOU_WILL_GET') matchStatus = item.status === 'you_will_get';
    else if (statusFilter === 'YOU_WILL_GIVE') matchStatus = item.status === 'you_will_give';
    else if (statusFilter === 'SETTLED') matchStatus = item.status === 'settled';

    // Family filter
    let matchFamily = true;
    if (familyFilter !== 'ALL') matchFamily = item.family === familyFilter;

    return matchSearch && matchStatus && matchFamily;
  });

  const selectedApplicantObj = applicants.find(a => a.id === selectedApplicantId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <BookOpen size={22} />
            </div>
            Khatabook Party Ledger
          </h1>
          <p className="text-xs text-secondary mt-1">
            Track money given & collected per applicant, settlement balances, and send WhatsApp reminders.
          </p>
        </div>

        <div className="mobile-action-bar w-full sm:w-auto">
          <button
            onClick={() => setIsSmartImportOpen(true)}
            className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-2.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 shrink-0"
            title="Smart Import Ledger Entries with Extra Column Detection"
          >
            <Sparkles size={13} className="text-indigo-400" />
            <span>Import</span>
          </button>
          <button
            onClick={loadData}
            className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-2.5 shrink-0"
            title="Refresh Ledger"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('', 'gave')}
            className="btn-primary bg-rose-600 hover:bg-rose-700 text-xs py-1.5 px-2.5 flex items-center gap-1 shrink-0"
          >
            <ArrowUpRight size={13} /> + You Gave
          </button>
          <button
            onClick={() => handleOpenAddModal('', 'got')}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-2.5 flex items-center gap-1 shrink-0"
          >
            <ArrowDownLeft size={13} /> + You Got
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-emerald-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total You Will Get</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                ₹{(summary?.totalYouWillGet || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-secondary mt-1">Money applicants owe to you</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft size={20} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-rose-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Total You Will Give</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                ₹{(summary?.totalYouWillGive || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-secondary mt-1">Money you owe to applicants</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-indigo-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Net Outstanding Balance</p>
              <h3 className={`text-2xl font-extrabold mt-1 ${
                (summary?.netOverallBalance || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ₹{Math.abs(summary?.netOverallBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-secondary mt-1">
                {(summary?.netOverallBalance || 0) >= 0 ? 'Overall Net Receivable' : 'Overall Net Payable'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Wallet size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Family Office Enterprise Settlement Tools */}
      <div className="space-y-4">
        <FamilyProfitSharingEngine />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PartySettlementPDF />
          <KostakDealTracker />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column: Applicant Party List */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-4 shadow-lg flex flex-col h-full min-h-0 space-y-3">
          {/* Search & Filters */}
          <div className="space-y-2 shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search applicant, PAN, UPI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-xs py-2"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {['ALL', 'YOU_WILL_GET', 'YOU_WILL_GIVE', 'SETTLED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-surface-2 border-border text-secondary hover:text-white'
                  }`}
                >
                  {st === 'ALL' && 'All Parties'}
                  {st === 'YOU_WILL_GET' && '🟢 You Will Get'}
                  {st === 'YOU_WILL_GIVE' && '🔴 You Will Give'}
                  {st === 'SETTLED' && '⚪ Settled'}
                </button>
              ))}
            </div>
          </div>

          {/* Parties List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {partyList.length === 0 ? (
              <div className="text-center text-xs text-secondary py-12">
                No matching parties found
              </div>
            ) : (
              partyList.map(party => {
                const isSelected = party.applicantId === selectedApplicantId;
                return (
                  <div
                    key={party.applicantId}
                    onClick={() => setSelectedApplicantId(party.applicantId)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-md'
                        : 'bg-surface-2 border-border/60 hover:border-border hover:bg-surface-2/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-black/30 border border-border text-secondary'
                      }`}>
                        {(party?.applicantName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {party.applicantName}
                          {party.family && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                              {party.family}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-secondary mt-0.5 truncate">
                          PAN: {party.pan || 'N/A'} • {party.entryCount} transactions
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xs font-extrabold ${
                        party.status === 'you_will_get' ? 'text-emerald-400' : party.status === 'you_will_give' ? 'text-rose-400' : 'text-secondary'
                      }`}>
                        {party.status === 'you_will_get' && `₹${party.netBalance.toLocaleString('en-IN')}`}
                        {party.status === 'you_will_give' && `₹${party.netBalance.toLocaleString('en-IN')}`}
                        {party.status === 'settled' && '₹0'}
                      </p>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-secondary mt-0.5">
                        {party.status === 'you_will_get' && 'You Will Get'}
                        {party.status === 'you_will_give' && 'You Will Give'}
                        {party.status === 'settled' && 'Settled'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Passbook Detail View */}
        <div className="lg:col-span-7 h-full min-h-0">
          <ApplicantLedgerDetail
            applicant={selectedApplicantObj}
            onOpenAddModal={handleOpenAddModal}
            onUpdate={loadData}
          />
        </div>
      </div>

      {/* Modal */}
      <PartyLedgerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
        defaultApplicantId={modalDefaultApplicantId}
        defaultType={modalDefaultType}
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        defaultTable="party_ledger"
        onSuccess={loadData}
      />
    </div>
  );
};

export default PartyLedger;
