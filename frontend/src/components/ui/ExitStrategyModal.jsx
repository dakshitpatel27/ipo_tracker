import React, { useState } from 'react';
import { Target, TrendingDown, ShieldAlert, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExitStrategyModal({ isOpen, onClose, record }) {
  const [targetPrice, setTargetPrice] = useState(record?.targetPrice || '');
  const [stopLoss, setStopLoss] = useState(record?.stopLoss || '');

  if (!isOpen || !record) return null;

  const buyPrice = parseFloat(record.price) || 100;
  const targetVal = parseFloat(targetPrice) || (buyPrice * 1.35);
  const stopLossVal = parseFloat(stopLoss) || (buyPrice * 0.92);

  const potentialProfitPct = (((targetVal - buyPrice) / buyPrice) * 100).toFixed(1);
  const maxLossPct = (((buyPrice - stopLossVal) / buyPrice) * 100).toFixed(1);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success(`Exit strategy configured! Target: ₹${targetVal.toFixed(1)} (+${potentialProfitPct}%), Stop-Loss: ₹${stopLossVal.toFixed(1)} (-${maxLossPct}%)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Target size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Trailing Exit & Stop-Loss Strategy</h3>
              <p className="text-xs text-white/50">{record.ipoName} • Buy: ₹{buyPrice}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-emerald-400 mb-1">Target Exit Price (₹)</label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder={`e.g. ${(buyPrice * 1.35).toFixed(1)}`}
              className="w-full bg-[#141418] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-emerald-300/70 block mt-1">+ {potentialProfitPct}% Target Profit</span>
          </div>

          <div>
            <label className="block font-semibold text-rose-400 mb-1">Trailing Stop-Loss Price (₹)</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              placeholder={`e.g. ${(buyPrice * 0.92).toFixed(1)}`}
              className="w-full bg-[#141418] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-rose-400 focus:outline-none focus:border-rose-500"
            />
            <span className="text-[10px] text-rose-300/70 block mt-1">- {maxLossPct}% Max Allowed Drawdown</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button type="button" onClick={onClose} className="btn-outline text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs py-2.5 px-5 font-bold">Save Exit Plan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
