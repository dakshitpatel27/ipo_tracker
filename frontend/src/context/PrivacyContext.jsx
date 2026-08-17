import React, { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext();

export const PrivacyProvider = ({ children }) => {
  const [isStealth, setIsStealth] = useState(() => {
    try {
      return localStorage.getItem('ipo_stealth_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ipo_stealth_mode', isStealth);
    } catch (e) {
      console.error('Failed to save stealth setting:', e);
    }
  }, [isStealth]);

  const toggleStealth = () => {
    setIsStealth((prev) => !prev);
  };

  const maskAmount = (val, prefix = '₹') => {
    if (!isStealth) return `${prefix}${typeof val === 'number' ? val.toLocaleString('en-IN') : val}`;
    return `${prefix} •••••`;
  };

  const maskPan = (pan) => {
    if (!isStealth || !pan) return pan || '';
    if (pan.length < 10) return '••••••••••';
    return `${pan.slice(0, 2)}••••••${pan.slice(8)}`;
  };

  const maskText = (text) => {
    if (!isStealth || !text) return text;
    return '••••••••';
  };

  return (
    <PrivacyContext.Provider
      value={{
        isStealth,
        toggleStealth,
        maskAmount,
        maskPan,
        maskText,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};
