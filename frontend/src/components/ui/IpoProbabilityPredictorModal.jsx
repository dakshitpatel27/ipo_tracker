import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, TrendingUp, Percent, Award, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const IpoProbabilityPredictorModal = ({ isOpen, onClose }) => {
  const [subTimes, setSubTimes] = useState(25);
  const [quota, setQuota] = useState('Retail');
  const [gmp, setGmp] = useState(85);
  const [issuePrice, setIssuePrice] = useState(120);
  const [qibSubX, setQibSubX] = useState(45);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await api.predictAllotment({
        subTimes: parseFloat(subTimes) || 1,
        quota,
        gmp: parseFloat(gmp) || 0,
        issuePrice: parseFloat(issuePrice) || 100,
        qibSubX: parseFloat(qibSubX) || 1
      });
      setPrediction(res);
      toast.success('AI Prediction updated!');
    } catch (e) {
      toast.error('Failed to run AI prediction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-surface-1 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden text-white"
      >
        <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">AI Allotment & Listing Gain Predictor</h3>
              <p className="text-xs text-secondary">Calculate probability odds & projected listing gains</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary hover:text-white rounded-lg hover:bg-surface-2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="section-label block mb-1">Issue Price (₹)</label>
              <input
                type="number"
                value={issuePrice}
                onChange={e => setIssuePrice(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1">Live GMP (₹)</label>
              <input
                type="number"
                value={gmp}
                onChange={e => setGmp(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1">Quota Category</label>
              <select value={quota} onChange={e => setQuota(e.target.value)} className="input-field">
                <option value="Retail">Retail (₹2 Lakh Limit)</option>
                <option value="sHNI">Small HNI (sHNI ₹2L - ₹10L)</option>
                <option value="bHNI">Big HNI (bHNI Above ₹10L)</option>
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Category Subscription (Times)</label>
              <input
                type="number"
                value={subTimes}
                onChange={e => setSubTimes(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="section-label block mb-1">QIB Subscription Demand ($X$ Times)</label>
            <input
              type="number"
              value={qibSubX}
              onChange={e => setQibSubX(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/30"
          >
            <Sparkles size={16} /> Compute AI Probability & Gain Range
          </button>

          {prediction && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2 p-4 rounded-xl border border-emerald-500/30">
                  <div className="text-[11px] text-secondary font-semibold uppercase flex items-center gap-1.5 mb-1">
                    <Percent size={14} className="text-emerald-400" /> Allotment Odds
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {prediction.odds?.probabilityPct}%
                  </div>
                  <div className="text-xs text-emerald-400 font-medium mt-1">
                    {prediction.odds?.oddsRatio}
                  </div>
                </div>

                <div className="bg-surface-2 p-4 rounded-xl border border-indigo-500/30">
                  <div className="text-[11px] text-secondary font-semibold uppercase flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className="text-indigo-400" /> Expected Gain
                  </div>
                  <div className="text-2xl font-black text-indigo-300 font-mono">
                    +{prediction.prediction?.baseGmpPct}%
                  </div>
                  <div className="text-xs text-indigo-400 font-medium mt-1">
                    Est. Range: {prediction.prediction?.predictedGainRange}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20 text-xs flex items-center justify-between">
                <span className="text-secondary flex items-center gap-1.5">
                  <Award size={16} className="text-emerald-400" /> Est. Listing Price:
                </span>
                <strong className="text-white font-mono text-sm">₹{prediction.prediction?.estListingPrice} / share</strong>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default IpoProbabilityPredictorModal;
