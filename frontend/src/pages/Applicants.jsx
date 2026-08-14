import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, User, Upload, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import UpgradeModal from '../components/ui/UpgradeModal';
import SmartImportModal from '../components/ui/SmartImportModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/ui/PageLoader';

const Applicants = () => {
  const { user, subscriptionTiers } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [applicantToDelete, setApplicantToDelete] = useState(null);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({ name: '', pan: '', upiId: '', family: '', dematId: '', bankAccount: '', ifscCode: '', commissionPct: 0 });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getApplicants();
      setApplicants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDownloadTemplate = () => {
    const templateCsv = `Applicant Name,PAN Number,UPI ID,Family Group,Demat Account ID,Bank Account Number,IFSC Code,Commission %`;

    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'applicants_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded Applicants Blank CSV Template!', { icon: '📥' });
  };

  const handleExportCSV = () => {
    if (!applicants || applicants.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    const headers = ['Applicant Name', 'PAN Number', 'UPI ID', 'Family Group', 'Demat Account ID', 'Bank Account Number', 'IFSC Code', 'Commission %'];
    const keys = ['name', 'pan', 'upiId', 'family', 'dematId', 'bankAccount', 'ifscCode', 'commissionPct'];
    const csvRows = [headers.join(',')];
    applicants.forEach(a => {
      const values = keys.map(k => `"${(a[k] || '').toString().replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `applicants_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Applicants exported!');
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
            let count = 0;
            for (const row of results.data) {
              const name = (row['Applicant Name'] || row.name || row.Name || '').trim();
              const pan = (row['PAN Number'] || row.pan || row.PAN || '').trim().toUpperCase();
              if (name && pan) {
                await api.addApplicant({
                  name,
                  pan,
                  upiId: (row['UPI ID'] || row.upiId || row.upi || '').trim(),
                  family: (row['Family Group'] || row.family || row.Family || 'Primary Family').trim(),
                  dematId: (row['Demat Account ID'] || row.dematId || row.demat || '').trim(),
                  bankAccount: (row['Bank Account Number'] || row.bankAccount || row.bank || '').trim(),
                  ifscCode: (row['IFSC Code'] || row.ifscCode || row.ifsc || '').trim().toUpperCase(),
                  commissionPct: parseFloat(row['Commission %'] || row.commissionPct || row.commission || 0)
                });
                count++;
              }
            }
            if (count > 0) {
              toast.success(`Successfully imported ${count} applicant profiles!`);
              load();
            } else {
              toast.error('No valid applicant records with mandatory PAN found.');
            }
          } catch (err) {
            toast.error('Error importing applicants: ' + err.message);
          }
          e.target.value = null;
        },
        error: () => toast.error('Error parsing CSV file')
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pan || !formData.pan.trim()) {
      toast.error('PAN Card Number is mandatory');
      return;
    }

    try {
      if (editing) {
        await api.updateApplicant(editing.id, formData);
      } else {
        await api.addApplicant(formData);
      }
      setIsModalOpen(false);
      load();
      toast.success('Applicant saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Error saving applicant');
    }
  };

  const confirmDelete = async () => {
    if (!applicantToDelete) return;
    try {
      await api.deleteApplicant(applicantToDelete);
      load();
      toast.success('Applicant deleted!');
    } catch (err) {
      toast.error('Error deleting');
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Applicant Master</h1>
          <p className="page-subtitle">Manage family profiles, Demat IDs, and profit-sharing commission %.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
          <button onClick={handleDownloadTemplate} className="btn-outline flex items-center gap-1.5" title="Download CSV Import Template">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Template
          </button>
          <button onClick={() => setIsSmartImportOpen(true)} className="btn-outline flex items-center gap-1.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10" title="Smart Import Applicants with Extra Column Detection">
            <Sparkles size={14} className="text-indigo-400" /> Smart Import
          </button>
          <button onClick={handleExportCSV} className="btn-outline flex items-center gap-1.5" title="Export Applicants to CSV">
            <Download size={14} className="text-amber-400" /> Export
          </button>
          <button 
            onClick={() => { 
               const userTier = user?.subscription || 'free';
               const tierLimits = subscriptionTiers?.[userTier];
               if (tierLimits && applicants.length >= tierLimits.maxApplicants) {
                   setShowUpgradeModal(true);
               } else {
                   setEditing(null); 
                   setFormData({name:'', pan:'', upiId:'', family: '', dematId: '', bankAccount: '', ifscCode: '', commissionPct: 0}); 
                   setIsModalOpen(true);
               }
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Applicant
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6 glass-card">
        {loading ? <PageLoader text="Loading applicant profiles..." /> : (
          <div className="space-y-8">
            {Object.entries((applicants || []).reduce((acc, app) => {
              const fam = app.family || 'Uncategorized';
              if(!acc[fam]) acc[fam] = [];
              acc[fam].push(app);
              return acc;
            }, {})).map(([family, apps]) => (
              <div key={family} className="space-y-4">
                <h2 className="text-base font-bold text-indigo-400 border-b border-[var(--border)] pb-2">{family} Family Portfolio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apps.map(app => (
                    <motion.div 
                      key={app.id} 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <User size={18} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{app.name}</h3>
                            {parseFloat(app.commissionPct) > 0 && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                {app.commissionPct}% Commission
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(app); setFormData({name: app.name, pan: app.pan || '', upiId: app.upiId || '', family: app.family || '', dematId: app.dematId || '', bankAccount: app.bankAccount || '', ifscCode: app.ifscCode || '', commissionPct: app.commissionPct || 0}); setIsModalOpen(true); }} className="text-[var(--text-muted)] hover:text-indigo-400"><Edit2 size={15}/></button>
                          <button onClick={() => setApplicantToDelete(app.id)} className="text-[var(--text-muted)] hover:text-rose-400"><Trash2 size={15}/></button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400 space-y-1">
                        <p><span className="text-secondary font-medium">PAN:</span> <span className="font-mono font-bold text-white">{app.pan || 'N/A'}</span></p>
                        <p><span className="text-secondary font-medium">UPI:</span> <span className="font-mono">{app.upiId || 'N/A'}</span></p>
                        <p><span className="text-secondary font-medium">Demat ID:</span> <span className="font-mono">{app.dematId || 'N/A'}</span></p>
                        <p><span className="text-secondary font-medium">Bank A/C:</span> <span className="font-mono">{app.bankAccount || 'N/A'}</span></p>
                        <p><span className="text-secondary font-medium">IFSC:</span> <span className="font-mono">{app.ifscCode || 'N/A'}</span></p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
            {applicants.length === 0 && <div className="text-center text-secondary py-10">No applicants found. Create one to get started.</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Applicant" : "Add Applicant"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-sm font-medium text-gray-300">Name <span className="text-rose-500">*</span></label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-sm font-medium text-gray-300">Family / Group Name</label>
              <input type="text" value={formData.family} onChange={e => setFormData({...formData, family: e.target.value})} className="input-field" placeholder="e.g. Gajipara Family" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">PAN Card <span className="text-rose-500">* (Mandatory)</span></label>
              <input required value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value.toUpperCase()})} className="input-field uppercase font-mono font-bold" maxLength={10} placeholder="ABCDE1234F" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">Commission % (Profit Sharing)</label>
              <input type="number" step="any" min="0" max="100" value={formData.commissionPct} onChange={e => setFormData({...formData, commissionPct: parseFloat(e.target.value) || 0})} className="input-field font-mono" placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">UPI ID</label>
              <input value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="input-field" placeholder="upi@bank" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">Demat Account ID</label>
              <input value={formData.dematId} onChange={e => setFormData({...formData, dematId: e.target.value})} className="input-field" placeholder="16-digit Demat ID" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">Bank Account Number</label>
              <input value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="input-field" placeholder="Bank Account No." />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">IFSC Code</label>
              <input value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})} className="input-field uppercase" placeholder="IFSC Code (e.g. SBIN0001234)" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Save Applicant</button>
          </div>
        </form>
      </Modal>
      
      <ConfirmModal 
        isOpen={!!applicantToDelete}
        onClose={() => setApplicantToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Applicant"
        message="Are you sure you want to delete this applicant? This action cannot be undone."
      />
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        title="Applicant Limit Reached"
        message={`Your current subscription tier (${user?.subscription || 'free'}) only allows up to ${subscriptionTiers?.[user?.subscription || 'free']?.maxApplicants || 0} applicants.`}
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        defaultTable="applicants"
        onSuccess={load}
      />
    </div>
  );
};

export default Applicants;
