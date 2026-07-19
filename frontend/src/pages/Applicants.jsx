import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, User } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import UpgradeModal from '../components/ui/UpgradeModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Applicants = () => {
  const { user, subscriptionTiers } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [applicantToDelete, setApplicantToDelete] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', pan: '', upiId: '', family: '' });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateApplicant(editing.id, formData);
      } else {
        await api.addApplicant(formData);
      }
      setIsModalOpen(false);
      load();
      toast.success('Applicant saved!');
    } catch (err) {
      toast.error('Error saving applicant');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Applicant Master</h1>
          <p className="text-sm text-secondary">Manage PAN and UPI details for applicants.</p>
        </div>
        <button 
          onClick={() => { 
             const userTier = user?.subscription || 'free';
             const tierLimits = subscriptionTiers?.[userTier];
             if (tierLimits && applicants.length >= tierLimits.maxApplicants) {
                 setShowUpgradeModal(true);
             } else {
                 setEditing(null); 
                 setFormData({name:'', pan:'', upiId:'', family: ''}); 
                 setIsModalOpen(true);
             }
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Applicant
        </button>
      </div>

      <div className="glass-card flex-1 overflow-auto custom-scrollbar p-6">
        {loading ? <div className="text-center text-emerald-500">Loading...</div> : (
          <div className="space-y-8">
            {Object.entries((applicants || []).reduce((acc, app) => {
              const fam = app.family || 'Uncategorized';
              if(!acc[fam]) acc[fam] = [];
              acc[fam].push(app);
              return acc;
            }, {})).map(([family, apps]) => (
              <div key={family} className="space-y-4">
                <h2 className="text-lg font-bold text-emerald-400 border-b border-border/50 pb-2">{family} Portfolio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apps.map(app => (
                    <motion.div 
                      key={app.id} 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-black/20 border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <User size={20} />
                          </div>
                          <h3 className="text-lg font-semibold text-white">{app.name}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(app); setFormData({name: app.name, pan: app.pan, upiId: app.upiId, family: app.family}); setIsModalOpen(true); }} className="text-secondary hover:text-emerald-400"><Edit2 size={16}/></button>
                          <button onClick={() => setApplicantToDelete(app.id)} className="text-secondary hover:text-rose-400"><Trash2 size={16}/></button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        <p><span className="text-secondary">PAN:</span> {app.pan || 'N/A'}</p>
                        <p><span className="text-secondary">UPI:</span> {app.upiId || 'N/A'}</p>
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Name <span className="text-rose-500">*</span></label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Full name" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Family / Group Name</label>
            <input type="text" value={formData.family} onChange={e => setFormData({...formData, family: e.target.value})} className="input-field" placeholder="e.g. Gajipara Family" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">PAN Card</label>
            <input value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} className="input-field uppercase" maxLength={10} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1">UPI ID</label>
            <input value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
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
    </div>
  );
};

export default Applicants;
