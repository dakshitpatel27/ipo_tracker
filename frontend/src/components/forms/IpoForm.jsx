import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const IpoForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
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
  });

  const [applicants, setApplicants] = useState([]);
  const [loadingFinAPI, setLoadingFinAPI] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
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
    loadApplicants();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // If applicant changes, auto-fill pan and upi
      if (name === 'applicantName') {
        const found = applicants.find(a => a.name === value);
        if (found) {
          next.pan = found.pan || '';
          next.upiId = found.upiId || '';
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

        {/* Row 3 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Shares</label>
          <input name="shares" type="number" value={formData.shares} onChange={handleChange} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Price (₹)</label>
          <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className="input-field" />
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">Amount</label>
          <input name="amount" type="number" step="0.01" value={formData.amount} readOnly className="input-field bg-black/40 text-gray-400" />
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

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
        <button type="submit" className="btn-primary">Save Record</button>
      </div>
    </form>
  );
};

export default IpoForm;
