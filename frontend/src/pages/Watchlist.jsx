import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { Eye, EyeOff, Bell, BellOff, Plus, Trash2, TrendingUp, Calendar, RefreshCw, Search, X, AlertTriangle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [editAlertId, setEditAlertId] = useState(null);

  // Add form state
  const [form, setForm] = useState({
    ipoName: '', priceBand: '', openDate: '', closeDate: '', listingDate: '',
    alertGmpAbove: '', alertGmpBelow: '', alertOnAllotment: false, alertOnListing: false
  });

  const load = useCallback(async () => {
    try {
      const data = await api.getWatchlist();
      setWatchlist(data);
    } catch (err) {
      console.error('Failed to load watchlist', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ipoName.trim()) return toast.error('IPO name is required');
    try {
      await api.addToWatchlist({
        ...form,
        alertGmpAbove: form.alertGmpAbove ? parseFloat(form.alertGmpAbove) : null,
        alertGmpBelow: form.alertGmpBelow ? parseFloat(form.alertGmpBelow) : null,
      });
      toast.success(`${form.ipoName} added to watchlist`);
      setShowAddModal(false);
      setForm({ ipoName: '', priceBand: '', openDate: '', closeDate: '', listingDate: '', alertGmpAbove: '', alertGmpBelow: '', alertOnAllotment: false, alertOnListing: false });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.removeFromWatchlist(deleteTarget);
      toast.success('Removed from watchlist');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const handleToggleAlert = async (item, field) => {
    try {
      await api.updateWatchlistAlert(item.id, { ...item, [field]: !item[field] });
      toast.success('Alert updated');
      load();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const handleSaveAlertConfig = async (item) => {
    try {
      await api.updateWatchlistAlert(item.id, item);
      toast.success('Alert thresholds saved');
      setEditAlertId(null);
      load();
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const filtered = watchlist.filter(w =>
    w.ipoName?.toLowerCase().includes(search.toLowerCase())
  );

  const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) return 'Past';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="shimmer h-7 w-48 rounded-lg" />
            <div className="shimmer h-4 w-64 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">IPO Watchlist 👁️</h1>
          <p className="page-subtitle">Track upcoming IPOs and set GMP alerts · {watchlist.length} IPO{watchlist.length !== 1 ? 's' : ''} watched</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add IPO
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search watchlist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Watchlist Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
          <Eye size={48} className="mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {watchlist.length === 0 ? 'Your watchlist is empty' : 'No matching IPOs'}
          </h3>
          <p className="text-sm text-secondary mb-6">
            {watchlist.length === 0 ? 'Start tracking upcoming IPOs by adding them to your watchlist' : 'Try a different search term'}
          </p>
          {watchlist.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> Add Your First IPO
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card glass-card-hover p-5 relative overflow-hidden group"
              >
                {/* Glow */}
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)', filter: 'blur(16px)' }}
                />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-[0.9375rem] truncate leading-tight">{item.ipoName}</h3>
                      {item.priceBand && (
                        <div className="text-xs text-secondary mt-1">Price Band: {item.priceBand}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {item.openDate && (
                      <div className="bg-surface/50 border border-border/50 rounded-lg px-2.5 py-1.5">
                        <div className="section-label text-[0.6rem]">Open Date</div>
                        <div className="text-xs font-semibold text-white">{new Date(item.openDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        {getCountdown(item.openDate) && (
                          <div className={`text-[10px] font-bold mt-0.5 ${getCountdown(item.openDate) === 'Past' ? 'text-zinc-500' : getCountdown(item.openDate) === 'Today' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {getCountdown(item.openDate)}
                          </div>
                        )}
                      </div>
                    )}
                    {item.closeDate && (
                      <div className="bg-surface/50 border border-border/50 rounded-lg px-2.5 py-1.5">
                        <div className="section-label text-[0.6rem]">Close Date</div>
                        <div className="text-xs font-semibold text-white">{new Date(item.closeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        {getCountdown(item.closeDate) && (
                          <div className={`text-[10px] font-bold mt-0.5 ${getCountdown(item.closeDate) === 'Past' ? 'text-zinc-500' : getCountdown(item.closeDate) === 'Today' ? 'text-rose-400' : 'text-amber-400'}`}>
                            {getCountdown(item.closeDate)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Listing Date */}
                  {item.listingDate && (
                    <div className="flex items-center gap-1.5 text-xs text-secondary mb-3">
                      <Calendar size={12} />
                      <span>Listing: {new Date(item.listingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}

                  {/* Alert Toggles */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      onClick={() => handleToggleAlert(item, 'alertOnAllotment')}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        item.alertOnAllotment
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-surface/50 border-border text-secondary hover:text-white'
                      }`}
                    >
                      {item.alertOnAllotment ? <Bell size={10} /> : <BellOff size={10} />}
                      Allotment
                    </button>
                    <button
                      onClick={() => handleToggleAlert(item, 'alertOnListing')}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        item.alertOnListing
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          : 'bg-surface/50 border-border text-secondary hover:text-white'
                      }`}
                    >
                      {item.alertOnListing ? <Bell size={10} /> : <BellOff size={10} />}
                      Listing
                    </button>
                  </div>

                  {/* GMP Alert Thresholds */}
                  {editAlertId === item.id ? (
                    <div className="space-y-2 bg-surface/50 border border-border/50 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">GMP Alert Thresholds</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-secondary">Alert Above ₹</label>
                          <input
                            type="number"
                            value={item.alertGmpAbove || ''}
                            onChange={e => {
                              const updated = { ...item, alertGmpAbove: e.target.value ? parseFloat(e.target.value) : null };
                              setWatchlist(prev => prev.map(w => w.id === item.id ? updated : w));
                            }}
                            className="w-full bg-black/30 border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                            placeholder="e.g. 100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-secondary">Alert Below ₹</label>
                          <input
                            type="number"
                            value={item.alertGmpBelow || ''}
                            onChange={e => {
                              const updated = { ...item, alertGmpBelow: e.target.value ? parseFloat(e.target.value) : null };
                              setWatchlist(prev => prev.map(w => w.id === item.id ? updated : w));
                            }}
                            className="w-full bg-black/30 border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-rose-500/50"
                            placeholder="e.g. 50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleSaveAlertConfig(item)} className="text-[10px] font-bold px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">Save</button>
                        <button onClick={() => setEditAlertId(null)} className="text-[10px] font-bold px-3 py-1 bg-surface border border-border text-secondary rounded-lg hover:text-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditAlertId(item.id)}
                      className="text-[10px] text-secondary hover:text-indigo-400 transition-colors flex items-center gap-1"
                    >
                      <AlertTriangle size={10} />
                      {item.alertGmpAbove || item.alertGmpBelow
                        ? `GMP Alerts: ${item.alertGmpAbove ? `Above ₹${item.alertGmpAbove}` : ''}${item.alertGmpAbove && item.alertGmpBelow ? ' · ' : ''}${item.alertGmpBelow ? `Below ₹${item.alertGmpBelow}` : ''}`
                        : 'Set GMP Alerts'
                      }
                    </button>
                  )}

                  {/* Added Date */}
                  <div className="text-[10px] text-zinc-600 mt-3">
                    Added {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div key="add-watchlist-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative z-10 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="text-amber-400" size={18} /> Add to Watchlist
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="section-label block mb-1.5">IPO Name *</label>
                  <input
                    type="text"
                    value={form.ipoName}
                    onChange={e => setForm({ ...form, ipoName: e.target.value })}
                    className="w-full bg-black/20 border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    placeholder="e.g. Ola Electric IPO"
                    required
                  />
                </div>

                <div>
                  <label className="section-label block mb-1.5">Price Band</label>
                  <input
                    type="text"
                    value={form.priceBand}
                    onChange={e => setForm({ ...form, priceBand: e.target.value })}
                    className="w-full bg-black/20 border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    placeholder="e.g. ₹72 - ₹76"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="section-label block mb-1.5">Open Date</label>
                    <input type="date" value={form.openDate} onChange={e => setForm({ ...form, openDate: e.target.value })}
                      className="w-full bg-black/20 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Close Date</label>
                    <input type="date" value={form.closeDate} onChange={e => setForm({ ...form, closeDate: e.target.value })}
                      className="w-full bg-black/20 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Listing Date</label>
                    <input type="date" value={form.listingDate} onChange={e => setForm({ ...form, listingDate: e.target.value })}
                      className="w-full bg-black/20 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="section-label mb-2">GMP Alerts (Optional)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-secondary block mb-1">Alert when GMP goes above ₹</label>
                      <input type="number" value={form.alertGmpAbove} onChange={e => setForm({ ...form, alertGmpAbove: e.target.value })}
                        className="w-full bg-black/20 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="e.g. 100" />
                    </div>
                    <div>
                      <label className="text-xs text-secondary block mb-1">Alert when GMP drops below ₹</label>
                      <input type="number" value={form.alertGmpBelow} onChange={e => setForm({ ...form, alertGmpBelow: e.target.value })}
                        className="w-full bg-black/20 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                        placeholder="e.g. 50" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary hover:text-white transition-colors">
                    <input type="checkbox" checked={form.alertOnAllotment} onChange={e => setForm({ ...form, alertOnAllotment: e.target.checked })}
                      className="rounded bg-black/20 border-border accent-emerald-500" />
                    Alert on Allotment
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary hover:text-white transition-colors">
                    <input type="checkbox" checked={form.alertOnListing} onChange={e => setForm({ ...form, alertOnListing: e.target.checked })}
                      className="rounded bg-black/20 border-border accent-indigo-500" />
                    Alert on Listing
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline text-sm">Cancel</button>
                  <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                    <Eye size={14} /> Add to Watchlist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove from Watchlist"
        message="Are you sure you want to remove this IPO from your watchlist?"
        confirmText="Remove"
      />
    </div>
  );
};

export default Watchlist;
