import React, { useState } from 'react';
import { Wallet, Calendar, Users, AlertCircle, ArrowUpRight, DollarSign } from 'lucide-react';

export default function FundReservePlanner({ applicantsCount = 3, openIpos = [] }) {
  const [selectedApplicants, setSelectedApplicants] = useState(applicantsCount || 3);
  const [selectedIpos, setSelectedIpos] = useState([
    { name: 'Mainboard IPO A', lotPrice: 14950, closeDate: '2026-08-14' },
    { name: 'Mainboard IPO B', lotPrice: 14800, closeDate: '2026-08-18' }
  ]);

  const totalRequiredLiquidity = selectedIpos.reduce((sum, ipo) => sum + (ipo.lotPrice * selectedApplicants), 0);

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-6 space-y-6 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Family Fund Reserve & Liquidity Planner</h3>
            <p className="text-xs text-zinc-400">Calculate total ASBA capital required across all family members (14-Day Horizon)</p>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">Total Capital Mandate</span>
          <span className="text-lg font-bold text-amber-400">₹{totalRequiredLiquidity.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 space-y-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Users size={14} className="text-indigo-400" /> Family Bidders</span>
          <select 
            value={selectedApplicants} 
            onChange={e => setSelectedApplicants(parseInt(e.target.value))}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num} Applicant(s)</option>
            ))}
          </select>
          <span className="text-[10px] text-zinc-500 block">Funds locked in bank accounts during ASBA</span>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 space-y-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Calendar size={14} className="text-emerald-400" /> Bidding Windows</span>
          <div className="text-sm font-bold text-white font-mono">{selectedIpos.length} Upcoming IPOs</div>
          <span className="text-[10px] text-zinc-500 block">Next 14 business days</span>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 space-y-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-400" /> Avg Reserve / Applicant</span>
          <div className="text-sm font-bold text-amber-400 font-mono">
            ₹{(selectedApplicants > 0 ? totalRequiredLiquidity / selectedApplicants : 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-zinc-500 block">Per bank account minimum balance</span>
        </div>
      </div>

      {/* Bidding Items Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Scheduled Bidding Windows & Capital Breakdown</h4>
        <div className="space-y-2">
          {selectedIpos.map((ipo, idx) => (
            <div key={idx} className="p-3.5 bg-[#141418] border border-[#27272a] rounded-xl flex items-center justify-between gap-4 text-xs">
              <div>
                <span className="font-bold text-white block text-sm">{ipo.name}</span>
                <span className="text-zinc-400 text-[10px]">Closes: {ipo.closeDate} • Single Lot: ₹{ipo.lotPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-zinc-400 block text-[10px]">{selectedApplicants} Lots (1 per Applicant)</span>
                <span className="font-bold text-emerald-400 text-sm">₹{(ipo.lotPrice * selectedApplicants).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
