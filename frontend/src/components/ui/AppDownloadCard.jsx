import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, QrCode, CheckCircle2, ShieldCheck, Wifi, Sparkles, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AppDownloadCard = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState('android');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('IPO Tracker App installed successfully!');
    };

    const handleOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App installation started!');
      } else {
        toast('Installation dismissed');
      }
      setDeferredPrompt(null);
    } else {
      toast('Follow instructions below to add IPO Tracker to your Home Screen manually.');
    }
  };

  const handleDownloadDesktopApp = () => {
    const iconUrl = window.location.origin + '/app-icon.png';
    const urlContent = '[InternetShortcut]\nURL=' + window.location.origin + '\nIDList=\nHotKey=0\nIconFile=' + iconUrl + '\nIconIndex=0\n';
    const blob = new Blob([urlContent], { type: 'application/x-ms-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IPO Tracker App.url';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('🚀 Desktop Application Shortcut downloaded! Double-click to launch IPO Tracker anytime.');
  };

  const handleDownloadAndroidLauncher = () => {
    const link = document.createElement('a');
    link.href = '/manifest.json';
    link.download = 'ipo_tracker.webmanifest';
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('📦 PWA App Package config downloaded!');
  };

  const appUrl = window.location.origin;
  const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(appUrl) + '&color=6366f1&bgcolor=090d16';

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6 border border-indigo-500/20">
      <div className="flex flex-wrap justify-between items-start gap-4 border-b border-border pb-4">
        <div>
          <span className="badge badge-indigo text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 w-fit">
            <Sparkles size={12} /> Native Web App (PWA)
          </span>
          <h3 className="font-bold text-[var(--text-primary)] text-base sm:text-lg flex items-center gap-2">
            <Download size={18} className="text-indigo-500 shrink-0" /> Download & Install IPO Tracker App
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Install IPO Tracker on your Mobile or Desktop for 1-click home screen access, offline support & real-time alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${isOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
            <Wifi size={12} /> {isOnline ? 'PWA Online' : 'Offline Mode'}
          </div>
          {isInstalled && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" /> App Installed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Direct Install Buttons */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/10 via-surface-2 to-surface-1 p-4 sm:p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shadow-lg shadow-emerald-500/30 shrink-0 border border-emerald-500/30" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">IPO Tracker Native App</h4>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">Instant Home Screen access • Dedicated window • Offline ready</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleInstallClick}
                className="btn-primary py-2 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-all flex-1 sm:flex-initial justify-center"
              >
                <Download size={15} /> {deferredPrompt ? 'Install Native App' : 'Add to Home Screen'}
              </button>

              <button
                onClick={handleDownloadDesktopApp}
                className="btn-outline py-2 px-3 text-xs font-semibold text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/10 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                title="Download Desktop App shortcut icon for Windows & Mac"
              >
                <Monitor size={14} /> Desktop App (.url)
              </button>

              <button
                onClick={handleDownloadAndroidLauncher}
                className="btn-outline py-2 px-3 text-xs font-semibold text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                title="Download Android WebApp configuration package"
              >
                <Smartphone size={14} /> Package (.webmanifest)
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  toast.success('App link copied to clipboard!');
                }}
                className="btn-outline py-2 px-3 text-xs font-semibold flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
              >
                <Share2 size={14} /> Copy URL
              </button>
            </div>
          </div>

          {/* Installation Instructions per device */}
          <div className="space-y-3">
            <div className="flex border-b border-border text-xs font-semibold gap-3 overflow-x-auto custom-scrollbar pb-0.5">
              <button
                onClick={() => setActiveTab('android')}
                className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === 'android' ? 'border-indigo-500 text-indigo-500 font-bold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <Smartphone size={14} /> Android (Chrome)
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === 'ios' ? 'border-indigo-500 text-indigo-500 font-bold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <Smartphone size={14} /> iPhone / iPad (Safari)
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === 'desktop' ? 'border-indigo-500 text-indigo-500 font-bold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <Monitor size={14} /> Windows / Mac Desktop
              </button>
            </div>

            <div className="bg-surface-2 p-4 rounded-xl text-xs space-y-2 text-[var(--text-secondary)] border border-border">
              {activeTab === 'android' && (
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-primary)]">
                  <li>Open <strong>IPO Tracker</strong> in Chrome on your Android phone.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> menu in top-right corner.</li>
                  <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Confirm installation to launch IPO Tracker as a native app!</li>
                </ol>
              )}

              {activeTab === 'ios' && (
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-primary)]">
                  <li>Open <strong>IPO Tracker</strong> in <strong>Safari</strong> on iPhone or iPad.</li>
                  <li>Tap the <strong>Share button (Square with arrow ↑)</strong> at bottom.</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                  <li>Tap <strong>Add</strong> in top right corner.</li>
                </ol>
              )}

              {activeTab === 'desktop' && (
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-primary)]">
                  <li>Open this URL in Google Chrome or Microsoft Edge.</li>
                  <li>Look for the <strong>Install icon (⊕)</strong> in your browser address bar.</li>
                  <li>Click <strong>Install IPO Tracker</strong> to run as a standalone desktop software!</li>
                </ol>
              )}
            </div>
          </div>

        {/* Right Column: QR Code Mobile Pairing */}
        <div className="bg-surface-2 p-5 rounded-2xl border border-border text-center space-y-3 flex flex-col justify-center items-center">
          <div className="p-2 rounded-xl bg-white/5 border border-indigo-500/30">
            <img
              src={qrCodeUrl}
              alt="Scan QR Code to open App on Mobile"
              className="w-40 h-40 rounded-lg shadow-md"
            />
          </div>

          <div>
            <h5 className="font-bold text-[var(--text-primary)] text-xs flex items-center justify-center gap-1.5">
              <QrCode size={14} className="text-indigo-500" /> Scan Mobile QR Code
            </h5>
            <p className="text-[11px] text-secondary mt-0.5">
              Scan with your phone camera to instantly open IPO Tracker on your mobile browser.
            </p>
          </div>

          <div className="w-full pt-2 border-t border-border flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-semibold">
            <ShieldCheck size={14} /> 256-Bit SSL Encrypted PWA
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadCard;
