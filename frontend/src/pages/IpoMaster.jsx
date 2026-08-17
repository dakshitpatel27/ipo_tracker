import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, Star, Scale, Send, Calculator, Bell, History } from 'lucide-react';
import CountdownBadge from '../components/ui/CountdownBadge';
import PageLoader from '../components/ui/PageLoader';
import CompareDrawer from '../components/ui/CompareDrawer';
import QuickApplyModal from '../components/ui/QuickApplyModal';
import InvestmentCalculator from '../components/ui/InvestmentCalculator';
import SubscriptionBar from '../components/ui/SubscriptionBar';
import GmpAlertModal from '../components/ui/GmpAlertModal';
import HistoricalIpoTable from '../components/ui/HistoricalIpoTable';
import AutomatedIpoFormModal from '../components/ui/AutomatedIpoFormModal';
import IpoScoreBadge from '../components/ui/IpoScoreBadge';
import AIProspectusSummarizer from '../components/ui/AIProspectusSummarizer';
import AnchorLockinTracker from '../components/ui/AnchorLockinTracker';
import LiveSubscriptionHeatmap from '../components/ui/LiveSubscriptionHeatmap';
import SmeMarketHub from '../components/ui/SmeMarketHub';
import AiIpoRating from '../components/ui/AiIpoRating';

// ─── Feature 6: GMP Sparkline ──────────────────────────────────
const GmpSparkline = ({ trends }) => {
  if (!trends || trends.length < 2) return null;

  const values = trends
    .slice(0, 10)
    .reverse()
    .map(t => parseFloat((t.gmp || '0').replace(/[^\d.-]/g, '')))
    .filter(v => !isNaN(v));

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 75, H = 24;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  const isRising = values[values.length - 1] >= values[0];
  const color = isRising ? '#22c55e' : '#ef4444';

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
      {isRising
        ? <TrendingUp size={11} className="text-emerald-400" />
        : <TrendingDown size={11} className="text-rose-400" />}
    </div>
  );
};

const IpoMaster = () => {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [statusFilter, setStatusFilter] = useState('LIVE');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeViewTab, setActiveViewTab] = useState('live'); // 'live' | 'historical'

  // Watchlist
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipo_watchlist') || '[]'); }
    catch { return []; }
  });
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  // Feature 1: Compare State
  const [compareIpos, setCompareIpos] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Feature 3: Alert State
  const [alertIpoName, setAlertIpoName] = useState(null);

  // Feature 5: Batch Apply State
  const [batchApplyIpo, setBatchApplyIpo] = useState(null);

  // Feature 7: Calculator State
  const [calcIpo, setCalcIpo] = useState(null);

  // Automated 2-Part Form State
  const [isAutoFormOpen, setIsAutoFormOpen] = useState(false);

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

  useEffect(() => {
    localStorage.setItem('ipo_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (ipoName) => {
    setWatchlist(prev =>
      prev.includes(ipoName) ? prev.filter(n => n !== ipoName) : [...prev, ipoName]
    );
  };

  const toggleCompare = (ipo) => {
    setCompareIpos(prev => {
      const exists = prev.some(item => item.name === ipo.name);
      if (exists) return prev.filter(item => item.name !== ipo.name);
      if (prev.length >= 3) return prev;
      return [...prev, ipo];
    });
  };

  const filteredIpos = useMemo(() => {
    return ipos.filter(ipo => {
      const ipoStatus = (ipo.status || '').toUpperCase();
      let matchStatus = statusFilter === 'ALL';
      if (!matchStatus) {
        if (statusFilter === 'LISTED') {
          matchStatus = ipoStatus === 'LISTED' || ipoStatus === 'CLOSED';
        } else {
          matchStatus = ipoStatus === statusFilter;
        }
      }
      const matchType = typeFilter === 'ALL' || (ipo.type && ipo.type.toUpperCase() === typeFilter.toUpperCase());
      const matchWatchlist = !showWatchlistOnly || watchlist.includes(ipo.name);
      return matchStatus && matchType && matchWatchlist;
    });
  }, [ipos, statusFilter, typeFilter, showWatchlistOnly, watchlist]);

  // Feature 6: Listed/Historical IPOs
  const historicalIpos = useMemo(() => {
    return ipos.filter(i => {
      const s = (i.status || '').toUpperCase();
      return s === 'LISTED' || s === 'CLOSED';
    });
  }, [ipos]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Live IPO Master & Market Desk</h1>
          <p className="page-subtitle">Real-time GMP, subscription metrics, and automated decision tools.</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Main Tab Switcher */}
          <div className="tab-switcher">
            <button
              onClick={() => setActiveViewTab('live')}
              className={`tab-item ${activeViewTab === 'live' ? 'active' : ''}`}
            >
              Live & Upcoming ({ipos.length})
            </button>
            <button
              onClick={() => setActiveViewTab('historical')}
              className={`tab-item flex items-center gap-1 ${activeViewTab === 'historical' ? 'active' : ''}`}
            >
              <History size={13} /> Historical Performance ({historicalIpos.length})
            </button>
          </div>

          {/* Automated 2-Part IPO Form Trigger */}
          <button
            onClick={() => setIsAutoFormOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-500/20 transition-all"
          >
            ⚡ Automated 2-Part Form
          </button>

          {/* Watchlist Toggle */}
          <button
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              showWatchlistOnly
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'btn-outline'
            }`}
          >
            <Star size={14} fill={showWatchlistOnly ? 'currentColor' : 'none'} />
            Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
          </button>

          {/* Feature 1: Compare Button */}
          {compareIpos.length > 0 && (
            <button
              onClick={() => setIsCompareOpen(true)}
              className="btn-primary flex items-center gap-1.5 animate-bounce"
            >
              <Scale size={14} /> Compare ({compareIpos.length})
            </button>
          )}

          {activeViewTab === 'live' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field py-1.5 px-2.5 text-xs w-auto"
              >
                <option value="ALL">All Status</option>
                <option value="LIVE">Live Now</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="LISTED">Listed / Closed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field py-1.5 px-2.5 text-xs w-auto"
              >
                <option value="ALL">All Types</option>
                <option value="MAINBOARD">Mainboard</option>
                <option value="SME">SME</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <PageLoader text="Fetching live market metrics..." />
        ) : activeViewTab === 'historical' ? (
          /* Feature 6: Historical Performance View */
          <div className="glass-card p-5">
            <HistoricalIpoTable listedIpos={historicalIpos} />
          </div>
        ) : (
          <div className="space-y-4">
            <LiveSubscriptionHeatmap />
            <AIProspectusSummarizer />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnchorLockinTracker />
              <SmeMarketHub />
            </div>

            {/* Live Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIpos.map(ipo => {
              const gmpTrends = ipo.greyMarketPremium?.gmpTrends || [];
              const gmpStr = gmpTrends?.[0]?.gmp;
              let gmp = gmpStr || 'N/A';
              let gmpPercent = '';
              const isPositive = gmpStr && !gmpStr.includes('-');
              const isNA = gmp === 'N/A';
              const isWatched = watchlist.includes(ipo.name);
              const isComparing = compareIpos.some(c => c.name === ipo.name);

              let smartTag = null;
              let expectedProfit = 0;
              let upperPrice = 0;
              let lotNum = 15;

              if (gmpStr && ipo.priceRange) {
                const gmpNum = parseFloat(gmpStr.replace(/[^\d.-]/g, ''));
                const priceParts = ipo.priceRange.split('–');
                upperPrice = parseFloat(priceParts[priceParts.length - 1].replace(/[^\d.]/g, '')) || 0;

                if (!isNaN(gmpNum) && upperPrice > 0) {
                  const pctNum = ((gmpNum / upperPrice) * 100);
                  gmpPercent = `${pctNum.toFixed(1)}%`;
                  if (!gmp.startsWith('₹')) gmp = `₹${gmp}`;

                  const lotStr = ipo.lotSize || ipo.lot;
                  lotNum = lotStr ? parseInt(lotStr.replace(/[^\d]/g, '')) : 15;
                  expectedProfit = Math.round(gmpNum * lotNum);

                  if (pctNum > 30) {
                    smartTag = { label: '💎 Strong Apply', color: 'badge-emerald' };
                  } else if (pctNum > 10) {
                    smartTag = { label: '👍 Moderate Apply', color: 'badge-indigo' };
                  } else if (pctNum > 0) {
                    smartTag = { label: '⚠️ High Risk', color: 'badge-amber' };
                  } else {
                    smartTag = { label: '⛔ Avoid', color: 'badge-rose' };
                  }
                }
              }

              const gmpColor = isNA ? 'text-zinc-400' : (isPositive ? 'text-emerald-400' : 'text-rose-400');
              const link = ipo.detailsUrl || ipo.url || '#';
              const ipoStatus = (ipo.status || '').toUpperCase();

              return (
                <motion.div
                  key={ipo.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card glass-card-hover p-5 flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Status & Compare Badge Header */}
                  <div className="flex items-center justify-between">
                    <span className={`badge ${
                      ipoStatus === 'LIVE' ? 'badge-emerald' :
                      ipoStatus === 'UPCOMING' ? 'badge-blue' :
                      'badge-gray'
                    }`}>
                      <span className="status-dot live" />
                      {ipo.status || 'Upcoming'}
                    </span>

                    <button
                      onClick={() => toggleCompare(ipo)}
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded border transition-all ${
                        isComparing
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-black/30 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      {isComparing ? '✓ Comparing' : '+ Compare'}
                    </button>
                  </div>

                  {/* Header: Title + Watchlist */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-[var(--text-primary)] truncate leading-tight">
                        {ipo.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)]">{ipo.type || 'Mainboard'}</span>
                        <IpoScoreBadge gmp={gmpStr} price={upperPrice} qibSub={ipo.subscription?.qib} retailSub={ipo.subscription?.retail} />
                        <AiIpoRating
                          ipoName={ipo.name}
                          gmp={gmpStr}
                          price={upperPrice}
                          subscriptionRetail={ipo.subscription?.retail}
                          subscriptionQib={ipo.subscription?.qib}
                          subscriptionNii={ipo.subscription?.nii}
                          sector={ipo.sector || ipo.category}
                        />
                        {smartTag && <span className={`badge ${smartTag.color}`}>{smartTag.label}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleWatchlist(ipo.name)}
                      className={`p-1.5 rounded transition-all shrink-0 ${
                        isWatched ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'
                      }`}
                      title={isWatched ? 'Starred' : 'Add to Watchlist'}
                    >
                      <Star size={16} fill={isWatched ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Countdown badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {ipoStatus === 'LIVE' && ipo.schedule?.endDate && (
                      <CountdownBadge targetDate={ipo.schedule.endDate} label="Closes" variant="close" />
                    )}
                    {ipoStatus === 'UPCOMING' && ipo.schedule?.startDate && (
                      <CountdownBadge targetDate={ipo.schedule.startDate} label="Opens" variant="open" />
                    )}
                    {ipo.schedule?.listingDate && (
                      <CountdownBadge targetDate={ipo.schedule.listingDate} label="Lists" variant="listing" />
                    )}
                  </div>

                  {/* Pricing & GMP Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-2 border border-[var(--border)] text-xs">
                    <div>
                      <span className="section-label">Price Band</span>
                      <div className="font-mono text-[var(--text-primary)] font-semibold mt-0.5">{ipo.priceRange || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="section-label">Lot Size</span>
                      <div className="font-mono text-[var(--text-primary)] font-semibold mt-0.5">{ipo.lotSize || ipo.lot || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="section-label">Dates</span>
                      <div className="text-[0.7rem] text-[var(--text-secondary)] mt-0.5">
                        {ipo.schedule?.startDate || '—'} to {ipo.schedule?.endDate || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="section-label">Live GMP</span>
                      <div className={`font-mono font-bold text-sm flex items-center gap-1 ${gmpColor}`}>
                        {gmp}
                        {gmpPercent && <span className="text-[10px] opacity-80">({gmpPercent})</span>}
                      </div>
                      <GmpSparkline trends={gmpTrends} />
                    </div>
                  </div>

                  {/* Feature 8: Subscription Live Bars */}
                  <SubscriptionBar subscription={ipo.subscription || { overall: ipo.subscriptionRatio }} />

                  {/* Quick Tool Actions Row */}
                  <div className="pt-3 border-t border-[var(--border)] mt-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {/* Feature 5: Batch Apply */}
                      <button
                        onClick={() => setBatchApplyIpo(ipo)}
                        className="btn-outline px-2.5 py-1 text-xs flex items-center gap-1"
                        title="Apply across family applicants"
                      >
                        <Send size={12} /> Apply All
                      </button>

                      {/* Feature 7: Calculator */}
                      <button
                        onClick={() => setCalcIpo({ price: upperPrice || 100, lotSize: lotNum, gmp: parseFloat(gmpStr?.replace(/[^\d.-]/g, '')) || 0 })}
                        className="btn-ghost p-1.5 text-zinc-400 hover:text-white"
                        title="Investment Simulator"
                      >
                        <Calculator size={14} />
                      </button>

                      {/* Feature 3: GMP Alert */}
                      <button
                        onClick={() => setAlertIpoName(ipo.name)}
                        className="btn-ghost p-1.5 text-zinc-400 hover:text-indigo-400"
                        title="Set GMP Alert"
                      >
                        <Bell size={14} />
                      </button>
                    </div>

                    {link !== '#' && (
                      <a href={link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-[0.7rem] font-bold flex items-center gap-1">
                        Details <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {filteredIpos.length === 0 && (
              <div className="col-span-full text-center text-[var(--text-muted)] py-16">
                No IPOs found matching the criteria.
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Feature Modals & Drawers */}
      <CompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        ipos={compareIpos}
      />

      <QuickApplyModal
        isOpen={!!batchApplyIpo}
        onClose={() => setBatchApplyIpo(null)}
        ipo={batchApplyIpo}
      />

      <InvestmentCalculator
        isOpen={!!calcIpo}
        onClose={() => setCalcIpo(null)}
        defaultPrice={calcIpo?.price}
        defaultLotSize={calcIpo?.lotSize}
        defaultGmp={calcIpo?.gmp}
      />

      <GmpAlertModal
        isOpen={!!alertIpoName}
        onClose={() => setAlertIpoName(null)}
        defaultIpoName={alertIpoName || ''}
      />

      <AutomatedIpoFormModal
        isOpen={isAutoFormOpen}
        onClose={() => setIsAutoFormOpen(false)}
      />
    </div>
  );
};

export default IpoMaster;

