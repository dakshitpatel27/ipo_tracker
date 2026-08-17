import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Printer, Calendar, Download, X, TrendingUp, Award, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const MonthlyReportGenerator = ({ isOpen, onClose }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, month, year]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.getMonthlyReport(month, year);
      setReport(data);
    } catch (e) {
      toast.error('Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card w-full max-w-xl p-6 z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Monthly P&L Report Generator</h3>
                <p className="text-xs text-secondary">Summary report for financial & tax record-keeping</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-secondary hover:text-white rounded-lg hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="section-label block mb-1">Month</label>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field bg-black/40">
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Year</label>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field bg-black/40">
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Card Preview */}
          {loading ? (
            <div className="text-center py-12 text-secondary text-xs animate-pulse">
              Generating report for {monthNames[month - 1]} {year}...
            </div>
          ) : report ? (
            <div className="space-y-4 bg-black/30 border border-border rounded-xl p-5" id="printable-report">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <h4 className="font-bold text-white text-sm">{monthNames[month - 1]} {year} Performance Digest</h4>
                <span className="badge badge-indigo text-[10px]">{report.totalRecords || 0} IPOs Traded</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface/50 rounded-lg border border-border/40">
                  <div className="text-[10px] text-secondary">Applied</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{report.totalApplied}</div>
                </div>
                <div className="p-3 bg-surface/50 rounded-lg border border-border/40">
                  <div className="text-[10px] text-secondary">Allotted</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{report.totalAllotted}</div>
                </div>
                <div className="p-3 bg-surface/50 rounded-lg border border-border/40">
                  <div className="text-[10px] text-secondary">Win Rate</div>
                  <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">{report.allotmentRate}%</div>
                </div>
                <div className="p-3 bg-surface/50 rounded-lg border border-border/40">
                  <div className="text-[10px] text-secondary">Net Profit</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${report.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{report.totalProfit?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Top performers */}
              {report.top3Ipos && report.top3Ipos.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Award size={12} className="text-amber-400" /> Top Performers
                  </div>
                  <div className="space-y-1.5">
                    {report.top3Ipos.map((ipo, i) => (
                      <div key={ipo.ipoName} className="flex justify-between items-center text-xs p-2 rounded-lg bg-surface/30 border border-border/30">
                        <span className="font-semibold text-white">{i + 1}. {ipo.ipoName}</span>
                        <span className="font-bold text-emerald-400 font-mono">+₹{ipo.profit?.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 border-t border-border/50 flex justify-end gap-2">
                <button onClick={() => window.print()} className="btn-outline text-xs flex items-center gap-1.5">
                  <Printer size={14} /> Print / Save as PDF
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MonthlyReportGenerator;
