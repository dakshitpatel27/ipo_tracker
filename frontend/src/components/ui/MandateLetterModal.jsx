import React, { useRef } from 'react';
import { FileText, Printer, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MandateLetterModal({ isOpen, onClose, record }) {
  const printRef = useRef();

  if (!isOpen || !record) return null;

  const letterHtml = `
  DATE: ${new Date().toLocaleDateString('en-IN')}

  TO,
  THE BRANCH MANAGER,
  ${record.bankName || 'BANK BRANCH'},

  SUBJECT: REQUEST FOR UNBLOCKING ASBA FUNDS FOR UNALLOTTED IPO APPLICATION (${record.ipoName})

  DEAR SIR / MADAM,

  I HAD APPLIED FOR THE INITIAL PUBLIC OFFERING (IPO) OF "${record.ipoName || 'IPO'}" VIA UPI / ASBA MANDATE.

  APPLICATION DETAILS:
  - APPLICANT NAME: ${record.applicantName || 'APPLICANT'}
  - PAN NUMBER: ${record.pan || 'N/A'}
  - BANK ACCOUNT / DEMAT NO: ${record.bankAccount || record.dematId || 'N/A'}
  - BLOCKED AMOUNT: ₹${(parseFloat(record.amount) || 15000).toLocaleString('en-IN')}
  - REGISTRAR STATUS: NOT ALLOTTED

  SINCE THE BASIS OF ALLOTMENT HAS BEEN FINALIZED AND NO SHARES WERE ALLOTTED TO MY APPLICATION, KINDLY UNBLOCK THE ASBA AMOUNT OF ₹${(parseFloat(record.amount) || 15000).toLocaleString('en-IN')} CREDITED BACK TO MY SAVINGS ACCOUNT AT THE EARLIEST.

  THANKING YOU,

  YOURS FAITHFULLY,
  ${record.applicantName || 'APPLICANT'}
  `;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterHtml);
    toast.success('Unblock Request Letter text copied!');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Bank ASBA Unblock Request Letter</h3>
              <p className="text-xs text-white/50">{record.applicantName} • {record.ipoName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <pre ref={printRef} className="p-4 bg-[#141418] border border-white/10 rounded-xl text-xs font-mono whitespace-pre-wrap text-white/80 max-h-60 overflow-y-auto custom-scrollbar">
          {letterHtml}
        </pre>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <button onClick={handleCopy} className="btn-outline text-xs">Copy Text</button>
          <button onClick={handlePrint} className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1">
            <Printer size={13} /> Print / Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
