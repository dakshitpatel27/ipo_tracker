import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Copy, Check, Smartphone, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UpiQrModal = ({ isOpen, onClose, record }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record) return null;

  // Extract application info
  const ipoName = record.ipoName || record.ipo_name || 'IPO Application';
  const applicantName = record.applicantName || record.applicant_name || 'Applicant';
  const upiId = record.upiId || record.upi_id || record.vpa || 'mandate@upi';
  const amount = record.amount || record.cutOffPrice * record.lotsize || 15000;
  const category = record.category || 'Retail';
  const appNo = record.applicationNumber || record.application_number || 'N/A';

  // Construct standard UPI deep link URI
  // upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=REASON&cu=INR
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(applicantName)}&am=${amount}&tn=${encodeURIComponent(`IPO Bidding ${ipoName}`)}&cu=INR`;

  // QR Code URL using QRServer API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiString)}`;

  const handleCopyString = () => {
    navigator.clipboard.writeText(upiString);
    setCopied(true);
    toast.success('UPI Mandate link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-indigo-500/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <QrCode size={19} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-[var(--text-primary)]">UPI Mandate QR Helper</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Scan from GPay, PhonePe, or Paytm</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Info Badge */}
            <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">{ipoName}</div>
                <div className="text-[var(--text-muted)] text-[11px]">{applicantName} • <span className="text-indigo-400 font-semibold">{category}</span></div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-400 text-sm">₹{Number(amount).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-[var(--text-muted)]">App #: {appNo}</div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/5 relative group">
              <img
                src={qrCodeUrl}
                alt="UPI Mandate QR Code"
                className="w-52 h-52 object-contain rounded-lg"
                loading="eager"
              />
              <div className="mt-2 text-center text-slate-800 text-[11px] font-semibold flex items-center gap-1.5">
                <Smartphone size={13} className="text-indigo-600" />
                Scan with any UPI app on phone
              </div>
            </div>

            {/* VPA / UPI ID Display */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Target VPA / UPI ID</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">
                <span className="flex-1 truncate">{upiId}</span>
                <button
                  onClick={handleCopyString}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Deep Link Direct Action */}
            <a
              href={upiString}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <span>Open in Mobile UPI App</span>
              <ExternalLink size={14} />
            </a>

            {/* Guidance */}
            <div className="flex items-start gap-2 text-[11px] text-[var(--text-muted)] bg-indigo-500/5 border border-indigo-500/20 p-2.5 rounded-xl">
              <ShieldCheck size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>Mandates are authorized directly inside your banking/UPI application (Google Pay, PhonePe, Paytm, BHIM, SBI YONO).</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpiQrModal;
