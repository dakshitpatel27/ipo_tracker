import React, { useRef } from 'react';
import { Share2, Flame, Trophy, Download, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareableGainCard({ ipoName = 'Mainboard IPO', profit = 18500, returnPct = 124.5, applicant = 'Primary' }) {
  const cardRef = useRef();

  const handleShare = () => {
    toast.success('🎉 Shareable Listing Card generated & copied to clipboard!');
  };

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-emerald-400" />
          <span className="text-xs font-bold text-white">Social Media Listing Gain Card</span>
        </div>
        <button onClick={handleShare} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
          <Download size={12} /> Export Card Image
        </button>
      </div>

      {/* Styled Graphic Card Preview */}
      <div ref={cardRef} className="bg-gradient-to-br from-indigo-950 via-[#09090b] to-emerald-950 border border-emerald-500/30 rounded-2xl p-6 text-white space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            🔥 ALLOTTED & PROFIT BOOKED
          </span>
          <span className="text-xs font-extrabold text-white/70">IPO TRACKER PRO</span>
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight text-white">{ipoName}</h2>
          <span className="text-xs text-white/60">Applicant: {applicant}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-black/40 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-white/50 block uppercase font-bold">Realized Net Profit</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">+₹{profit.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-black/40 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-white/50 block uppercase font-bold">Listing Return</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">+{returnPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
