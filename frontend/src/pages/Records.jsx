import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Trash2, Edit2, Upload, Download, Printer, ExternalLink } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import UpgradeModal from '../components/ui/UpgradeModal';
import IpoForm from '../components/forms/IpoForm';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

const CSV_HEADERS = [
  'ipoName', 'applicantName', 'quota', 'listingDate',
  'lotSize', 'shares', 'price', 'gmp', 'listingPrice', 'amount', 'applied',
  'alloted', 'profit', 'notes'
];

const Records = () => {
  const { user, subscriptionTiers } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

  const fileInputRef = useRef(null);

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

  useEffect(() => {
    loadRecords();
  }, []);

  const handleAddOrEdit = async (formData) => {
    try {
      if (editingRecord) {
        await api.updateRecord(editingRecord.id, formData);
      } else {
        await api.addRecord(formData);
      }
      setIsModalOpen(false);
      loadRecords();
      toast.success('Record saved!');
      
      // Next-level Confetti Celebration for Profitable Allotments
      const alloted = parseFloat(formData.alloted) || 0;
      const profit = parseFloat(formData.profit) || 0;
      if (alloted > 0 && profit > 0 && (!editingRecord || (parseFloat(editingRecord.alloted) || 0) === 0 || (parseFloat(editingRecord.profit) || 0) <= 0)) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b']
        });
        toast.success(`Congratulations on your ₹${profit} profit! 🎉`, { icon: '💰' });
      }

    } catch (error) {
      toast.error("Error saving record");
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await api.deleteRecord(recordToDelete);
      loadRecords();
      toast.success('Record deleted!');
    } catch (error) {
      toast.error("Error deleting record");
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

  // CSV Export
  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error('No records to export.');
      return;
    }
    const headerRow = CSV_HEADERS.join(',');
    const csvRows = records.map(r => {
      return CSV_HEADERS.map(header => {
        let val = r[header] || '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',');
    });
    
    const csvString = [headerRow, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipo_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    import('papaparse').then((Papa) => {
      Papa.default.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const recordsToImport = [];
            
            results.data.forEach(row => {
              const recordData = {};
              CSV_HEADERS.forEach(key => {
                // Find matching header regardless of case
                const rowKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
                if (rowKey && row[rowKey]) {
                  recordData[key] = row[rowKey].trim();
                }
              });
              
              if (recordData.ipoName && recordData.applicantName) {
                recordData.id = recordData.id || crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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
            console.error(err);
            toast.error('Error during bulk import: ' + err.message);
          }
          e.target.value = null; // Reset input
        },
        error: (err) => {
          console.error(err);
          toast.error('Error parsing CSV file');
        }
      });
    });
  };

  const filteredRecords = records.filter(r => 
    r.ipoName?.toLowerCase().includes(search.toLowerCase()) || 
    r.applicantName?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (applied, alloted) => {
    if (applied === 'Pending') return <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md text-xs font-medium border border-amber-500/20">Pending</span>;
    if (applied === 'No') return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-md text-xs font-medium border border-gray-500/20">Not Applied</span>;
    if (parseFloat(alloted) > 0) return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-medium border border-emerald-500/20">Allotted</span>;
    if (applied === 'Yes' && (alloted === '0' || alloted === 0)) return <span className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded-md text-xs font-medium border border-rose-500/20">Not Allotted</span>;
    return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md text-xs font-medium border border-blue-500/20">Applied</span>;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IPO Records</h1>
          <p className="text-sm text-secondary">Manage and track your IPO applications.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
          />
          <button onClick={() => fileInputRef.current.click()} className="btn-outline flex items-center gap-2">
            <Upload size={16} /> Import
          </button>
          <button onClick={handleExportCSV} className="btn-outline flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-2 print-hidden">
            <Printer size={16} /> Print
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 print-hidden">
            <Plus size={18} /> Add Record
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.1 }}
        className="glass-card flex-1 flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-border flex gap-4 items-center bg-black/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by IPO or Applicant name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <button className="btn-outline flex items-center gap-2">
            <Filter size={16} /> Filters
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-emerald-500">Loading records...</div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">IPO Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Quota</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Profit</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * Math.min(i, 20) }}
                    key={record.id} 
                    className="hover:bg-surface-hover transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-white">{record.ipoName}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{record.applicantName}</td>
                    <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-gray-300">{record.quota || 'Retail'}</span></td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(record.applied, record.alloted)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-gray-300">₹{parseFloat(record.amount || 0).toLocaleString('en-IN')}</td>
                    <td className={`px-6 py-4 text-sm text-right font-mono font-medium ${parseFloat(record.profit) > 0 ? 'text-emerald-400' : parseFloat(record.profit) < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                      {parseFloat(record.profit) > 0 ? '+' : ''}{parseFloat(record.profit || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href="https://ipowatch.in/ipo-allotment-status/" 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={() => {
                             if(record.pan) navigator.clipboard.writeText(record.pan);
                             toast.success("PAN copied! Paste it on the allotment page.");
                          }}
                          className="p-1.5 text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          title="Check Allotment"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button onClick={() => openEditModal(record)} className="p-1.5 text-secondary hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => setRecordToDelete(record.id)} className="p-2 rounded-lg text-secondary hover:text-rose-400 hover:bg-rose-500/10" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-secondary">
                      No records found. Try adjusting your search or add a new record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRecord ? 'Edit IPO Record' : 'Add New IPO Record'}
      >
        <IpoForm 
          initialData={editingRecord} 
          onSubmit={handleAddOrEdit} 
          onCancel={() => setIsModalOpen(false)} 
        />
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
    </div>
  );
};

export default Records;
