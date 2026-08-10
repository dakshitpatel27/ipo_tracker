import React from 'react';
import { X, QrCode, ExternalLink, ShieldCheck, Smartphone, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpiQrModal({ isOpen, onClose, ipoName, amount, upiId = '' }) {
  if (!isOpen) return null;

  const formattedAmount = (parseFloat(amount) || 14950).toFixed(2);
  const cleanIpoName = (ipoName || 'IPO Application').replace(/[^a-zA-Z0-9 ]/g, '');
  const note = `ASBA Bid Payment for ${cleanIpoName}`;
  const targetUpi = upiId || 'asbamandate@bank';

  // Construct standard UPI intent link
  const upiIntent = `upi://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent('IPO ASBA Payment')}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

  // Quick QR code URL using public QR API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiIntent)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiIntent);
    toast.success('UPI Intent Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">ASBA UPI Payment Launcher</h3>
              <p className="text-[10px] text-zinc-400">{ipoName || 'IPO Bidding Mandate'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner space-y-2">
          <img src={qrApiUrl} alt="UPI Payment QR Code" className="w-44 h-44 object-contain select-none" />
          <p className="text-[10px] font-bold text-zinc-800 tracking-wider uppercase flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> Scan with GPay / PhonePe / Paytm
          </p>
        </div>

        {/* Amount Details */}
        <div className="bg-[#141418] border border-[#27272a] rounded-xl p-3 flex justify-between items-center text-xs">
          <div>
            <span className="text-zinc-400 block text-[10px]">Mandate Amount</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">₹{parseFloat(formattedAmount).toLocaleString('en-IN')}</span>
          </div>
          <button onClick={handleCopyLink} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-semibold">
            <Copy size={12} /> Copy Link
          </button>
        </div>

        {/* UPI Intent Launcher Buttons */}
        <div className="space-y-2 pt-1">
          <a
            href={upiIntent}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Smartphone size={15} /> Open UPI App (GPay/PhonePe) <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
