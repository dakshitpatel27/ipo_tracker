import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const THEME_ACCENTS = [
  { id: 'emerald', label: 'Emerald Green', color: '#10b981' },
  { id: 'cyan', label: 'Cyberpunk Cyan', color: '#06b6d4' },
  { id: 'violet', label: 'Neon Violet', color: '#8b5cf6' },
  { id: 'gold', label: 'Imperial Gold', color: '#f59e0b' },
  { id: 'crimson', label: 'Crimson Red', color: '#f43f5e' }
];

export default function ThemeCustomizer() {
  const [activeAccent, setActiveAccent] = useState(localStorage.getItem('ipo_accent') || 'emerald');

  const handleSelect = (accentId) => {
    setActiveAccent(accentId);
    localStorage.setItem('ipo_accent', accentId);
    toast.success(`Theme accent updated to ${accentId}!`);
  };

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
          <Palette size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Cyberpunk Accent Color Customizer</h3>
          <p className="text-xs text-[var(--text-muted)]">Personalize your trading terminal UI accent palette</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {THEME_ACCENTS.map(t => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
              activeAccent === t.id ? 'bg-white/10 border-white text-white shadow-lg' : 'bg-black/20 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: t.color }}>
              {activeAccent === t.id && <Check size={10} className="text-black font-bold" />}
            </div>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
