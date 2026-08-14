import React, { useState } from 'react';
import { Palette, Check, Sparkles, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';

const ACCENT_COLORS = [
  { id: 'indigo', name: 'Indigo Terminal', hex: '#6366f1' },
  { id: 'emerald', name: 'Emerald Bull', hex: '#10b981' },
  { id: 'violet', name: 'Violet Cyber', hex: '#8b5cf6' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b' },
  { id: 'rose', name: 'Rose Red', hex: '#f43f5e' }
];

const ThemeStudio = () => {
  const [selectedAccent, setSelectedAccent] = useState('indigo');
  const [brandNameInput, setBrandNameInput] = useState(localStorage.getItem('ipo_brand_name') || 'IPO Tracker Terminal Pro');

  const handleSaveTheme = () => {
    localStorage.setItem('ipo_brand_name', brandNameInput);
    toast.success('🎉 Theme & Custom Branding preferences saved!');
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Palette size={18} className="text-indigo-400" /> Custom Theme Studio & White-Label Branding
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Personalize accent colors, workspace branding, and display layouts.
          </p>
        </div>
        <button
          onClick={handleSaveTheme}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 font-bold"
        >
          Save Theme
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-secondary font-semibold mb-2">Accent Color Palette</label>
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedAccent(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedAccent === c.id ? 'bg-white/10 border-white text-white' : 'bg-surface-2 border-border text-secondary'
                }`}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-secondary font-semibold mb-1">Custom Brand / Sub-broker Name</label>
          <input
            type="text"
            value={brandNameInput}
            onChange={e => setBrandNameInput(e.target.value)}
            className="input-field py-1.5 text-xs font-semibold"
            placeholder="e.g. Patel Wealth IPO Desk"
          />
        </div>
      </div>
    </div>
  );
};

export default ThemeStudio;
