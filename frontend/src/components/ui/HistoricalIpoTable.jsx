import React, { useState } from 'react';
import { Search, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

const parsePrices = (ipo) => {
  let issuePrice = 0;
  const priceStr = ipo.priceRange || ipo.priceBand || ipo.offerPrice || (ipo.price ? String(ipo.price) : '');
  const numbers = priceStr.match(/\d+(?:\.\d+)?/g) || [];
  if (numbers.length >= 2) {
    issuePrice = parseFloat(numbers[numbers.length - 1]);
  } else if (numbers.length === 1) {
    issuePrice = parseFloat(numbers[0]);
  } else if (ipo.price) {
    issuePrice = parseFloat(ipo.price) || 0;
  }

  let listingPrice = 0;
  if (ipo.listingPrice && !isNaN(parseFloat(ipo.listingPrice)) && parseFloat(ipo.listingPrice) > 0) {
    listingPrice = parseFloat(ipo.listingPrice);
  } else {
    const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp || ipo.gmp || '';
    const gmpNum = parseFloat(String(gmpStr).replace(/[^\d.-]/g, ''));
    if (!isNaN(gmpNum) && gmpNum !== 0 && issuePrice > 0) {
      listingPrice = issuePrice + gmpNum;
    } else {
      listingPrice = issuePrice;
    }
  }

  return { issuePrice, listingPrice };
};

export default function HistoricalIpoTable({ listedIpos = [] }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('listingGain');
  const [sortOrder, setSortOrder] = useState('desc');

  const filtered = listedIpos.filter(ipo =>
    ipo.name?.toLowerCase().includes(search.toLowerCase()) ||
    ipo.symbol?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'listingGain') {
      const { issuePrice: ipA, listingPrice: lpA } = parsePrices(a);
      valA = ipA > 0 ? ((lpA - ipA) / ipA) * 100 : 0;

      const { issuePrice: ipB, listingPrice: lpB } = parsePrices(b);
      valB = ipB > 0 ? ((lpB - ipB) / ipB) * 100 : 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search past IPOs..."
            className="input-field pl-8 text-xs"
          />
        </div>
        <span className="text-xs text-[var(--text-muted)] font-mono">{sorted.length} listed IPOs</span>
      </div>

      {/* Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="cursor-pointer" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">IPO Name <ArrowUpDown size={11} /></div>
              </th>
              <th>Category</th>
              <th className="cursor-pointer" onClick={() => toggleSort('issuePrice')}>
                <div className="flex items-center gap-1">Issue Price <ArrowUpDown size={11} /></div>
              </th>
              <th className="cursor-pointer" onClick={() => toggleSort('listingPrice')}>
                <div className="flex items-center gap-1">Listing Price <ArrowUpDown size={11} /></div>
              </th>
              <th className="cursor-pointer" onClick={() => toggleSort('listingGain')}>
                <div className="flex items-center gap-1">Listing Day Gain % <ArrowUpDown size={11} /></div>
              </th>
              <th>Listing Date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                  No historical IPO data matching search.
                </td>
              </tr>
            ) : (
              sorted.map((ipo, idx) => {
                const { issuePrice, listingPrice } = parsePrices(ipo);
                const gainPct = issuePrice > 0 ? (((listingPrice - issuePrice) / issuePrice) * 100).toFixed(1) : (ipo.listingGain || '0.0');
                const isPositive = parseFloat(gainPct) >= 0;

                return (
                  <tr key={idx}>
                    <td className="font-semibold text-white">
                      <div>{ipo.name}</div>
                      <div className="text-[0.68rem] text-[var(--text-muted)] font-mono">{ipo.symbol || ipo.bseCode || ipo.nseCode || 'BSE/NSE'}</div>
                    </td>
                    <td>
                      <span className="text-[0.7rem] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                        {ipo.type || ipo.category || 'Mainboard'}
                      </span>
                    </td>
                    <td className="font-mono text-zinc-300">
                      {issuePrice > 0 ? `₹${issuePrice}` : '—'}
                    </td>
                    <td className="font-mono text-zinc-200">
                      {listingPrice > 0 ? `₹${listingPrice}` : (issuePrice > 0 ? `₹${issuePrice}` : '—')}
                    </td>
                    <td>
                      <div className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded border ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? `+${gainPct}%` : `${gainPct}%`}
                      </div>
                    </td>
                    <td className="font-mono text-xs text-zinc-400">{ipo.listingDate || ipo.closeDate || 'Listed'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
