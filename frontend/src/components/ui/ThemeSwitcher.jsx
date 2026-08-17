import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const themes = [
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'system', label: 'System', icon: Monitor },
];

const accentColors = [
  { key: 'indigo', color: '#6366f1', label: 'Indigo' },
  { key: 'emerald', color: '#10b981', label: 'Emerald' },
  { key: 'rose', color: '#f43f5e', label: 'Rose' },
  { key: 'amber', color: '#f59e0b', label: 'Amber' },
  { key: 'violet', color: '#8b5cf6', label: 'Violet' },
  { key: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { key: 'pink', color: '#ec4899', label: 'Pink' },
  { key: 'orange', color: '#f97316', label: 'Orange' },
];

export const getStoredTheme = () => localStorage.getItem('ipo_theme') || 'dark';
export const getStoredAccent = () => localStorage.getItem('ipo_accent') || 'indigo';

export const applyTheme = (mode) => {
  const html = document.documentElement;
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('light', !prefersDark);
  } else if (mode === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
};

// Initialize theme on app load
applyTheme(getStoredTheme());

const ThemeSwitcher = ({ compact = false }) => {
  const [theme, setThemeState] = useState(getStoredTheme());
  const [accent, setAccentState] = useState(getStoredAccent());

  useEffect(() => {
    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (mode) => {
    setThemeState(mode);
    localStorage.setItem('ipo_theme', mode);
    applyTheme(mode);
  };

  const setAccent = (color) => {
    setAccentState(color);
    localStorage.setItem('ipo_accent', color);
  };

  if (compact) {
    // Compact toggle for sidebar footer
    const currentIdx = themes.findIndex(t => t.key === theme);
    const next = themes[(currentIdx + 1) % themes.length];
    const CurrentIcon = themes[currentIdx]?.icon || Moon;

    return (
      <button
        onClick={() => setTheme(next.key)}
        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all border border-zinc-700/50"
        title={`Theme: ${themes[currentIdx]?.label || 'Dark'} (click for ${next.label})`}
      >
        <CurrentIcon size={14} />
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Theme Mode Selector */}
      <div>
        <div className="section-label mb-2">Appearance</div>
        <div className="flex gap-2">
          {themes.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  theme === t.key
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'bg-surface/50 text-secondary border-border hover:text-white hover:border-zinc-600'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color Picker */}
      <div>
        <div className="section-label mb-2">Accent Color</div>
        <div className="flex flex-wrap gap-2">
          {accentColors.map(c => (
            <button
              key={c.key}
              onClick={() => setAccent(c.key)}
              title={c.label}
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${
                accent === c.key ? 'border-white ring-2 ring-offset-2 ring-offset-[#09090b]' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.color, boxShadow: accent === c.key ? `0 0 12px ${c.color}50` : 'none' }}
            >
              {accent === c.key && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
