import React, { useEffect, useRef } from 'react';
import Modal from './Modal';
import { Trophy, Download, Share2, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const AllotmentVictoryModal = ({ isOpen, onClose, record }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Trigger Confetti Celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!record) return null;

  const sharesCount = Number(record.shares || 1);
  const priceVal = Number(record.price || 0);
  const gmpVal = Number(record.gmp || 0);
  const estimatedProfit = gmpVal > 0 ? (sharesCount * gmpVal) : (priceVal * 0.15 * sharesCount);
  const formattedProfit = Math.round(estimatedProfit).toLocaleString('en-IN');

  // HTML5 Canvas Card Renderer
  const handleDownloadPNGCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 380);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.5, '#13131c');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 380);

    // Outer Glow Border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 580, 360);

    // Title Badge
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🎉 ALLOTMENT VICTORY', 40, 50);

    // IPO Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(record.ipoName || 'IPO Application', 40, 95);

    // Line Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 115);
    ctx.lineTo(560, 115);
    ctx.stroke();

    // Details Grid
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '12px sans-serif';
    ctx.fillText('APPLICANT / PAN', 40, 150);
    ctx.fillText('SHARES ALLOTTED', 220, 150);
    ctx.fillText('GMP / EXPECTED GAIN', 400, 150);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(record.applicantName || record.pan || 'Family Account'), 40, 175);
    ctx.fillText(`${sharesCount} Shares`, 220, 175);
    ctx.fillText(`+₹${gmpVal} / Share`, 400, 175);

    // Profit Box
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(40, 210, 520, 90);
    ctx.strokeRect(40, 210, 520, 90);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ESTIMATED LISTING DAY PROFIT', 60, 240);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`+₹${formattedProfit}`, 60, 280);

    // Footer Watermark
    ctx.fillStyle = '#818cf8';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText('Tracked & Managed with IPO Tracker Terminal Pro', 40, 345);

    // Trigger PNG Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${record.ipoName}_Allotment_Victory.png`;
    a.click();
    toast.success('🎉 Victory Card downloaded as PNG!');
  };

  const handleShareWhatsApp = () => {
    const text = `🎉 ALLOTTED in ${record.ipoName}!\n👤 Applicant: ${record.applicantName || record.pan || 'Family Account'}\n📦 Shares: ${sharesCount}\n🚀 Expected Profit: +₹${formattedProfit}\n\nTracked with IPO Tracker Terminal Pro 📈`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎉 Allotment Victory Celebration!">
      <div className="space-y-6 text-center py-2">

        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-pulse">
            <Trophy size={42} />
          </div>
          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
            <Sparkles size={10} /> WINNER
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{record.ipoName}</h2>
          <p className="text-xs text-secondary mt-1">
            Congratulations! Allotment confirmed for <strong className="text-white font-mono">{record.applicantName || record.pan || 'Family Profile'}</strong>.
          </p>
        </div>

        {/* Victory Card Preview Widget */}
        <div className="bg-gradient-to-br from-[#0c0c14] to-[#161624] border border-emerald-500/30 rounded-2xl p-5 text-left space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-border/50 pb-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Allotment Confirmed
            </div>
            <span className="text-xs font-mono text-zinc-400">{sharesCount} Shares Allotted</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase block">Cut-Off Price</span>
              <span className="text-sm font-bold text-white font-mono">₹{priceVal}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase block">GMP / Premium</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">+₹{gmpVal}</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-emerald-300 uppercase block">Expected Listing Gain</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">+₹{formattedProfit}</span>
            </div>
            <ArrowUpRight size={28} className="text-emerald-400" />
          </div>
        </div>

        {/* Sharing Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadPNGCard}
            className="btn-primary py-2.5 text-xs flex items-center justify-center gap-2 font-bold bg-indigo-600 hover:bg-indigo-500"
          >
            <Download size={15} /> Download Card (PNG)
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="btn-primary py-2.5 text-xs flex items-center justify-center gap-2 font-bold bg-emerald-600 hover:bg-emerald-500"
          >
            <Share2 size={15} /> Share on WhatsApp
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default AllotmentVictoryModal;
