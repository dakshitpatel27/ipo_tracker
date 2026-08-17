import React from 'react';

// Theme features removed as requested
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('light');
  try {
    localStorage.removeItem('ipo_theme');
  } catch (e) {}
}

const ThemeSwitcher = () => null;

export const getStoredTheme = () => 'dark';
export const getStoredAccent = () => 'indigo';
export const applyTheme = () => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light');
  }
};

export default ThemeSwitcher;
