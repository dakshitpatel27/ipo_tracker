import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Database, AlertTriangle, CheckCircle2, Plus,
  FileSpreadsheet, ArrowRight, Sparkles, Layers,
  Table, RefreshCw, X, HelpCircle, Check, Code, ShieldAlert, Zap, Filter
} from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { api } from '../../api';

const TARGET_TABLES = [
  { id: 'records',      label: 'IPO Records',     desc: 'Applications, allotments, GMP & listing profits', icon: '📊' },
  { id: 'applicants',   label: 'Applicants',      desc: 'Family profiles, PAN cards, Demat IDs & UPI', icon: '👤' },
  { id: 'expenses',     label: 'Expenses',        desc: 'Personal/Business expense tracking ledger', icon: '💸' },
  { id: 'party_ledger', label: 'Party Ledger',    desc: 'Khatabook debit/credit party entries', icon: '📖' },
  { id: 'bank_accounts',label: 'Bank Accounts',   desc: 'Bank accounts & opening balances', icon: '🏦' },
];

const BROKER_PRESETS = [
  { id: 'generic',    label: 'Generic Standard File', desc: 'Auto-detect all headers & columns', icon: '⚡' },
  { id: 'zerodha',    label: 'Zerodha P&L / Tradebook', desc: 'Preset for Zerodha CSV/Excel exports', icon: '🟠' },
  { id: 'groww',      label: 'Groww Portfolio Export', desc: 'Preset for Groww tradebook CSVs', icon: '🟢' },
  { id: 'angelone',   label: 'AngelOne Trade Register', desc: 'Preset for AngelOne portfolio reports', icon: '🔵' },
  { id: 'upstox',     label: 'Upstox Portfolio Export', desc: 'Preset for Upstox trade register', icon: '🟣' },
  { id: 'icicidirect',label: 'ICICI Direct ASBA Report', desc: 'Preset for ICICI Direct IPO records', icon: '🔴' },
];

const SmartImportModal = ({ isOpen, onClose, defaultTable = 'records', onSuccess }) => {
  const [step, setStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState(defaultTable);
  const [selectedPreset, setSelectedPreset] = useState('generic');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  
  // Inspection results from backend
  const [inspectData, setInspectData] = useState(null); // { existingColumns, matchedColumns, extraColumns, duplicateCount }
  const [conflictStrategy, setConflictStrategy] = useState('KEEP_BOTH'); // 'SKIP' | 'OVERWRITE' | 'KEEP_BOTH'
  
  // User configuration for Extra Columns: { [headerName]: { action: 'ADD_COLUMN' | 'MAP_EXISTING' | 'IGNORE', targetCol: string, dataType: 'TEXT' | 'REAL' } }
  const [extraColConfigs, setExtraColConfigs] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedTable(defaultTable);
      setSelectedPreset('generic');
      setFile(null);
      setRawRows([]);
      setFileHeaders([]);
      setInspectData(null);
      setConflictStrategy('KEEP_BOTH');
      setExtraColConfigs({});
      setImportResult(null);
    }
  }, [isOpen, defaultTable]);

  // Handle File Select & Parsing
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    parseFile(selected);
  };

  const parseFile = (fileObj) => {
    setParsing(true);
    if (fileObj.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const dataArray = Array.isArray(json) ? json : json.data || [json];
          if (dataArray.length === 0) {
            toast.error('JSON file is empty');
            setParsing(false);
            return;
          }
          const headers = Array.from(new Set(dataArray.flatMap(obj => Object.keys(obj))));
          setFileHeaders(headers);
          setRawRows(dataArray);
          runInspection(selectedTable, headers, dataArray.slice(0, 50));
        } catch (err) {
          toast.error('Invalid JSON file format');
          setParsing(false);
        }
      };
      reader.readAsText(fileObj);
    } else {
      // CSV parse using papaparse
      import('papaparse').then((Papa) => {
        Papa.default.parse(fileObj, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              toast.error('CSV file contains no data rows');
              setParsing(false);
              return;
            }
            const headers = results.meta.fields || Object.keys(results.data[0] || {});
            setFileHeaders(headers);
            setRawRows(results.data);
            runInspection(selectedTable, headers, results.data.slice(0, 50));
          },
          error: (err) => {
            toast.error('Failed to parse CSV file: ' + err.message);
            setParsing(false);
          }
        });
      }).catch(err => {
        toast.error('Failed to load PapaParse library');
        setParsing(false);
      });
    }
  };

  const runInspection = async (tableName, headers, sampleRows) => {
    try {
      setLoading(true);
      const res = await api.inspectImportFile(tableName, headers, sampleRows);
      setInspectData(res);

      if (res.duplicateCount > 0) {
        setConflictStrategy('SKIP'); // Default to SKIP if duplicates detected!
      }

      // Initialize default config for extra columns
      const initialConfigs = {};
      (res.extraColumns || []).forEach(extraCol => {
        // Auto infer type based on sample values in rawRows
        const sampleVal = rawRows.find(r => r[extraCol] !== undefined && r[extraCol] !== null && r[extraCol] !== '')?.[extraCol];
        const isNumeric = sampleVal !== undefined && !isNaN(Number(sampleVal)) && String(sampleVal).trim() !== '';
        
        initialConfigs[extraCol] = {
          action: 'ADD_COLUMN', // Default recommended action: add to DB table!
          targetCol: extraCol.replace(/[^a-zA-Z0-9_]/g, ''),
          dataType: isNumeric ? 'REAL' : 'TEXT'
        };
      });
      setExtraColConfigs(initialConfigs);
      setStep(2); // Advance to Column Inspection step
    } catch (err) {
      toast.error('Inspection failed: ' + err.message);
    } finally {
      setParsing(false);
      setLoading(false);
    }
  };

  const handleExtraColActionChange = (extraCol, key, val) => {
    setExtraColConfigs(prev => ({
      ...prev,
      [extraCol]: {
        ...prev[extraCol],
        [key]: val
      }
    }));
  };

  // Step 3: Execute Schema Alteration & Bulk Import
  const handleExecuteImport = async () => {
    try {
      setLoading(true);

      // 1. Identify columns to add to database
      const newColumnsToAdd = [];
      Object.entries(extraColConfigs).forEach(([header, cfg]) => {
        if (cfg.action === 'ADD_COLUMN') {
          newColumnsToAdd.push({
            name: cfg.targetCol || header.replace(/[^a-zA-Z0-9_]/g, ''),
            type: cfg.dataType || 'TEXT'
          });
        }
      });

      // 2. Alter table schema if new columns exist
      if (newColumnsToAdd.length > 0) {
        toast.loading('Dynamically extending database table schema...', { id: 'alter-schema' });
        await api.alterImportSchema(selectedTable, newColumnsToAdd);
        toast.success(`Added ${newColumnsToAdd.length} new column(s) to table schema!`, { id: 'alter-schema' });
      }

      // 3. Map records
      const mappedRecords = rawRows.map(row => {
        const mappedRow = {};

        // Matched columns
        (inspectData.matchedColumns || []).forEach(m => {
          if (row[m.header] !== undefined) {
            mappedRow[m.tableColumn] = row[m.header];
          }
        });

        // Extra columns
        Object.entries(extraColConfigs).forEach(([header, cfg]) => {
          const val = row[header];
          if (val !== undefined && val !== null && val !== '') {
            if (cfg.action === 'ADD_COLUMN') {
              const colName = cfg.targetCol || header.replace(/[^a-zA-Z0-9_]/g, '');
              mappedRow[colName] = cfg.dataType === 'REAL' ? (parseFloat(val) || 0) : String(val);
            } else if (cfg.action === 'MAP_EXISTING' && cfg.targetCol) {
              mappedRow[cfg.targetCol] = val;
            }
          }
        });

        return mappedRow;
      });

      // 4. Execute Bulk Import with Conflict Strategy & Session Tracking
      toast.loading('Importing records into database...', { id: 'bulk-import' });
      const res = await api.executeSmartImport(
        selectedTable,
        mappedRecords,
        file?.name || 'import_data.csv',
        conflictStrategy,
        newColumnsToAdd.map(c => c.name)
      );
      toast.success(`Successfully imported ${res.count} records!`, { id: 'bulk-import' });

      setImportResult({
        count: res.count,
        historyId: res.historyId,
        addedColumnsCount: newColumnsToAdd.length,
        addedColumns: newColumnsToAdd
      });

      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Import failed: ' + err.message, { id: 'bulk-import' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Smart Import Suite">
      <div className="space-y-6">

        {/* Multi-step Stepper */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-surface-2 text-secondary'}`}>1</div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-white' : 'text-secondary'}`}>Upload & Preset</span>
          </div>
          <ArrowRight size={14} className="text-secondary" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-surface-2 text-secondary'}`}>2</div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-white' : 'text-secondary'}`}>AI Mapping & Conflicts</span>
          </div>
          <ArrowRight size={14} className="text-secondary" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-surface-2 text-secondary'}`}>3</div>
            <span className={`text-xs font-medium ${step >= 3 ? 'text-white' : 'text-secondary'}`}>Preview & Confirm</span>
          </div>
        </div>

        {/* ── STEP 1: Select Target Table, Broker Preset & Upload File ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">1. Select Target Database Table</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TARGET_TABLES.map(tbl => (
                  <div
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${selectedTable === tbl.id ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-surface-2 border-border hover:border-indigo-500/30 text-secondary'}`}
                  >
                    <span className="text-2xl">{tbl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white flex items-center justify-between">
                        {tbl.label}
                        {selectedTable === tbl.id && <CheckCircle2 size={16} className="text-indigo-400" />}
                      </div>
                      <p className="text-xs text-secondary mt-0.5">{tbl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Broker Presets */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">2. Select Broker / File Format Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BROKER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${selectedPreset === preset.id ? 'bg-indigo-500/15 border-indigo-500/50 text-white font-bold' : 'bg-surface-2 border-border/70 text-secondary hover:text-white'}`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5 truncate">
                      <span>{preset.icon}</span> {preset.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">3. Upload Data File (.CSV or .JSON)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-indigo-500/40 rounded-xl p-8 text-center bg-surface-2 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {file ? file.name : 'Click or Drag & Drop file to upload'}
                  </p>
                  <p className="text-xs text-secondary mt-1">Supports CSV, TSV, or JSON data files up to 25MB</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button type="button" className="btn-outline text-xs py-1.5 px-4">
                  Browse File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: AI Mapping, Extra Columns & Duplicate Conflict Resolver ── */}
        {step === 2 && inspectData && (
          <div className="space-y-5">
            {/* Header summary alert */}
            <div className="bg-surface-2 border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm flex items-center gap-2">
                  <Table size={16} className="text-indigo-400" />
                  Target: <span className="text-indigo-300 font-bold uppercase">{selectedTable}</span>
                </div>
                <p className="text-xs text-secondary mt-0.5">Parsed {rawRows.length} rows with {fileHeaders.length} total columns</p>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-emerald">{inspectData.matchedColumns.length} Matched Columns</span>
                {inspectData.extraColumns.length > 0 ? (
                  <span className="badge badge-amber">{inspectData.extraColumns.length} Extra Columns Identified</span>
                ) : (
                  <span className="badge badge-blue">No Extra Columns</span>
                )}
              </div>
            </div>

            {/* Duplicate Conflict Resolver Card */}
            {inspectData.duplicateCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-amber-300 text-sm flex items-center gap-2">
                    <ShieldAlert size={18} /> Detected {inspectData.duplicateCount} Duplicate Record(s) in Import File!
                  </div>
                </div>
                <p className="text-xs text-amber-200/80">
                  Select a Duplicate Conflict Strategy for matching database records:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConflictStrategy('SKIP')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${conflictStrategy === 'SKIP' ? 'bg-indigo-500/20 border-indigo-500 text-white shadow' : 'bg-black/30 border-border/70 text-secondary'}`}
                  >
                    🔵 Skip Duplicates
                    <p className="text-[10px] text-secondary mt-0.5 font-normal">Ignore duplicate records</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictStrategy('OVERWRITE')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${conflictStrategy === 'OVERWRITE' ? 'bg-emerald-500/20 border-emerald-500 text-white shadow' : 'bg-black/30 border-border/70 text-secondary'}`}
                  >
                    🟢 Overwrite Existing
                    <p className="text-[10px] text-secondary mt-0.5 font-normal">Update matching database rows</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictStrategy('KEEP_BOTH')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${conflictStrategy === 'KEEP_BOTH' ? 'bg-amber-500/20 border-amber-500 text-white shadow' : 'bg-black/30 border-border/70 text-secondary'}`}
                  >
                    🟡 Keep Both
                    <p className="text-[10px] text-secondary mt-0.5 font-normal">Insert all as new rows</p>
                  </button>
                </div>
              </div>
            )}

            {/* Matched & AI Auto-Mapped Columns */}
            {inspectData.matchedColumns.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Matched & AI Auto-Mapped Database Columns ({inspectData.matchedColumns.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  {inspectData.matchedColumns.map((m, idx) => (
                    <span key={idx} className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      {m.header} → <strong className="text-white">{m.tableColumn}</strong>
                      {m.aiMapped && (
                        <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded flex items-center gap-0.5">
                          <Sparkles size={10} /> AI
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Columns Configuration List */}
            {inspectData.extraColumns.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Extra / Unrecognized Columns Detected ({inspectData.extraColumns.length})
                  </label>
                  <span className="text-[11px] text-secondary">Choose how to handle extra data</span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {inspectData.extraColumns.map((extraCol, idx) => {
                    const cfg = extraColConfigs[extraCol] || { action: 'ADD_COLUMN', targetCol: extraCol, dataType: 'TEXT' };
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="bg-surface-2 border border-amber-500/20 rounded-xl p-4 space-y-3 hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-xs font-bold border border-amber-500/20">
                              {extraCol}
                            </span>
                            <span className="text-xs text-secondary">
                              Sample: <code className="text-zinc-300 bg-black/40 px-1.5 py-0.5 rounded">{String(rawRows[0]?.[extraCol] ?? 'N/A')}</code>
                            </span>
                          </div>

                          {/* Action Selector */}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExtraColActionChange(extraCol, 'action', 'ADD_COLUMN')}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all ${cfg.action === 'ADD_COLUMN' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-black/20 text-secondary border-border hover:text-white'}`}
                            >
                              <Plus size={12} /> Add to Table Schema
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtraColActionChange(extraCol, 'action', 'MAP_EXISTING')}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all ${cfg.action === 'MAP_EXISTING' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-black/20 text-secondary border-border hover:text-white'}`}
                            >
                              <Layers size={12} /> Map to Existing Column
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtraColActionChange(extraCol, 'action', 'IGNORE')}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${cfg.action === 'IGNORE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-black/20 text-secondary border-border hover:text-white'}`}
                            >
                              Ignore
                            </button>
                          </div>
                        </div>

                        {/* Sub-options based on action */}
                        {cfg.action === 'ADD_COLUMN' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">New Column Name</label>
                              <input
                                type="text"
                                value={cfg.targetCol}
                                onChange={e => handleExtraColActionChange(extraCol, 'targetCol', e.target.value)}
                                className="input-field py-1 text-xs font-mono"
                                placeholder="column_name"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Data Type</label>
                              <select
                                value={cfg.dataType}
                                onChange={e => handleExtraColActionChange(extraCol, 'dataType', e.target.value)}
                                className="input-field py-1 text-xs"
                              >
                                <option value="TEXT">TEXT (String / Date / General)</option>
                                <option value="REAL">NUMERIC (Decimals / Numbers / Amounts)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {cfg.action === 'MAP_EXISTING' && (
                          <div className="pt-1 text-xs">
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Map to DB Column</label>
                            <select
                              value={cfg.targetCol || ''}
                              onChange={e => handleExtraColActionChange(extraCol, 'targetCol', e.target.value)}
                              className="input-field py-1 text-xs"
                            >
                              <option value="">-- Select Existing DB Column --</option>
                              {(inspectData.existingColumns || []).map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <div className="font-semibold text-white text-sm">Perfect Schema Match!</div>
                <p className="text-xs text-secondary">All headers in your file match existing database columns.</p>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-outline text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                Continue to Preview <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview Data & Confirm Schema Alteration ── */}
        {step === 3 && inspectData && (
          <div className="space-y-5">
            {/* Schema alter confirmation summary */}
            {Object.values(extraColConfigs).some(c => c.action === 'ADD_COLUMN') && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div className="font-semibold text-emerald-300 text-sm flex items-center gap-2">
                  <Sparkles size={16} /> Database Table Will Be Dynamically Extended!
                </div>
                <p className="text-xs text-emerald-200/80">
                  The following new column(s) will be added to table <code className="font-mono bg-black/40 px-1 py-0.5 rounded">{selectedTable}</code> via <code className="font-mono bg-black/40 px-1 py-0.5 rounded">ALTER TABLE</code>:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(extraColConfigs)
                    .filter(([_, cfg]) => cfg.action === 'ADD_COLUMN')
                    .map(([hdr, cfg], i) => (
                      <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-black/40 text-emerald-300 border border-emerald-500/30">
                        + {cfg.targetCol || hdr} ({cfg.dataType})
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Sanitization Rule Summary Badge */}
            <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl">
              <Zap size={14} className="text-indigo-400 shrink-0" />
              <span>Automated Sanitization Active: Currency symbols (`₹`, `$`) stripped, dates formatted to ISO (`YYYY-MM-DD`), and PANs uppercase-cleaned.</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider">
                  Sample Data Row Mapped Preview (First 5 rows)
                </label>
                <span className="text-xs text-secondary">{rawRows.length} records ready to import</span>
              </div>

              <div className="overflow-x-auto border border-border rounded-xl max-h-60 custom-scrollbar">
                <table className="data-table text-xs whitespace-nowrap">
                  <thead>
                    <tr>
                      {inspectData.matchedColumns.map(m => (
                        <th key={m.tableColumn}>{m.tableColumn}</th>
                      ))}
                      {Object.entries(extraColConfigs)
                        .filter(([_, cfg]) => cfg.action !== 'IGNORE')
                        .map(([hdr, cfg]) => (
                          <th key={hdr} className="text-amber-300 font-mono">
                            {cfg.action === 'ADD_COLUMN' ? `+ ${cfg.targetCol}` : cfg.targetCol}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {inspectData.matchedColumns.map(m => (
                          <td key={m.tableColumn}>{String(row[m.header] ?? '—')}</td>
                        ))}
                        {Object.entries(extraColConfigs)
                          .filter(([_, cfg]) => cfg.action !== 'IGNORE')
                          .map(([hdr, _]) => (
                            <td key={hdr} className="font-mono text-amber-200">{String(row[hdr] ?? '—')}</td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-outline text-xs"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={loading}
                className="btn-primary text-xs flex items-center gap-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                {loading ? 'Executing Import...' : 'Confirm & Execute Import'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Import Complete Summary & Rollback Reference ── */}
        {step === 4 && importResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Data Import Complete!</h3>
              <p className="text-sm text-secondary mt-1">
                Successfully imported <span className="text-emerald-400 font-bold">{importResult.count}</span> records into table <code className="font-mono text-indigo-300 font-bold uppercase">{selectedTable}</code>.
              </p>
            </div>

            {importResult.addedColumnsCount > 0 && (
              <div className="bg-surface-2 border border-border rounded-xl p-4 text-left space-y-2">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Dynamically Added Columns to Database Table:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importResult.addedColumns.map((col, idx) => (
                    <span key={idx} className="text-xs font-mono px-2.5 py-1 bg-black/40 text-emerald-300 rounded border border-emerald-500/30">
                      {col.name} ({col.type})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-secondary bg-surface-2 p-3 rounded-xl border border-border flex items-center justify-between">
              <span>Session Logged to Audit History</span>
              <span className="font-mono text-indigo-400 font-bold">ID: {importResult.historyId?.substring(0, 8)}...</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary w-full py-2.5 text-sm"
            >
              Done & Return to Workspace
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default SmartImportModal;
