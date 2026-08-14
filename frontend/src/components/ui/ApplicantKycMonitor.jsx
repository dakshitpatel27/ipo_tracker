import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { ShieldCheck, AlertCircle, UserCheck, RefreshCw, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';

const ApplicantKycMonitor = () => {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getApplicants();
        setApplicants(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-400" /> Applicant Demat & PAN KYC Monitor
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Monitor active status, PAN format compliance, and Demat IDs across all family profiles.
          </p>
        </div>
        <span className="badge badge-emerald flex items-center gap-1">
          <ShieldCheck size={12} /> {applicants.length} Verified Profiles
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {applicants.slice(0, 6).map((app) => {
          const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(app.pan || '').toUpperCase());

          return (
            <div key={app.id} className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{app.name}</span>
                {isPanValid ? (
                  <span className="badge badge-emerald text-[9px]">PAN Valid</span>
                ) : (
                  <span className="badge badge-amber text-[9px]">Check PAN</span>
                )}
              </div>

              <div className="space-y-1 font-mono text-[11px] text-secondary">
                <div>PAN: <strong className="text-zinc-200">{app.pan || '—'}</strong></div>
                <div>UPI: <strong className="text-zinc-200">{app.upiId || '—'}</strong></div>
                <div>Demat: <strong className="text-zinc-200">{app.dematId ? (app.dematId.substring(0, 6) + '...') : '—'}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicantKycMonitor;
