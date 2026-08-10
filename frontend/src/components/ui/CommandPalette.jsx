import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, User, Sparkles, X, Terminal, Shield, Plus, Database } from 'lucide-react';
import { api } from '../../api';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ipos, setIpos] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Global toggle listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch IPOs and Applicants when palette opens
  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    let active = true;
    async function fetchData() {
      try {
        setLoading(true);
        // Call existing API endpoints
        const ipoData = await api.getIpos().catch(() => []);
        const applicantData = await api.getApplicants().catch(() => []);
        if (active) {
          setIpos(ipoData || []);
          setApplicants(applicantData || []);
        }
      } catch (err) {
        console.error('Command Palette fetch failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Command items configuration
  const staticNavigation = [
    { title: 'Go to Dashboard', subtitle: 'Overview of listing gains and status charts', action: () => navigate('/'), icon: Compass, category: 'Navigation' },
    { title: 'Go to IPO Records', subtitle: 'Manage listing records and transactions', action: () => navigate('/records'), icon: Terminal, category: 'Navigation' },
    { title: 'Go to Applicants', subtitle: 'Manage family/group applicant profiles', action: () => navigate('/applicants'), icon: User, category: 'Navigation' },
    { title: 'Go to Analytics & Taxes', subtitle: 'Ledger view, tax estimations, and reports', action: () => navigate('/analytics'), icon: Sparkles, category: 'Navigation' },
    { title: 'Go to Settings', subtitle: 'Preferences, 2FA security, and active sessions', action: () => navigate('/settings'), icon: Shield, category: 'Navigation' },
  ];

  const quickActions = [
    { title: 'Add New Record', subtitle: 'Create a new IPO allotment transaction entry', action: () => { navigate('/records'); /* modal trigger fallback */ }, icon: Plus, category: 'Quick Actions' },
    { title: 'Add New Applicant', subtitle: 'Create a new applicant profile', action: () => { navigate('/applicants'); }, icon: Plus, category: 'Quick Actions' },
    { title: 'Manage Security (2FA)', subtitle: 'Setup or disable authenticator tokens', action: () => navigate('/settings'), icon: Shield, category: 'Quick Actions' },
    { title: 'Download SQLite Backup', subtitle: 'Export full database snapshot', action: () => api.downloadBackup(), icon: Database, category: 'Quick Actions' },
  ];

  // Map dynamic datasets
  const dynamicIpos = ipos.map(ipo => ({
    title: `Filter: ${ipo.name}`,
    subtitle: `Search ledger records matching "${ipo.name}"`,
    action: () => {
      navigate(`/records?search=${encodeURIComponent(ipo.name)}`);
    },
    icon: Terminal,
    category: 'IPOs'
  }));

  const dynamicApplicants = applicants.map(app => ({
    title: `Filter: ${app.name}`,
    subtitle: `Search applicants matching "${app.name}"`,
    action: () => {
      navigate(`/applicants?search=${encodeURIComponent(app.name)}`);
    },
    icon: User,
    category: 'Applicants'
  }));

  // Combine and filter all items
  const allItems = [
    ...staticNavigation,
    ...quickActions,
    ...dynamicIpos,
    ...dynamicApplicants
  ];

  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Handle keyboard list navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeAction(filteredItems[selectedIndex]);
    }
  };

  const executeAction = (item) => {
    if (item && item.action) {
      item.action();
      setIsOpen(false);
      setSearch('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-[#090d16]/80 backdrop-blur-sm">
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, applicant name, or IPO..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-white placeholder-[var(--text-muted)] focus:outline-none text-[0.875rem]"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-[#1f2937] text-[var(--text-muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching commands or profiles found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-600/10 border border-indigo-500/20 text-white' : 'border border-transparent text-[var(--text-muted)]'
                  }`}
                >
                  <div className={`p-1.5 rounded mr-3 ${isSelected ? 'bg-indigo-600/20 text-indigo-400' : 'bg-[#1f2937] text-[var(--text-muted)]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8125rem] font-medium leading-none text-white">{item.title}</div>
                    <div className="text-[0.7rem] text-[var(--text-muted)] mt-1 truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-[#1f2937] px-1.5 py-0.5 rounded ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Help Footer */}
        <div className="px-4 py-2 bg-[#090d16] border-t border-border flex items-center justify-between text-[0.6875rem] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-[#1f2937] px-1 py-0.5 rounded text-white mr-1">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-[#1f2937] px-1 py-0.5 rounded text-white mr-1">Enter</kbd> Select</span>
            <span><kbd className="bg-[#1f2937] px-1 py-0.5 rounded text-white mr-1">Esc</kbd> Close</span>
          </div>
          <div>
            <span>Press <kbd className="bg-[#1f2937] px-1 py-0.5 rounded text-white font-mono">ctrl+k</kbd> anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
