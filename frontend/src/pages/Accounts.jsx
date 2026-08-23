import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Wallet, ArrowUpRight, ArrowDownLeft,
  Building2, CreditCard, Search, Filter, ChevronDown,
  IndianRupee, TrendingUp, TrendingDown, RefreshCw, Eye, EyeOff,
  Landmark, PiggyBank, Banknote, ArrowLeftRight
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import PageLoader from '../components/ui/PageLoader';

const BANK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const ACCOUNT_TYPES = ['Savings', 'Current', 'FD', 'RD', 'PPF', 'Other'];

const CATEGORY_LABELS = {
  OPENING_BALANCE: { label: 'Opening Balance', color: '#6366f1', icon: Landmark },
  IPO_BLOCKED: { label: 'IPO Blocked', color: '#f97316', icon: ArrowUpRight },
  IPO_REFUND: { label: 'IPO Refund', color: '#22c55e', icon: ArrowDownLeft },
  IPO_CANCELLED: { label: 'IPO Cancelled', color: '#14b8a6', icon: RefreshCw },
  MANUAL_CREDIT: { label: 'Credit', color: '#22c55e', icon: ArrowDownLeft },
  MANUAL_DEBIT: { label: 'Debit', color: '#f43f5e', icon: ArrowUpRight },
  TRANSFER: { label: 'Transfer', color: '#3b82f6', icon: ArrowLeftRight },
  INTEREST: { label: 'Interest', color: '#eab308', icon: TrendingUp },
  SALE_CREDIT: { label: 'Sale Credit', color: '#22c55e', icon: Banknote },
  EXPENSE: { label: 'Expense', color: '#ec4899', icon: ArrowUpRight },
  EXPENSE_REFUND: { label: 'Expense Refund', color: '#14b8a6', icon: ArrowDownLeft },
};

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// Account Card Component
const AccountCard = ({ account, isSelected, onClick, onEdit, onDelete }) => {
  const [showBalance, setShowBalance] = useState(true);
  const balance = parseFloat(account.balance) || 0;
  const maskedNumber = account.accountNumber
    ? '••••' + account.accountNumber.slice(-4)
    : '••••••••';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
        isSelected
          ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
          : 'border-[var(--border)] hover:border-white/10'
      }`}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${account.color}15, ${account.color}08)`
          : 'var(--surface-2)',
      }}
    >
      {/* Decorative accent */}
      <div
        className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${account.color}, ${account.color}80)` }}
      />

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${account.color}20`, color: account.color }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {account.accountName || account.name || 'Bank Account'}
            </h3>
            <p className="text-[11px] text-indigo-400 font-medium">
              {account.bankName || account.bank || 'Bank'}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(account); }}
            className="p-1.5 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
            className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">
              Available Balance
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
              className="p-0.5 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {showBalance ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
          <p className={`text-xl font-extrabold tracking-tight ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {showBalance ? formatCurrency(balance) : '₹••,•••.••'}
          </p>
        </div>
        <div className="text-right">
          <span
            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `${account.color}15`, color: account.color }}
          >
            {account.accountType || 'Savings'}
          </span>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{maskedNumber}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Transaction Row Component
const TransactionRow = ({ txn, showAccountName, onEdit, onDelete }) => {
  const catInfo = CATEGORY_LABELS[txn.category] || { label: txn.category, color: '#6b7280', icon: CreditCard };
  const CatIcon = catInfo.icon;
  const isCredit = txn.type === 'credit';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]/50 hover:bg-white/[0.02] transition-colors group relative"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${catInfo.color}15`, color: catInfo.color }}
      >
        <CatIcon size={16} />
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{txn.description || catInfo.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
            style={{ background: `${catInfo.color}15`, color: catInfo.color }}
          >
            {catInfo.label}
          </span>
          {showAccountName && txn.accountName && (
            <span className="text-[10px] text-[var(--text-muted)]">{txn.accountName}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
          Bal: {formatCurrency(txn.runningBalance)}
        </p>
      </div>

      {/* Date & Actions */}
      <div className="text-right shrink-0 flex items-center gap-2">
        <div className="hidden sm:block w-20">
          <p className="text-[11px] text-[var(--text-muted)]">{formatDate(txn.date || txn.createdAt)}</p>
          <p className="text-[9px] text-[var(--text-muted)]">{formatTime(txn.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(txn)}
            className="p-1.5 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
            title="Edit Transaction"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(txn.id)}
            className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Delete Transaction"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [txnToDelete, setTxnToDelete] = useState(null);

  // Forms
  const [accountForm, setAccountForm] = useState({
    accountName: '', bankName: '', accountNumber: '', ifscCode: '',
    accountType: 'Savings', balance: '', color: '#6366f1'
  });
  const [txnForm, setTxnForm] = useState({
    bankAccountId: '', type: 'credit', category: '', amount: '', description: ''
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [accts, txns] = await Promise.all([
        api.getBankAccounts(),
        api.getTransactions(selectedAccountId || undefined)
      ]);
      const sanitizedAccts = (accts || []).map((r, i) => {
        const rawAcc = (r.accountName || r.name || '').trim();
        const rawBank = (r.bankName || r.bank || '').trim();
        const isGenericAcc = !rawAcc || rawAcc === 'Bank Account' || rawAcc.startsWith('Bank Account #');
        const isGenericBank = !rawBank || rawBank === 'Bank';
        return {
          ...r,
          accountName: !isGenericAcc ? rawAcc : (!isGenericBank ? `${rawBank} Account` : (r.accountNumber ? `Savings A/C (${r.accountNumber.slice(-4)})` : (i === 0 ? 'Primary Bank Account' : `Secondary Bank Account`))),
          bankName: !isGenericBank ? rawBank : (i === 0 ? 'Primary Bank' : 'Secondary Bank')
        };
      });
      setAccounts(sanitizedAccts);
      setTransactions(txns);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const txns = await api.getTransactions(selectedAccountId || undefined, categoryFilter || undefined);
      setTransactions(txns);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadTransactions(); }, [selectedAccountId, categoryFilter]);

  // Stats
  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0), [accounts]);
  const totalCredits = useMemo(() => transactions.filter(t => t.type === 'credit').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [transactions]);
  const totalDebits = useMemo(() => transactions.filter(t => t.type === 'debit').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.accountName || '').toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  // Handlers
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.updateBankAccount(editingAccount.id, accountForm);
        toast.success('Account updated!');
      } else {
        await api.addBankAccount(accountForm);
        toast.success('Account created!');
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await api.deleteBankAccount(accountToDelete);
      toast.success('Account deleted!');
      if (selectedAccountId === accountToDelete) setSelectedAccountId(null);
      setAccountToDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, txnForm);
        toast.success('Transaction updated!');
      } else {
        await api.addTransaction(txnForm);
        toast.success('Transaction recorded!');
      }
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!txnToDelete) return;
    try {
      await api.deleteTransaction(txnToDelete);
      toast.success('Transaction deleted!');
      setTxnToDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      accountName: '', bankName: '', accountNumber: '', ifscCode: '',
      accountType: 'Savings', balance: '', color: BANK_COLORS[accounts.length % BANK_COLORS.length]
    });
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (account) => {
    setEditingAccount(account);
    setAccountForm({
      accountName: account.accountName || account.name || '',
      bankName: account.bankName || account.bank || '',
      accountNumber: account.accountNumber || '',
      ifscCode: account.ifscCode || '',
      accountType: account.accountType || 'Savings',
      balance: account.balance !== undefined && account.balance !== null ? String(account.balance) : '',
      color: account.color || '#6366f1'
    });
    setIsAccountModalOpen(true);
  };

  const openAddTransaction = () => {
    setEditingTransaction(null);
    setTxnForm({
      bankAccountId: selectedAccountId || (accounts.length > 0 ? accounts[0].id : ''),
      type: 'credit',
      category: '',
      amount: '',
      description: ''
    });
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (txn) => {
    setEditingTransaction(txn);
    setTxnForm({
      bankAccountId: txn.bankAccountId || '',
      type: txn.type || 'credit',
      category: txn.category || '',
      amount: txn.amount || '',
      description: txn.description || ''
    });
    setIsTransactionModalOpen(true);
  };

  if (loading) return <PageLoader text="Loading accounts..." />;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet size={22} className="text-indigo-400" />
            Accounts & Passbook
          </h1>
          <p className="page-subtitle">Manage bank accounts, track balances & view transaction history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button onClick={openAddTransaction} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3 flex-1 sm:flex-initial justify-center">
            <ArrowLeftRight size={14} className="text-emerald-400" /> New Transaction
          </button>
          <button onClick={openAddAccount} className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3 flex-1 sm:flex-initial justify-center">
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3.5 sm:p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
            <PiggyBank size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold truncate">Total Balance</p>
            <p className="text-base sm:text-lg font-extrabold text-white truncate">{formatCurrency(totalBalance)}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-3.5 sm:p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold truncate">Total Credits</p>
            <p className="text-base sm:text-lg font-extrabold text-emerald-400 truncate">+{formatCurrency(totalCredits)}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-3.5 sm:p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold truncate">Total Debits</p>
            <p className="text-base sm:text-lg font-extrabold text-rose-400 truncate">-{formatCurrency(totalDebits)}</p>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left: Account Cards */}
        <div className="lg:w-[380px] shrink-0 space-y-3">
          {/* All Accounts Tab */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedAccountId(null)}
            className={`rounded-xl p-3 cursor-pointer border transition-all flex items-center gap-3 ${
              !selectedAccountId
                ? 'border-indigo-500/40 bg-indigo-500/[0.06]'
                : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Wallet size={16} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">All Accounts</p>
              <p className="text-[10px] text-[var(--text-muted)]">{accounts.length} accounts</p>
            </div>
            <p className="text-sm font-bold text-white font-mono">{formatCurrency(totalBalance)}</p>
          </motion.div>

          {/* Individual Account Cards */}
          <div className="space-y-3 lg:max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar pr-1">
            <AnimatePresence>
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelected={selectedAccountId === account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  onEdit={openEditAccount}
                  onDelete={(id) => setAccountToDelete(id)}
                />
              ))}
            </AnimatePresence>

            {accounts.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 text-indigo-400">
                  <Building2 size={28} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No bank accounts yet</p>
                <p className="text-xs text-[var(--text-muted)] mb-4">Add your first bank account to start tracking</p>
                <button onClick={openAddAccount} className="btn-primary text-sm">
                  <Plus size={14} className="inline mr-1" /> Add Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Transaction Passbook */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden min-h-0">
          {/* Passbook Header */}
          <div className="p-4 border-b border-[var(--border)] shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Banknote size={18} className="text-indigo-400" />
                  Transaction Passbook
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  {selectedAccountId ? ` • ${accounts.find(a => a.id === selectedAccountId)?.accountName || ''}` : ' • All Accounts'}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 text-xs w-full sm:w-48"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field text-xs appearance-none pr-7"
                >
                  <option value="">All Types</option>
                  <option value="OPENING_BALANCE">Opening Balance</option>
                  <option value="IPO_BLOCKED">IPO Blocked</option>
                  <option value="IPO_REFUND">IPO Refund</option>
                  <option value="IPO_CANCELLED">IPO Cancelled</option>
                  <option value="MANUAL_CREDIT">Manual Credit</option>
                  <option value="MANUAL_DEBIT">Manual Debit</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="INTEREST">Interest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
                  <Banknote size={24} className="text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No transactions found</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {accounts.length === 0 ? 'Add an account first, then record transactions' : 'Apply for an IPO or add a manual transaction'}
                </p>
              </div>
            ) : (
              filteredTransactions.map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  showAccountName={!selectedAccountId}
                  onEdit={openEditTransaction}
                  onDelete={(id) => setTxnToDelete(id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Account Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
      >
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Account Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={accountForm.accountName}
                onChange={(e) => setAccountForm({...accountForm, accountName: e.target.value})}
                className="input-field"
                placeholder="e.g. SBI Main Savings"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={accountForm.bankName}
                onChange={(e) => setAccountForm({...accountForm, bankName: e.target.value})}
                className="input-field"
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Account Type
              </label>
              <select
                value={accountForm.accountType}
                onChange={(e) => setAccountForm({...accountForm, accountType: e.target.value})}
                className="input-field"
              >
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Account Number
              </label>
              <input
                value={accountForm.accountNumber}
                onChange={(e) => setAccountForm({...accountForm, accountNumber: e.target.value})}
                className="input-field font-mono"
                placeholder="Account Number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                IFSC Code
              </label>
              <input
                value={accountForm.ifscCode}
                onChange={(e) => setAccountForm({...accountForm, ifscCode: e.target.value.toUpperCase()})}
                className="input-field uppercase font-mono"
                placeholder="e.g. SBIN0001234"
              />
            </div>
            {!editingAccount && (
              <div>
                <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.balance}
                  onChange={(e) => setAccountForm({...accountForm, balance: e.target.value})}
                  className="input-field font-mono"
                  placeholder="0.00"
                />
              </div>
            )}
            <div className={editingAccount ? '' : ''}>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Card Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {BANK_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccountForm({...accountForm, color: c})}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${
                      accountForm.color === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isTransactionModalOpen}
        onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Bank Account <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={txnForm.bankAccountId}
                onChange={(e) => setTxnForm({...txnForm, bankAccountId: e.target.value})}
                className="input-field"
              >
                <option value="">Select Account</option>
                {accounts.map((a, idx) => {
                  const rawName = a.accountName || a.name;
                  const bankN = a.bankName || a.bank || '';
                  const accountTitle = (rawName && rawName.trim() !== '' && rawName !== 'Bank Account')
                    ? rawName
                    : (bankN ? `${bankN} Account` : (a.accountNumber ? `A/C ••••${a.accountNumber.slice(-4)}` : `Bank Account #${idx + 1}`));

                  const bankSub = (bankN && bankN !== accountTitle) ? bankN : (a.accountType || '');
                  const maskedAcc = a.accountNumber ? `••••${a.accountNumber.slice(-4)}` : '';
                  
                  let detailParts = [];
                  if (bankSub) detailParts.push(bankSub);
                  if (maskedAcc) detailParts.push(maskedAcc);
                  const detailStr = detailParts.length > 0 ? ` (${detailParts.join(' • ')})` : '';

                  return (
                    <option key={a.id} value={a.id}>
                      {accountTitle}{detailStr} — {formatCurrency(a.balance)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Transaction Type <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxnForm({...txnForm, type: 'credit', category: 'MANUAL_CREDIT'})}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    txnForm.type === 'credit'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-white/10'
                  }`}
                >
                  <ArrowDownLeft size={14} className="inline mr-1" /> Credit
                </button>
                <button
                  type="button"
                  onClick={() => setTxnForm({...txnForm, type: 'debit', category: 'MANUAL_DEBIT'})}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    txnForm.type === 'debit'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-white/10'
                  }`}
                >
                  <ArrowUpRight size={14} className="inline mr-1" /> Debit
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={txnForm.category}
                onChange={(e) => setTxnForm({...txnForm, category: e.target.value})}
                className="input-field"
              >
                <option value="">Auto ({txnForm.type === 'credit' ? 'Manual Credit' : 'Manual Debit'})</option>
                <option value="TRANSFER">Transfer</option>
                <option value="INTEREST">Interest</option>
                <option value="MANUAL_CREDIT">Manual Credit</option>
                <option value="MANUAL_DEBIT">Manual Debit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={txnForm.amount}
                onChange={(e) => setTxnForm({...txnForm, amount: e.target.value})}
                className="input-field font-mono"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Description
              </label>
              <input
                value={txnForm.description}
                onChange={(e) => setTxnForm({...txnForm, description: e.target.value})}
                className="input-field"
                placeholder="e.g. Salary credit, EMI payment"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTransaction ? 'Update Transaction' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirmation */}
      <ConfirmModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDeleteAccount}
        title="Delete Bank Account"
        message="Are you sure you want to delete this bank account? All associated transactions will also be deleted. This action cannot be undone."
        confirmText="Delete Account"
      />

      {/* Delete Transaction Confirmation */}
      <ConfirmModal
        isOpen={!!txnToDelete}
        onClose={() => setTxnToDelete(null)}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? The bank account balance will be automatically adjusted. This action cannot be undone."
        confirmText="Delete Transaction"
      />
    </div>
  );
};

export default Accounts;
