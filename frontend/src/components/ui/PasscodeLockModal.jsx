import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function PasscodeLockModal({ isLocked, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isLocked) return null;

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const verify = async (enteredPin) => {
    setLoading(true);
    try {
      const res = await api.verifyPin(enteredPin);
      if (res.valid) {
        setPin('');
        onUnlock();
        toast.success('App unlocked!');
      } else {
        setError(true);
        setPin('');
        toast.error('Incorrect Passcode PIN');
      }
    } catch (err) {
      setError(true);
      setPin('');
      toast.error('Incorrect Passcode PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] flex items-center justify-center p-4 select-none">
      <div className={`w-full max-w-xs bg-[#141418] border border-white/10 rounded-3xl p-6 text-center space-y-6 shadow-2xl ${error ? 'animate-bounce' : ''}`}>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
          <Lock size={26} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">App Locked</h2>
          <p className="text-xs text-white/50 mt-1">Enter 4-digit Passcode PIN to continue</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-indigo-500 border-indigo-400 shadow-md shadow-indigo-500/50 scale-110'
                  : 'bg-white/5 border-white/20'
              }`}
            />
          ))}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(String(num))}
              disabled={loading}
              className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-indigo-600 text-white font-bold text-lg border border-white/5 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-indigo-600 text-white font-bold text-lg border border-white/5 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-rose-400 border border-white/5 transition-all flex items-center justify-center"
          >
            <Delete size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
