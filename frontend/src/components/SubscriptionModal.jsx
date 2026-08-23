import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Check, Zap, ShieldCheck, Sparkles, CreditCard, QrCode, ArrowRight, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const SubscriptionModal = ({ isOpen, onClose, defaultPlan = 'pro_yearly' }) => {
  const { user, setUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [paymentMode, setPaymentMode] = useState('razorpay'); // 'razorpay' | 'manual'
  const [loading, setLoading] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const resScript = await loadRazorpayScript();
      if (!resScript) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const orderData = await api.createSubscriptionOrder(selectedPlan);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'IPO Tracker PRO',
        description: selectedPlan === 'pro_yearly' ? 'PRO Yearly Subscription (₹1,499/yr)' : 'PRO Monthly Subscription (₹199/mo)',
        image: '/app-icon.png',
        order_id: orderData.orderId.startsWith('order_') ? orderData.orderId : undefined,
        prefill: {
          name: user?.name || user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response) {
          try {
            const verifyRes = await api.verifySubscription({
              razorpay_order_id: response.razorpay_order_id || orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'sig_valid',
              planId: selectedPlan
            });

            if (verifyRes?.user) {
              setUser(verifyRes.user);
              localStorage.setItem('ipo_user', JSON.stringify(verifyRes.user));
            }
            toast.success('🎉 Welcome to IPO Tracker PRO! All features unlocked.');
            onClose();
          } catch (verifyErr) {
            toast.error(verifyErr.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast('Payment cancelled.', { icon: 'ℹ️' });
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate checkout order.');
      setLoading(false);
    }
  };

  const handleManualUpiSubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.trim().length < 6) {
      toast.error('Please enter a valid 12-digit UTR number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitManualPayment({ utrNumber: utrNumber.trim(), planId: selectedPlan });
      toast.success(res.message || 'Manual payment request submitted successfully!');
      setUtrNumber('');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit manual payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0d0d12] border border-amber-500/30 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden z-10 custom-scrollbar max-h-[90vh] flex flex-col"
        >
          {/* Top Banner Gradient */}
          <div className="bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 p-6 sm:p-8 border-b border-white/10 relative text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl bg-black/30 hover:bg-black/50 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-black uppercase tracking-wider mb-3">
              <Crown size={15} className="text-amber-400 animate-bounce" /> Upgrade to Pro Tier
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Unlock Unlimited IPO Tracker Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mt-1.5 leading-relaxed">
              Remove all applicant limits, auto-sync allotment results 24/7, and get instant Telegram/WhatsApp alerts.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Plan Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <div
                onClick={() => setSelectedPlan('pro_monthly')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === 'pro_monthly'
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-white text-base">PRO Monthly</span>
                    <input
                      type="radio"
                      checked={selectedPlan === 'pro_monthly'}
                      onChange={() => setSelectedPlan('pro_monthly')}
                      className="accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-black text-amber-400">₹199</span>
                    <span className="text-xs text-zinc-400 font-semibold">/ month</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Standard monthly subscription with full PRO access.</p>
                </div>
              </div>

              {/* Yearly Plan */}
              <div
                onClick={() => setSelectedPlan('pro_yearly')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === 'pro_yearly'
                    ? 'bg-amber-500/15 border-amber-500 shadow-xl shadow-amber-500/20'
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                  Best Value · Save 37%
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-white text-base">PRO Yearly</span>
                    <input
                      type="radio"
                      checked={selectedPlan === 'pro_yearly'}
                      onChange={() => setSelectedPlan('pro_yearly')}
                      className="accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-black text-amber-400">₹1,499</span>
                    <span className="text-xs text-zinc-400 font-semibold">/ year</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Save ₹889 per year compared to monthly billing.</p>
                </div>
              </div>
            </div>

            {/* Feature Comparison Highlights */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] pb-1 border-b border-white/10 flex items-center gap-1.5">
                <Sparkles size={14} /> Included in PRO Tier
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300">
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> Unlimited Family Applicants</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> Unlimited IPO Bidding Records</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> 24/7 Auto-Allotment Poller</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> WhatsApp & Telegram Instant Alerts</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> Global Profit Analytics & Reports</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> Multiple Device Session Support</div>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="flex border-b border-white/10 gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMode('razorpay')}
                className={`pb-2 border-b-2 flex items-center gap-2 transition-colors ${
                  paymentMode === 'razorpay' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <CreditCard size={15} /> Instant Online Checkout (UPI / Cards / Netbanking)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('manual')}
                className={`pb-2 border-b-2 flex items-center gap-2 transition-colors ${
                  paymentMode === 'manual' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode size={15} /> Manual UPI QR Code Transfer
              </button>
            </div>

            {/* Razorpay Instant Checkout Tab */}
            {paymentMode === 'razorpay' && (
              <div className="space-y-3">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black rounded-2xl text-base transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={20} />
                      Pay {selectedPlan === 'pro_yearly' ? '₹1,499' : '₹199'} via Razorpay
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <div className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" /> 256-bit Secure Razorpay Checkout · Supports UPI, Google Pay, PhonePe, Cards & Netbanking
                </div>
              </div>
            )}

            {/* Manual UPI QR Code Tab */}
            {paymentMode === 'manual' && (
              <form onSubmit={handleManualUpiSubmit} className="space-y-4 text-xs">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=dakshitpatel27@okaxis&pn=IPOTrackerPro&am=${selectedPlan === 'pro_yearly' ? '1499' : '199'}&cu=INR`} alt="UPI QR Code" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">Scan QR Code or Pay via UPI ID</div>
                    <div className="font-mono text-amber-400 font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-block">dakshitpatel27@okaxis</div>
                    <div className="text-[11px] text-zinc-400">Amount: <span className="font-bold text-white">₹{selectedPlan === 'pro_yearly' ? '1,499' : '199'}</span></div>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1.5">Enter 12-Digit Transaction Reference (UTR / UPI Ref Number)</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. 423589102456"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Submitting UTR...' : 'Submit UTR for Verification'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionModal;
