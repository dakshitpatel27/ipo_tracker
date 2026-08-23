import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const DEFAULT_FORM = {
  ipoName: '',
  applicantName: '',
  quota: 'Retail',
  listingDate: '',
  lotSize: '',
  shares: '',
  price: '',
  gmp: '',
  listingPrice: '',
  amount: '',
  applied: 'Pending',
  alloted: '',
  profit: '',
  notes: '',
  holdingStatus: 'Holding',
  sellDate: '',
  sellPrice: '',
  registrar: '',
  dematId: '',
  bankAccount: '',
  ifscCode: '',
  bankAccountId: '',
};

const getChargesBreakdown = (data) => {
  const price = parseFloat(data.price) || 0;
  const shares = parseFloat(data.shares) || 0;
  const sellPrice = parseFloat(data.sellPrice) || 0;
  const listingPrice = parseFloat(data.listingPrice) || 0;
  const gmp = parseFloat(data.gmp) || 0;
  const status = data.holdingStatus;

  const buyValue = price * shares;
  const sellValue = sellPrice * shares;

  const stampDuty = buyValue * 0.00005;
  let brokerage = 0, stt = 0, exchange = 0, sebi = 0, dp = 0, gst = 0;

  if (status === 'Sold' && sellPrice > 0) {
    brokerage = 20;
    stt = sellValue * 0.001;
    exchange = sellValue * 0.0000345;
    sebi = sellValue * 0.000001;
    dp = 13.50;
    gst = (brokerage + exchange + sebi + dp) * 0.18;
  }

  const totalCharges = stampDuty + brokerage + stt + exchange + sebi + dp + gst;

  let gross = 0;
  if (status === 'Sold' && sellPrice > 0) {
    gross = (sellPrice - price) * shares;
  } else if (listingPrice > 0) {
    gross = (listingPrice - price) * shares;
  } else if (gmp > 0) {
    gross = gmp * shares;
  }
  
  const net = gross - totalCharges;

  return {
    stampDuty: stampDuty.toFixed(2),
    brokerage: brokerage.toFixed(2),
    stt: stt.toFixed(2),
    exchange: exchange.toFixed(2),
    sebi: sebi.toFixed(2),
    dp: dp.toFixed(2),
    gst: gst.toFixed(2),
    total: totalCharges.toFixed(2),
    gross: gross.toFixed(2),
    net: net.toFixed(2)
  };
};

const IpoForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const [applicants, setApplicants] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingFinAPI, setLoadingFinAPI] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  useEffect(() => {
    async function checkPanDuplicate() {
      if (formData.pan && formData.ipoName && !initialData) {
        try {
          const res = await api.checkDuplicatePan(formData.pan, formData.ipoName);
          if (res.isDuplicate) {
            setDuplicateWarning(`⚠️ Duplicate Application Alert: PAN ${formData.pan.toUpperCase()} has already applied for "${formData.ipoName}". NSDL/CDSL will auto-reject multiple applications under the same PAN.`);
          } else {
            setDuplicateWarning(null);
          }
        } catch (e) {
          setDuplicateWarning(null);
        }
      } else {
        setDuplicateWarning(null);
      }
    }
    checkPanDuplicate();
  }, [formData.pan, formData.ipoName, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...DEFAULT_FORM, ...initialData });
    }
  }, [initialData]);

  useEffect(() => {
    async function loadApplicants() {
      try {
        const data = await api.getApplicants();
        if (data) {
          setApplicants(data);
        }
      } catch(err) {
        console.error('Failed to load applicants:', err);
      }
    }
    async function loadBankAccounts() {
      try {
        const data = await api.getBankAccounts();
        if (data) setBankAccounts(data);
      } catch(err) {
        console.error('Failed to load bank accounts:', err);
      }
    }
    loadApplicants();
    loadBankAccounts();
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // If applicant changes, auto-fill pan, upi, demat, bank details
      if (name === 'applicantName') {
        const found = applicants.find(a => a.name === value);
        if (found) {
          next.pan = found.pan || '';
          next.upiId = found.upiId || '';
          next.dematId = found.dematId || '';
          next.bankAccount = found.bankAccount || '';
          next.ifscCode = found.ifscCode || '';
        }
      }
      
      // Auto-calculations
      const shares = parseFloat(next.shares) || 0;
      const price = parseFloat(next.price) || 0;
      const amount = shares * price;
      next.amount = amount > 0 ? amount.toFixed(2) : '';

      const listingPrice = parseFloat(next.listingPrice) || 0;
      const alloted = parseFloat(next.alloted) || 0;
      const gmp = parseFloat(next.gmp) || 0;

      const sellPrice = parseFloat(next.sellPrice) || 0;

      if (next.holdingStatus === 'Sold' && sellPrice > 0 && price > 0) {
        const calcShares = alloted > 0 ? alloted : shares;
        next.profit = ((sellPrice - price) * calcShares).toFixed(2);
      } else if (listingPrice > 0 && price > 0) {
        const calcShares = alloted > 0 ? alloted : shares;
        next.profit = ((listingPrice - price) * calcShares).toFixed(2);
      } else if (price > 0 && gmp > 0) {
        const calcShares = alloted > 0 ? alloted : shares;
        next.profit = (gmp * calcShares).toFixed(2);
      }

      return next;
    });
  };

  const handleAutoFill = async () => {
    if (!formData.ipoName) {
      toast.error("Please enter an IPO name to search.");
      return;
    }
    setLoadingFinAPI(true);
    try {
      const res = await fetch('https://finapi.upvaly.com/api/ipo');
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.data)) {
        throw new Error('Invalid API response');
      }
      
      const searchName = formData.ipoName.toLowerCase();
      const match = json.data.find(item => 
        (item.name && item.name.toLowerCase().includes(searchName)) || 
        (item.symbol && item.symbol.toLowerCase().includes(searchName))
      );

      if (match) {
        let priceVal = formData.price;
        if (match.priceRange) {
          const parts = match.priceRange.split('–');
          priceVal = parts.pop().replace(/[^\d.]/g, '').trim();
        }

        let gmpVal = formData.gmp;
        if (match.greyMarketPremium && match.greyMarketPremium.gmpTrends && match.greyMarketPremium.gmpTrends.length > 0) {
          gmpVal = match.greyMarketPremium.gmpTrends[0].gmp.replace(/[^\d.]/g, '').trim();
        }

        const listDate = match.schedule && match.schedule.listingDate ? match.schedule.listingDate : formData.listingDate;
        const lotSize = match.lotSize || formData.lotSize;

        setFormData(prev => {
          const next = {
            ...prev,
            price: priceVal,
            gmp: gmpVal,
            listingDate: listDate,
            lotSize: lotSize
          };
          
          const shares = parseFloat(next.shares) || 0;
          const p = parseFloat(next.price) || 0;
          if (shares && p) next.amount = (shares * p).toFixed(2);
          
          return next;
        });
        toast.success("Auto-filled IPO details");
      } else {
        toast.error("No matching IPO found on FinAPI. Try a shorter name.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to auto-fill data: " + error.message);
    } finally {
      setLoadingFinAPI(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ipoName || !formData.applicantName) {
      toast.error("IPO Name and Applicant Name are required");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1 */}
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">IPO Name *</label>
          <div className="flex gap-2">
            <input 
              name="ipoName" 
              value={formData.ipoName} 
              onChange={handleChange} 
              className="input-field flex-1" 
              placeholder="e.g. Tata Technologies"
              required 
            />
            <button 
              type="button" 
              onClick={handleAutoFill} 
              disabled={loadingFinAPI}
              className="btn-outline flex items-center gap-2 whitespace-nowrap"
            >
              {loadingFinAPI ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Auto-Fill
            </button>
          </div>
        </div>

        {duplicateWarning && (
          <div className="col-span-1 md:col-span-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Row 2 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Applicant Name *</label>
          <select name="applicantName" value={formData.applicantName} onChange={handleChange} className="input-field appearance-none bg-black/40" required>
            <option value="" disabled>Select an Applicant</option>
            {applicants.map(app => (
              <option key={app.id} value={app.name}>{app.name} ({app.pan || 'No PAN'})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Quota</label>
          <select name="quota" value={formData.quota} onChange={handleChange} className="input-field">
            <option value="Retail">Retail</option>
            <option value="sHNI">sHNI</option>
            <option value="bHNI">bHNI</option>
            <option value="Shareholder">Shareholder</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        {/* Bank Account Selection */}
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Wallet size={12} className="text-indigo-400" /> Bank Account (for balance tracking)
          </label>
          <select name="bankAccountId" value={formData.bankAccountId || ''} onChange={handleChange} className="input-field appearance-none bg-black/40">
            <option value="">— No Account Linked —</option>
            {bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} ({acc.bankName}) — ₹{parseFloat(acc.balance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </option>
            ))}
          </select>
          {formData.bankAccountId && (() => {
            const selectedAcc = bankAccounts.find(a => a.id === formData.bankAccountId);
            if (!selectedAcc) return null;
            const bal = parseFloat(selectedAcc.balance) || 0;
            const amt = parseFloat(formData.amount) || 0;
            const isLow = amt > 0 && amt > bal;
            return (
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
                isLow 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {isLow ? <AlertTriangle size={12} /> : <Wallet size={12} />}
                <span className="font-semibold">Available: ₹{bal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                {isLow && <span className="text-[10px]">• IPO amount exceeds balance!</span>}
              </div>
            );
          })()}
        </div>

        {/* Row 3 - Lots, Price (Read-Only), Shares & Amount */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Lots Applied *</span>
          </label>
          <input
            name="lots"
            type="number"
            min="1"
            max="100"
            value={formData.lots || 1}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
              const ls = parseFloat(formData.lotSize) || 1;
              const p = parseFloat(formData.price) || 0;
              const calcShares = val * ls;
              const calcAmt = calcShares * p;
              setFormData(prev => ({
                ...prev,
                lots: val,
                shares: calcShares,
                amount: calcAmt > 0 ? calcAmt.toFixed(2) : ''
              }));
            }}
            className="input-field font-mono font-bold text-white"
            placeholder="1"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
            <span>Share Price (API Read-Only)</span>
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            readOnly={!!formData.price}
            className={`input-field font-mono ${formData.price ? 'bg-black/50 text-emerald-400 font-bold cursor-not-allowed border-emerald-500/30' : ''}`}
            placeholder="Fetched from API"
          />
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">
            Total Shares ({formData.lots || 1} Lot × {formData.lotSize || 1} shares)
          </label>
          <input
            name="shares"
            type="number"
            value={formData.shares}
            onChange={handleChange}
            readOnly
            className="input-field bg-black/40 text-gray-300 font-mono"
            placeholder="Auto-calculated"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Total Amount (₹)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            readOnly
            className="input-field bg-black/50 text-emerald-400 font-extrabold font-mono"
            placeholder="Auto-calculated"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Application Status</label>
          <select name="applied" value={formData.applied} onChange={handleChange} className="input-field">
            <option value="Pending">Pending</option>
            <option value="Yes">Applied</option>
            <option value="No">Not Applied</option>
          </select>
        </div>

        {/* Row 5 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Expected GMP (₹)</label>
          <input name="gmp" type="number" step="0.01" value={formData.gmp} onChange={handleChange} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Listing Date</label>
          <input name="listingDate" type="date" value={formData.listingDate} onChange={handleChange} className="input-field" />
        </div>
        
        {/* Row 6 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Alloted Shares</label>
          <input name="alloted" type="number" value={formData.alloted} onChange={handleChange} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Listing Price (₹)</label>
          <input name="listingPrice" type="number" step="0.01" value={formData.listingPrice} onChange={handleChange} className="input-field" />
        </div>
        
        {/* Row 7 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Holding Status</label>
          <select name="holdingStatus" value={formData.holdingStatus} onChange={handleChange} className="input-field">
            <option value="Holding">Holding / Not Listed</option>
            <option value="Sold">Sold</option>
          </select>
        </div>
        
        {/* Feature 5: Registrar */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Registrar</label>
          <select name="registrar" value={formData.registrar || ''} onChange={handleChange} className="input-field">
            <option value="">-- Select Registrar --</option>
            <option value="KFintech">KFintech (Karvy)</option>
            <option value="LinkIntime">Link Intime</option>
            <option value="Bigshare">Bigshare Services</option>
            <option value="MUFG">MUFG Intime India</option>
            <option value="Skyline">Skyline Financial</option>
            <option value="Cameo">Cameo Corporate</option>
          </select>
        </div>

        {formData.holdingStatus === 'Sold' ? (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Sell Date</label>
              <input name="sellDate" type="date" value={formData.sellDate} onChange={handleChange} className="input-field border-amber-500/30" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Sell Price (₹)</label>
              <input name="sellPrice" type="number" step="0.01" value={formData.sellPrice} onChange={handleChange} className="input-field border-amber-500/30" />
            </div>
          </>
        ) : (
          <div className="space-y-2"></div>
        )}
        

        {/* Row 8 */}
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Expected/Actual Profit (₹)</label>
          <input name="profit" type="number" step="0.01" value={formData.profit} onChange={handleChange} className="input-field bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/30" />
        </div>
      </div>

      {/* Charges & Net Profit Breakdown Panel */}
      {(parseFloat(formData.price) > 0 && parseFloat(formData.shares) > 0) && (() => {
        const breakdown = getChargesBreakdown(formData);
        return (
          <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3 mt-4">
            <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Charges & Net Profit Estimate</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-secondary">Gross Profit</p>
                <p className="font-semibold text-white">₹{parseFloat(breakdown.gross).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-secondary">Stamp Duty (Buy)</p>
                <p className="text-gray-300 font-mono">₹{breakdown.stampDuty}</p>
              </div>
              {formData.holdingStatus === 'Sold' && (
                <>
                  <div>
                    <p className="text-secondary">Brokerage</p>
                    <p className="text-gray-300 font-mono">₹{breakdown.brokerage}</p>
                  </div>
                  <div>
                    <p className="text-secondary">STT (Sell)</p>
                    <p className="text-gray-300 font-mono">₹{breakdown.stt}</p>
                  </div>
                  <div>
                    <p className="text-secondary">Exchange / SEBI</p>
                    <p className="text-gray-300 font-mono">₹{(parseFloat(breakdown.exchange) + parseFloat(breakdown.sebi)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-secondary">DP Charges</p>
                    <p className="text-gray-300 font-mono">₹{breakdown.dp}</p>
                  </div>
                  <div>
                    <p className="text-secondary">GST (18%)</p>
                    <p className="text-gray-300 font-mono">₹{breakdown.gst}</p>
                  </div>
                </>
              )}
              <div className="col-span-2 md:col-span-1 bg-black/20 p-2 rounded-lg border border-border/50">
                <p className="text-secondary font-medium">Total Charges</p>
                <p className="text-rose-400 font-bold font-mono">₹{breakdown.total}</p>
              </div>
              <div className="col-span-2 md:col-span-1 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <p className="text-emerald-400 font-semibold">Net Profit</p>
                <p className="text-emerald-400 font-extrabold font-mono text-sm">₹{parseFloat(breakdown.net).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
        <button type="submit" className="btn-primary">Save Record</button>
      </div>
    </form>
  );
};

export default IpoForm;
