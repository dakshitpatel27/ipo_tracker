import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Users, Award, TrendingUp, RefreshCw } from 'lucide-react';

export default function ApplicantHeatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getFamilyHeatmap();
      setHeatmapData(data || []);
    } catch (err) {
      console.error('Failed to load heatmap data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Family Allotment Win Rate Heatmap</h3>
            <p className="text-xs text-[var(--text-muted)]">Historical allotment success frequency & profits across family accounts</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-outline p-2 text-xs flex items-center gap-1"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-white/40 animate-pulse">Calculating family allotment frequencies...</div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-8 text-xs text-white/40">No family application history recorded yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heatmapData.map((item) => {
            const winRate = parseFloat(item.winRate) || 0;
            const badgeColor = winRate >= 50
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : winRate >= 20
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

            return (
              <div
                key={item.name}
                className="bg-[#09090b] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    <span className="text-[10px] text-white/50 block mt-0.5">{item.applied} Applied • {item.allotted} Allotted</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                    {winRate}% Win
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        winRate >= 50 ? 'bg-emerald-500' : winRate >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(5, winRate)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1 border-t border-white/5">
                  <span className="text-white/40">Total Realized Gain:</span>
                  <span className={`font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.profit >= 0 ? `+₹${item.profit.toLocaleString('en-IN')}` : `-₹${Math.abs(item.profit).toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
