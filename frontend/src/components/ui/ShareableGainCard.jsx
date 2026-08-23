import React, { useRef, useState } from 'react';
import { Share2, Flame, Trophy, Download, CheckCircle2, Copy, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareableGainCard({
  isOpen = false,
  onClose,
  ipoName = '',
  profit = 0,
  returnPct = 0,
  applicant = 'Primary',
  lotCount = 1
}) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleShare = () => {
    try {
      setDownloading(true);
      toast.loading('Generating victory card...', { id: 'victory-card' });

      // Native HTML5 Canvas rendering
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#064e3b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // Border glow
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 1140, 570);

      // Header Tag
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(70, 70, 420, 50);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('🔥 ALLOTTED & PROFIT BOOKED', 90, 103);

      // Title & Subtitle
      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 54px system-ui, sans-serif';
      ctx.fillText(ipoName, 70, 200);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(`Applicant: ${applicant}   •   Lot Count: ${lotCount} Lot(s)`, 70, 245);

      // Profit Box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(70, 300, 500, 180);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.strokeRect(70, 300, 500, 180);

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('REALIZED NET PROFIT', 100, 345);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 58px monospace';
      ctx.fillText(`+₹${profit.toLocaleString('en-IN')}`, 100, 430);

      // ROI Box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(630, 300, 500, 180);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.strokeRect(630, 300, 500, 180);

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('LISTING RETURN (ROI)', 660, 345);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 58px monospace';
      ctx.fillText(`+${returnPct}%`, 660, 430);

      // Footer Branding
      ctx.fillStyle = '#6b7280';
      ctx.font = '20px monospace';
      ctx.fillText('VERIFIED BY IPO TRACKER PRO  •  IPOTRACKER.APP', 70, 550);

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${ipoName.replace(/\s+/g, '_')}_Victory_Card.png`;
      link.click();

      toast.success('🎉 Victory Card downloaded successfully!', { id: 'victory-card' });
    } catch (err) {
      console.error('Failed to render canvas image:', err);
      const shareText = `🎉 Allotted & Profit Booked in ${ipoName}!\n💰 Net Gain: +₹${profit.toLocaleString('en-IN')} (+${returnPct}% ROI)\n👤 Applicant: ${applicant}\n\nTracked via IPO Tracker Pro 🚀`;
      navigator.clipboard?.writeText(shareText);
      toast.success('Victory summary text copied to clipboard!', { id: 'victory-card' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-10 w-full max-w-md bg-[#0d0d10] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <span className="font-bold text-white text-base">Shareable Victory Card</span>
            </div>
            <button onClick={onClose} className="p-1.5 text-secondary hover:text-white rounded-lg hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          {/* Styled Graphic Card Preview */}
          <div className="bg-gradient-to-br from-indigo-950 via-[#09090b] to-emerald-950 border-2 border-emerald-500/40 rounded-2xl p-6 text-white space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Flame size={12} className="text-amber-400" /> ALLOTTED & PROFIT BOOKED
              </span>
              <span className="text-[11px] font-black tracking-widest text-indigo-400/80 uppercase">IPO TRACKER PRO</span>
            </div>

            <div className="relative z-10 space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-white">{ipoName}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>Applicant: <strong className="text-white">{applicant}</strong></span>
                <span>•</span>
                <span>Lot: <strong className="text-white">{lotCount} Lot{lotCount !== 1 ? 's' : ''}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 relative z-10">
              <div className="bg-black/50 p-3.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Realized Net Profit</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">+₹{profit.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-black/50 p-3.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Listing Return</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">+{returnPct}%</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] text-zinc-500 border-t border-white/10 font-mono relative z-10">
              Verified by IPO Tracker • ipotracker.app
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              disabled={downloading}
              className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            >
              <Download size={14} /> {downloading ? 'Exporting Image...' : 'Download Victory Image'}
            </button>
            <button
              onClick={() => {
                const text = `🎉 Allotted & Profit Booked in ${ipoName}!\n💰 Net Gain: +₹${profit.toLocaleString('en-IN')} (+${returnPct}% ROI)\n👤 Applicant: ${applicant}`;
                navigator.clipboard.writeText(text);
                toast.success('Text copied to clipboard!');
              }}
              className="btn-outline text-xs flex items-center gap-1.5 px-4"
              title="Copy text summary"
            >
              <Copy size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
