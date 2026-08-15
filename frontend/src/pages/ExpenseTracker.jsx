import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Search, Filter, ChevronDown, ChevronLeft, ChevronRight,
  IndianRupee, TrendingUp, TrendingDown, Receipt, Calendar,
  UtensilsCrossed, Car, ShoppingBag, Zap, Heart, Film, GraduationCap,
  Home, MoreHorizontal, CreditCard, Smartphone, Banknote, Wallet2,
  Target, PieChart, ArrowUpRight, BarChart3, Sparkles, X, Building2, Clock,
  FileText, Scan, Upload, Loader2
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import SmartImportModal from '../components/ui/SmartImportModal';
import toast from 'react-hot-toast';
import PageLoader from '../components/ui/PageLoader';

// Category system
const EXPENSE_CATEGORIES = [
  { key: 'Food', label: 'Food & Dining', icon: UtensilsCrossed, color: '#f97316', gradient: 'from-orange-500 to-amber-500' },
  { key: 'Transport', label: 'Transport', icon: Car, color: '#3b82f6', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
  { key: 'Bills', label: 'Bills & Utilities', icon: Zap, color: '#eab308', gradient: 'from-yellow-500 to-amber-400' },
  { key: 'Health', label: 'Health', icon: Heart, color: '#ef4444', gradient: 'from-red-500 to-rose-500' },
  { key: 'Entertainment', label: 'Entertainment', icon: Film, color: '#8b5cf6', gradient: 'from-violet-500 to-purple-500' },
  { key: 'Education', label: 'Education', icon: GraduationCap, color: '#06b6d4', gradient: 'from-cyan-500 to-teal-500' },
  { key: 'Rent', label: 'Rent & Housing', icon: Home, color: '#14b8a6', gradient: 'from-teal-500 to-emerald-500' },
  { key: 'Investments', label: 'Investments', icon: TrendingUp, color: '#6366f1', gradient: 'from-indigo-500 to-violet-500' },
  { key: 'Other', label: 'Other', icon: MoreHorizontal, color: '#6b7280', gradient: 'from-gray-500 to-zinc-500' },
];

const PAYMENT_MODES = [
  { key: 'UPI', label: 'UPI', icon: Smartphone },
  { key: 'Cash', label: 'Cash', icon: Banknote },
  { key: 'Card', label: 'Card', icon: CreditCard },
  { key: 'Net Banking', label: 'Net Banking', icon: Building2 },
  { key: 'Wallet', label: 'Wallet', icon: Wallet2 },
];

const getCategoryInfo = (key) => EXPENSE_CATEGORIES.find(c => c.key === key) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrencyShort = (val) => {
  const num = parseFloat(val) || 0;
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num.toFixed(0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getMonthName = (month) => {
  return new Date(2024, month - 1).toLocaleString('en-IN', { month: 'long' });
};

// Date range presets
const getDatePresets = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    { label: 'Today', startDate: today, endDate: today },
    { label: 'This Week', startDate: startOfWeek.toISOString().split('T')[0], endDate: today },
    { label: 'This Month', startDate: startOfMonth.toISOString().split('T')[0], endDate: today },
    { label: 'Last Month', startDate: startOfLastMonth.toISOString().split('T')[0], endDate: endOfLastMonth.toISOString().split('T')[0] },
    { label: 'All Time', startDate: '', endDate: '' },
  ];
};

// Mini Donut Chart using SVG
const DonutChart = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-center">
          <PieChart size={32} className="text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-[10px] text-[var(--text-muted)]">No data yet</p>
        </div>
      </div>
    );
  }

  const radius = (size - 20) / 2;
  const innerRadius = radius * 0.62;
  const cx = size / 2;
  const cy = size / 2;
  let cumulativeAngle = -90;

  const arcs = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const ix1 = cx + innerRadius * Math.cos(endRad);
    const iy1 = cy + innerRadius * Math.sin(endRad);
    const ix2 = cx + innerRadius * Math.cos(startRad);
    const iy2 = cy + innerRadius * Math.sin(startRad);

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    return (
      <motion.path
        key={i}
        d={path}
        fill={d.color}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.08, duration: 0.4 }}
        className="hover:opacity-80 transition-opacity cursor-pointer"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <title>{d.label}: {formatCurrency(d.value)} ({((d.value / total) * 100).toFixed(1)}%)</title>
      </motion.path>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-[15px] font-extrabold">
        {formatCurrencyShort(total)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-widest">
        Total
      </text>
    </svg>
  );
};

// Budget Progress Bar
const BudgetBar = ({ category, spent, limit, onEdit }) => {
  const catInfo = getCategoryInfo(category);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isOver = spent > limit && limit > 0;
  const CatIcon = catInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${catInfo.color}15`, color: catInfo.color }}
      >
        <CatIcon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white truncate">{catInfo.label}</span>
          <span className={`text-[10px] font-bold font-mono ${isOver ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
            {formatCurrencyShort(spent)} / {formatCurrencyShort(limit)}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: isOver
                ? 'linear-gradient(90deg, #ef4444, #f43f5e)'
                : pct > 80
                ? 'linear-gradient(90deg, #eab308, #f97316)'
                : `linear-gradient(90deg, ${catInfo.color}, ${catInfo.color}cc)`,
            }}
          />
        </div>
      </div>
      <button
        onClick={() => onEdit(category, limit)}
        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-indigo-400 transition-all"
      >
        <Edit2 size={11} />
      </button>
    </motion.div>
  );
};

// Expense Row
const ExpenseRow = ({ expense, onEdit, onDelete }) => {
  const catInfo = getCategoryInfo(expense.category);
  const CatIcon = catInfo.icon;
  const paymentIcon = PAYMENT_MODES.find(p => p.key === expense.paymentMode)?.icon || CreditCard;
  const PayIcon = paymentIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]/40 hover:bg-white/[0.02] transition-colors group"
    >
      {/* Category Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${catInfo.color}12`, color: catInfo.color }}
      >
        <CatIcon size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">{expense.description || catInfo.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
            style={{ background: `${catInfo.color}12`, color: catInfo.color }}
          >
            {catInfo.label}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
            <PayIcon size={10} /> {expense.paymentMode}
          </span>
          {expense.accountName && (
            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[100px]">
              • {expense.accountName}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold font-mono text-rose-400">-{formatCurrency(expense.amount)}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatDate(expense.date)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(expense)}
          className="p-1.5 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
};


const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPreset, setSelectedPreset] = useState('This Month');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    bankAccountId: '', amount: '', category: 'Food', subcategory: '',
    description: '', paymentMode: 'UPI', date: new Date().toISOString().split('T')[0],
    isRecurring: false, receipt: ''
  });
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', monthlyLimit: '' });

  // Receipt Scan & PDF Statement
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleScanReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      toast.loading('Scanning receipt image/PDF...', { id: 'scan-receipt' });
      const parsed = await api.parseReceiptFile(file);
      
      setExpenseForm(prev => ({
        ...prev,
        amount: parsed.amount || prev.amount,
        date: parsed.date || prev.date,
        category: parsed.category || prev.category,
        description: parsed.description || prev.description,
        receipt: file.name
      }));

      toast.success(`Receipt scanned! Amount: ₹${parsed.amount || '0'} (${parsed.category})`, { id: 'scan-receipt' });
      if (!isExpenseModalOpen) {
        setIsExpenseModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse receipt: ' + err.message, { id: 'scan-receipt' });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadMonthlyDigestPdf = () => {
    const url = api.getMonthlyDigestPdfUrl(selectedMonth, selectedYear);
    window.open(url, '_blank');
  };

  const datePresets = useMemo(() => getDatePresets(), []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const preset = datePresets.find(p => p.label === selectedPreset);
      const filters = {};
      if (preset && preset.startDate) {
        filters.startDate = preset.startDate;
        filters.endDate = preset.endDate;
      }
      if (categoryFilter) filters.category = categoryFilter;

      const [expenseData, summaryData, accountsData] = await Promise.all([
        api.getExpenses(filters),
        api.getExpenseSummary(selectedMonth, selectedYear),
        api.getBankAccounts()
      ]);
      setExpenses(expenseData);
      setSummary(summaryData);
      setAccounts(accountsData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [selectedPreset, categoryFilter, selectedMonth, selectedYear]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(e =>
      (e.description || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.accountName || '').toLowerCase().includes(q) ||
      (e.paymentMode || '').toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  // Chart data
  const chartData = useMemo(() => {
    if (!summary?.categories) return [];
    return summary.categories.map(c => ({
      label: getCategoryInfo(c.category).label,
      value: c.total,
      color: getCategoryInfo(c.category).color
    }));
  }, [summary]);

  // Handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, expenseForm);
        toast.success('Expense updated!');
      } else {
        await api.addExpense(expenseForm);
        toast.success('Expense recorded!');
      }
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      const result = await api.deleteExpense(expenseToDelete);
      toast.success(result.bankRefunded ? 'Expense deleted & bank refunded!' : 'Expense deleted!');
      setExpenseToDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.setBudget(budgetForm.category, budgetForm.monthlyLimit);
      toast.success('Budget updated!');
      setIsBudgetModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      bankAccountId: '', amount: '', category: 'Food', subcategory: '',
      description: '', paymentMode: 'UPI', date: new Date().toISOString().split('T')[0],
      isRecurring: false, receipt: ''
    });
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      bankAccountId: expense.bankAccountId || '',
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || '',
      description: expense.description || '',
      paymentMode: expense.paymentMode || 'UPI',
      date: expense.date || '',
      isRecurring: !!expense.isRecurring,
      receipt: expense.receipt || ''
    });
    setIsExpenseModalOpen(true);
  };

  const openBudgetEditor = (category, currentLimit) => {
    setBudgetForm({ category, monthlyLimit: currentLimit || '' });
    setIsBudgetModalOpen(true);
  };

  const navigateMonth = (dir) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  if (loading) return <PageLoader text="Loading expenses..." />;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Receipt size={22} className="text-indigo-400" />
            Expense Tracker
          </h1>
          <p className="page-subtitle">Track daily expenses, manage budgets & analyze spending patterns</p>
        </div>
        <div className="mobile-action-bar w-full sm:w-auto">
          {/* Hidden File Input for Receipt OCR */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleScanReceipt}
            accept="image/*,.pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-2.5 shrink-0"
            title="Upload receipt image or PDF to auto-extract date, category & amount"
          >
            {isScanning ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <Scan size={13} className="text-cyan-400" />}
            <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
          </button>
          <button onClick={() => setIsSmartImportOpen(true)} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-2.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 shrink-0" title="Smart Import Expenses with Extra Column Detection">
            <Sparkles size={13} className="text-indigo-400" /> Import
          </button>
          <button onClick={downloadMonthlyDigestPdf} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-2.5 shrink-0" title="Generate printable Monthly Statement PDF report">
            <FileText size={13} className="text-emerald-400" /> PDF Report
          </button>
          <button onClick={() => setIsBudgetModalOpen(true)} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-2.5 shrink-0">
            <Target size={13} className="text-amber-400" /> Budget
          </button>
          <button onClick={openAddExpense} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 shrink-0">
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* Month Selector + Date Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Month Navigator */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] px-2 py-1.5">
          <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-white">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-white min-w-[120px] text-center">
            {getMonthName(selectedMonth)} {selectedYear}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-white">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {datePresets.map(p => (
            <button
              key={p.label}
              onClick={() => setSelectedPreset(p.label)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                selectedPreset === p.label
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-white/10 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Spent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Total Spent</p>
              <p className="text-lg font-extrabold text-white">{formatCurrency(summary?.grandTotal || 0)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{summary?.totalCount || 0} transactions</p>
            </div>
          </div>
        </motion.div>

        {/* Highest Category */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Top Category</p>
              <p className="text-lg font-extrabold text-white">
                {summary?.highestCategory ? getCategoryInfo(summary.highestCategory.category).label : '—'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {summary?.highestCategory ? formatCurrency(summary.highestCategory.total) : 'No data'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Daily Average */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Daily Average</p>
              <p className="text-lg font-extrabold text-white">{formatCurrency(summary?.dailyAverage || 0)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">/day this month</p>
            </div>
          </div>
        </motion.div>

        {/* Budget Health */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              summary?.budgetHealthPct && parseFloat(summary.budgetHealthPct) < 20
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Budget Health</p>
              <p className={`text-lg font-extrabold ${
                !summary?.budgetHealthPct ? 'text-[var(--text-muted)]'
                  : parseFloat(summary.budgetHealthPct) < 20 ? 'text-rose-400'
                  : parseFloat(summary.budgetHealthPct) < 50 ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {summary?.budgetHealthPct ? `${summary.budgetHealthPct}%` : 'No budget'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {summary?.totalBudget ? `of ${formatCurrencyShort(summary.totalBudget)} remaining` : 'Set a budget to track'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content: Chart + Budgets | Expense List */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

        {/* Left Panel: Donut Chart + Budget Progress */}
        <div className="lg:w-[340px] shrink-0 space-y-4">
          {/* Category Donut Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <PieChart size={15} className="text-indigo-400" />
              Category Breakdown
            </h3>
            <div className="flex justify-center mb-4">
              <DonutChart data={chartData} size={170} />
            </div>
            {/* Legend */}
            <div className="space-y-2">
              {(summary?.categories || []).slice(0, 6).map((c, i) => {
                const catInfo = getCategoryInfo(c.category);
                const CatIcon = catInfo.icon;
                const pct = summary?.grandTotal > 0 ? ((c.total / summary.grandTotal) * 100).toFixed(1) : 0;
                return (
                  <motion.div
                    key={c.category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5 text-[11px]"
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: catInfo.color }} />
                    <CatIcon size={12} style={{ color: catInfo.color }} className="shrink-0" />
                    <span className="flex-1 text-[var(--text-secondary)] truncate">{catInfo.label}</span>
                    <span className="font-bold text-white font-mono">{formatCurrencyShort(c.total)}</span>
                    <span className="text-[var(--text-muted)] w-10 text-right">{pct}%</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Budget Progress */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target size={15} className="text-amber-400" />
                Monthly Budgets
              </h3>
              <button
                onClick={() => {
                  setBudgetForm({ category: 'Food', monthlyLimit: '' });
                  setIsBudgetModalOpen(true);
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-3.5">
              {summary?.budgets && summary.budgets.length > 0 ? (
                summary.budgets.map(b => {
                  const spent = summary.categories?.find(c => c.category === b.category)?.total || 0;
                  return (
                    <BudgetBar
                      key={b.id}
                      category={b.category}
                      spent={spent}
                      limit={parseFloat(b.monthlyLimit) || 0}
                      onEdit={openBudgetEditor}
                    />
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <Target size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[11px] text-[var(--text-muted)]">No budgets set yet</p>
                  <button
                    onClick={() => {
                      setBudgetForm({ category: 'Food', monthlyLimit: '' });
                      setIsBudgetModalOpen(true);
                    }}
                    className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    Set your first budget →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Panel: Expense List */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden min-h-0">
          {/* List Header */}
          <div className="p-4 border-b border-[var(--border)] shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt size={18} className="text-indigo-400" />
                  Expense Log
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                  {categoryFilter && ` • ${getCategoryInfo(categoryFilter).label}`}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 text-xs w-full sm:w-48"
                    id="expense-search"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field text-xs appearance-none pr-7"
                  id="expense-category-filter"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expense List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
                    <Receipt size={28} />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">No expenses found</p>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    {expenses.length === 0
                      ? 'Start tracking your spending by adding your first expense'
                      : 'Try adjusting your search or filters'
                    }
                  </p>
                  {expenses.length === 0 && (
                    <button onClick={openAddExpense} className="btn-primary text-sm">
                      <Plus size={14} className="inline mr-1" /> Add Expense
                    </button>
                  )}
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={openEditExpense}
                    onDelete={(id) => setExpenseToDelete(id)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          {/* Quick OCR Scan Dropzone */}
          {!editingExpense && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2 group"
            >
              {isScanning ? (
                <Loader2 size={16} className="animate-spin text-indigo-400" />
              ) : (
                <Scan size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs font-semibold text-indigo-300">
                {isScanning ? 'Parsing receipt data...' : 'Auto-fill by uploading Receipt image or PDF'}
              </span>
            </div>
          )}

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2">
              Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                const isSelected = expenseForm.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setExpenseForm({ ...expenseForm, category: cat.key })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-white/20 bg-white/5 scale-105'
                        : 'border-transparent hover:border-[var(--border)] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isSelected ? 'scale-110' : ''
                      }`}
                      style={{ background: `${cat.color}${isSelected ? '25' : '10'}`, color: cat.color }}
                    >
                      <CatIcon size={16} />
                    </div>
                    <span className={`text-[9px] font-semibold truncate max-w-full ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                      {cat.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="input-field font-mono"
                placeholder="Enter amount"
                id="expense-amount"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="input-field"
                id="expense-date"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Description
              </label>
              <input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="input-field"
                placeholder="e.g. Lunch at restaurant, Uber ride"
                id="expense-description"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Payment Mode
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {PAYMENT_MODES.map(pm => {
                  const PMIcon = pm.icon;
                  const isSelected = expenseForm.paymentMode === pm.key;
                  return (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setExpenseForm({ ...expenseForm, paymentMode: pm.key })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-white/10'
                      }`}
                    >
                      <PMIcon size={12} /> {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bank Account (optional) */}
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Link Bank Account
                <span className="text-[var(--text-muted)] normal-case tracking-normal"> (optional)</span>
              </label>
              <select
                value={expenseForm.bankAccountId}
                onChange={(e) => setExpenseForm({ ...expenseForm, bankAccountId: e.target.value })}
                className="input-field"
                id="expense-bank-account"
              >
                <option value="">No bank linked</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} ({a.bankName}) — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
              {expenseForm.bankAccountId && !editingExpense && (
                <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                  <Sparkles size={10} /> Bank balance will be auto-debited
                </p>
              )}
            </div>

            {/* Receipt / Notes */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                Receipt / Notes
              </label>
              <input
                value={expenseForm.receipt}
                onChange={(e) => setExpenseForm({ ...expenseForm, receipt: e.target.value })}
                className="input-field"
                placeholder="Bill no, invoice ref, or any note"
                id="expense-receipt"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingExpense ? 'Update Expense' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Budget Modal */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Set Monthly Budget"
      >
        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                const isSelected = budgetForm.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, category: cat.key })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-white/20 bg-white/5 scale-105'
                        : 'border-transparent hover:border-[var(--border)] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${cat.color}${isSelected ? '25' : '10'}`, color: cat.color }}
                    >
                      <CatIcon size={16} />
                    </div>
                    <span className={`text-[9px] font-semibold truncate max-w-full ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                      {cat.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">
              Monthly Limit (₹)
            </label>
            <input
              required
              type="number"
              step="100"
              min="0"
              value={budgetForm.monthlyLimit}
              onChange={(e) => setBudgetForm({ ...budgetForm, monthlyLimit: e.target.value })}
              className="input-field font-mono"
              placeholder="e.g. 5000"
              id="budget-limit"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Budget
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? If it was linked to a bank account, the balance will be refunded. This action cannot be undone."
        confirmText="Delete Expense"
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        defaultTable="expenses"
        onSuccess={loadAll}
      />
    </div>
  );
};

export default ExpenseTracker;
