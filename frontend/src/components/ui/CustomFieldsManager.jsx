import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { motion } from 'framer-motion';
import { Layers, Eye, EyeOff, Edit2, Trash2, Check, X, Sparkles, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomFieldsManager = () => {
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomFields();
      const fieldsList = Array.isArray(data) ? data : (data?.data || []);
      setCustomFields(fieldsList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleToggleVisibility = async (field) => {
    try {
      await api.updateCustomField(field.id, { label: field.label, isVisible: !field.isVisible });
      toast.success(field.isVisible ? 'Field hidden' : 'Field visible');
      loadFields();
    } catch (err) {
      toast.error('Failed to update field visibility');
    }
  };

  const handleSaveLabel = async (id, currentVisibility) => {
    if (!editLabel.trim()) return;
    try {
      await api.updateCustomField(id, { label: editLabel.trim(), isVisible: currentVisibility });
      toast.success('Label updated!');
      setEditingId(null);
      loadFields();
    } catch (err) {
      toast.error('Failed to update label');
    }
  };

  const handleDeleteField = async (id) => {
    try {
      await api.deleteCustomField(id);
      toast.success('Custom field metadata removed!');
      loadFields();
    } catch (err) {
      toast.error('Failed to remove custom field');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-secondary flex items-center justify-center gap-2">
        <RefreshCw size={16} className="animate-spin text-indigo-400" />
        <span>Loading dynamic schema fields...</span>
      </div>
    );
  }

  // Group by table
  const fieldsList = Array.isArray(customFields) ? customFields : [];
  const grouped = fieldsList.reduce((acc, f) => {
    const tbl = f.tableName || 'other';
    if (!acc[tbl]) acc[tbl] = [];
    acc[tbl].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-base flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" /> Dynamic Schema & Custom Field Manager
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage custom columns added dynamically via the Smart Import tool across database tables.
          </p>
        </div>
        <button onClick={loadFields} className="btn-outline text-xs flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 glass-card space-y-2">
          <Database size={32} className="text-[var(--text-muted)] mx-auto" />
          <p className="font-semibold text-[var(--text-primary)] text-sm">No Custom Columns Created Yet</p>
          <p className="text-xs text-[var(--text-secondary)]">
            When you import files with extra columns using the Smart Data Import tool and select "Add to Table Schema", your custom fields will appear here for management.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tableName, fields]) => (
            <div key={tableName} className="glass-card p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} /> Table: <strong className="text-[var(--text-primary)]">{tableName}</strong>
                </span>
                <span className="text-xs text-[var(--text-secondary)]">{fields.length} custom field(s)</span>
              </div>

              <div className="space-y-2">
                {fields.map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-[var(--border)] hover:border-indigo-500/30 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 font-mono font-bold">
                        {f.columnName}
                      </div>
                      <div>
                        {editingId === f.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editLabel}
                              onChange={e => setEditLabel(e.target.value)}
                              className="input-field text-xs py-1 px-2 font-semibold"
                            />
                            <button onClick={() => handleSaveLabel(f.id, f.isVisible)} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-[var(--text-secondary)] hover:bg-black/5 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            {f.label}
                            <button onClick={() => { setEditingId(f.id); setEditLabel(f.label); }} className="text-[var(--text-secondary)] hover:text-indigo-500">
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          Type: <code className="font-mono text-[var(--text-secondary)]">{f.dataType}</code> • Created: {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisibility(f)}
                        className={`btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1.5 ${f.isVisible ? 'text-emerald-400 border-emerald-500/30' : 'text-secondary'}`}
                      >
                        {f.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                        {f.isVisible ? 'Visible' : 'Hidden'}
                      </button>
                      <button
                        onClick={() => handleDeleteField(f.id)}
                        className="p-1.5 text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove custom field entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsManager;
