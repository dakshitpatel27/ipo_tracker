import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp } from 'lucide-react';

const IpoMaster = () => {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('LIVE');
  const [typeFilter, setTypeFilter] = useState('MAINBOARD');

  useEffect(() => {
    async function fetchIpos() {
      try {
        const res = await fetch('https://finapi.upvaly.com/api/ipo');
        const json = await res.json();
        if (json.status === 'success') {
          setIpos(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIpos();
  }, []);

  const filteredIpos = useMemo(() => {
    return ipos.filter(ipo => {
      const matchStatus = statusFilter === 'ALL' || (ipo.status && ipo.status.toUpperCase() === statusFilter);
      const matchType = typeFilter === 'ALL' || (ipo.type && ipo.type.toUpperCase() === typeFilter.toUpperCase());
      return matchStatus && matchType;
    });
  }, [ipos, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Live IPO Master</h1>
          <p className="text-sm text-secondary">Real-time upcoming IPOs and GMP fetched from FinAPI.</p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-3">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field appearance-none bg-black/40 py-1.5 px-3 text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="LIVE">Live</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="LISTED">Listed / Closed</option>
          </select>

          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field appearance-none bg-black/40 py-1.5 px-3 text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="MAINBOARD">Mainboard</option>
            <option value="SME">SME</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? <div className="text-center text-emerald-500 py-10">Fetching live market data...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIpos.map(ipo => {
              const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp;
              let gmp = gmpStr || 'N/A';
              let gmpPercent = '';
              const isPositive = gmpStr && !gmpStr.includes('-');
              const isNA = gmp === 'N/A';
              
              let smartTag = null;
              let expectedProfit = 0;
              if (gmpStr && ipo.priceRange) {
                const gmpNum = parseFloat(gmpStr.replace(/[^\d.-]/g, ''));
                const priceParts = ipo.priceRange.split('–');
                const upperPrice = parseFloat(priceParts[priceParts.length - 1].replace(/[^\d.]/g, ''));
                
                if (!isNaN(gmpNum) && !isNaN(upperPrice) && upperPrice > 0) {
                  const pctNum = ((gmpNum / upperPrice) * 100);
                  gmpPercent = `(${pctNum.toFixed(1)}%)`;
                  if (!gmp.startsWith('₹')) gmp = `₹${gmp}`;

                  // Compute expected profit
                  const lotStr = ipo.lotSize || ipo.lot;
                  const lotNum = lotStr ? parseInt(lotStr.replace(/[^\d]/g, '')) : NaN;
                  if (!isNaN(lotNum)) {
                    expectedProfit = Math.round(gmpNum * lotNum);
                  }

                  // Determine Smart Tag
                  if (pctNum > 30) {
                    smartTag = { label: '💎 Strong Apply', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
                  } else if (pctNum > 10) {
                    smartTag = { label: '👍 Apply', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
                  } else if (pctNum > 0) {
                    smartTag = { label: '⚠️ Risky', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
                  } else {
                    smartTag = { label: '⛔ Avoid', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
                  }
                }
              }

              const gmpColor = isNA ? 'text-gray-400' : (isPositive ? 'text-emerald-400' : 'text-rose-400');
              const link = ipo.detailsUrl || ipo.url || '#';

              return (
                <motion.div 
                  key={ipo.name} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 p-2 text-xs font-bold rounded-bl-lg ${
                    ipo.status?.toUpperCase() === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 
                    ipo.status?.toUpperCase() === 'UPCOMING' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ipo.status || 'Upcoming'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white pr-16 flex flex-wrap items-center gap-2">
                      {ipo.name}
                      {smartTag && (
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${smartTag.color}`}>
                          {smartTag.label}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">{ipo.type || 'Mainboard'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-secondary text-xs uppercase">Price Band</p>
                      <p className="font-medium text-gray-200">{ipo.priceRange || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-secondary text-xs uppercase">Lot Size</p>
                      <p className="font-medium text-gray-200">{ipo.lotSize || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-secondary text-xs uppercase">Open - Close</p>
                      <p className="font-medium text-gray-200 text-xs">
                        {ipo.schedule?.startDate || '-'} to {ipo.schedule?.endDate || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary text-xs uppercase flex items-center gap-1">
                        GMP 
                        {expectedProfit > 0 && <span className="text-emerald-400 font-bold ml-1">+₹{expectedProfit.toLocaleString()}</span>}
                        {expectedProfit < 0 && <span className="text-rose-400 font-bold ml-1">-₹{Math.abs(expectedProfit).toLocaleString()}</span>}
                      </p>
                      <p className={`font-bold flex items-center gap-1 ${gmpColor}`}>
                        {!isNA && <TrendingUp size={14} />} 
                        {gmp} 
                        {gmpPercent && <span className="text-[11px] opacity-80">{gmpPercent}</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border mt-auto flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-secondary uppercase">Subscription: <span className="text-emerald-400 ml-1">{ipo.subscriptionNumbers?.total?.subscription || ipo.subscription?.total || 'N/A'}</span></p>
                      {link !== '#' && (
                        <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">
                          Details <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                      <div className="bg-black/20 border border-white/5 rounded py-1.5">
                        <p className="text-secondary font-medium mb-0.5">QIB</p>
                        <p className="text-gray-200 font-bold">{ipo.subscriptionNumbers?.institutional?.subscription || ipo.subscription?.qib || '-'}</p>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded py-1.5">
                        <p className="text-secondary font-medium mb-0.5">NII</p>
                        <p className="text-gray-200 font-bold">{ipo.subscriptionNumbers?.nii?.subscription || ipo.subscription?.nii || '-'}</p>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded py-1.5">
                        <p className="text-secondary font-medium mb-0.5">RETAIL</p>
                        <p className="text-gray-200 font-bold">{ipo.subscriptionNumbers?.retail?.subscription || ipo.subscription?.retail || '-'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {filteredIpos.length === 0 && (
              <div className="col-span-full text-center text-secondary py-10">
                No IPOs match the selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IpoMaster;
