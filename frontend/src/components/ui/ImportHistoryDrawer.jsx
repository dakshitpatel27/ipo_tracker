import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { motion } from 'framer-motion';
import { RotateCcw, FileSpreadsheet, Table, CheckCircle2, AlertOctagon, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const ImportHistoryDrawer = () => {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollingBackId, setRollingBackId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getImportHistory();
      setHistoryLogs(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRollback = async (log) => {
    if (!window.confirm(`Are you sure you want to undo this import session (${log.importedCount} records)? This will delete all records created in this import file.`)) {
      return;
    }

    try {
      setRollingBackId(log.id);
      toast.loading('Rolling back import session...', { id: 'undo-import' });
      const res = await api.undoImportSession(log.id);
      toast.success(`Successfully rolled back import! Deleted ${res.deletedCount} records.`, { id: 'undo-import' });
      loadHistory();
    } catch (err) {
      toast.error('Rollback failed: ' + err.message, { id: 'undo-import' });
    } finally {
      setRollingBackId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-secondary flex items-center justify-center gap-2">
        <RefreshCw size={16} className="animate-spin text-indigo-400" />
        <span>Loading import audit logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Clock size={18} className="text-indigo-400" /> Import Audit History & Rollback Log
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Audit history of all import sessions with one-click undo capabilities to safely reverse accidental imports.
          </p>
        </div>
        <button onClick={loadHistory} className="btn-outline text-xs flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh History
        </button>
      </div>

      {historyLogs.length === 0 ? (
        <div className="text-center py-12 glass-card space-y-2">
          <FileSpreadsheet size={32} className="text-secondary mx-auto" />
          <p className="font-semibold text-white text-sm">No Import Sessions Recorded Yet</p>
          <p className="text-xs text-secondary">
            When you import CSV or JSON files using the Smart Data Import tool, every session will be logged here with transactional undo options.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyLogs.map((log) => {
            let addedCols = [];
            try { addedCols = JSON.parse(log.addedColumns || '[]'); } catch(e) {}
            const isUndone = log.status === 'undone';

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${isUndone ? 'bg-surface-2/40 border-border/40 opacity-70' : 'bg-surface-2 border-border hover:border-indigo-500/30'}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isUndone ? 'bg-zinc-800 text-secondary' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'}`}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {log.fileName}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                        {log.tableName}
                      </span>
                      {isUndone ? (
                        <span className="badge badge-rose text-[10px]">Undone / Rolled Back</span>
                      ) : (
                        <span className="badge badge-emerald text-[10px]">Active ({log.importedCount} rows)</span>
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-0.5 flex items-center gap-3">
                      <span>Timestamp: {new Date(log.createdAt).toLocaleString()}</span>
                      {addedCols.length > 0 && (
                        <span>Added Columns: <code className="font-mono text-emerald-300">{addedCols.join(', ')}</code></span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  {!isUndone ? (
                    <button
                      type="button"
                      onClick={() => handleRollback(log)}
                      disabled={rollingBackId === log.id}
                      className="btn-outline text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs flex items-center gap-1.5"
                      title="Delete all records created in this import session"
                    >
                      <RotateCcw size={13} className={rollingBackId === log.id ? 'animate-spin' : ''} />
                      Undo / Rollback Import
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-secondary italic">
                      Session Rolled Back
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImportHistoryDrawer;
