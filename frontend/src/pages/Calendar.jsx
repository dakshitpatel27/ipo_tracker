import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, TrendingUp, ExternalLink } from 'lucide-react';
import PageLoader from '../components/ui/PageLoader';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Parse a date string to a consistent YYYY-MM-DD key
function toKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

const Calendar = () => {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedIpos, setSelectedIpos] = useState([]);

  useEffect(() => {
    async function fetchIpos() {
      try {
        const res = await fetch('https://finapi.upvaly.com/api/ipo');
        const json = await res.json();
        if (json.status === 'success') setIpos(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIpos();
  }, []);

  // Build date → IPO event map
  const eventMap = useMemo(() => {
    const map = {};
    const addEvent = (key, ipo, type, label, color) => {
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push({ ipo, type, label, color });
    };
    ipos.forEach(ipo => {
      addEvent(toKey(ipo.schedule?.startDate), ipo, 'open', 'Opens', 'bg-emerald-500');
      addEvent(toKey(ipo.schedule?.endDate), ipo, 'close', 'Closes', 'bg-rose-500');
      addEvent(toKey(ipo.schedule?.listingDate), ipo, 'listing', 'Lists', 'bg-blue-500');
    });
    return map;
  }, [ipos]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, key, events: eventMap[key] || [] });
    }
    // Pad to complete last row
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth, eventMap]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (dayObj) => {
    if (!dayObj || dayObj.events.length === 0) return;
    setSelectedDate(dayObj.key);
    setSelectedIpos(dayObj.events);
  };

  const todayKey = toKey(today.toISOString());

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">IPO Calendar & Timelines</h1>
          <p className="page-subtitle">Visual calendar of IPO open, close, and listing schedules.</p>
        </div>
        <div className="flex gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Opens</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Closes</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Lists</span>
        </div>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col p-5">
        {/* Month Nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="btn-outline p-1.5">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-white tracking-tight">{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="btn-outline p-1.5">
            <ChevronRight size={18} />
          </button>
        </div>

        {loading ? (
          <PageLoader text="Fetching live IPO dates..." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-secondary uppercase py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayObj, idx) => {
                if (!dayObj) return <div key={idx} />;
                const isToday = dayObj.key === todayKey;
                const hasEvents = dayObj.events.length > 0;

                return (
                  <motion.div
                    key={dayObj.key}
                    whileHover={hasEvents ? { scale: 1.04 } : {}}
                    onClick={() => handleDayClick(dayObj)}
                    className={`min-h-[70px] p-1.5 rounded-xl border transition-all ${
                      hasEvents ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-white/5' : ''
                    } ${isToday ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/30'}`}
                  >
                    <div className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-emerald-500 text-black' : 'text-secondary'
                    }`}>
                      {dayObj.day}
                    </div>
                    <div className="space-y-0.5">
                      {dayObj.events.slice(0, 3).map((ev, i) => (
                        <div
                          key={i}
                          className={`text-[9px] font-bold px-1 py-0.5 rounded truncate text-white ${ev.color} opacity-90`}
                          title={`${ev.ipo.name} — ${ev.label}`}
                        >
                          {ev.label}: {ev.ipo.name}
                        </div>
                      ))}
                      {dayObj.events.length > 3 && (
                        <div className="text-[9px] text-secondary text-center">+{dayObj.events.length - 3} more</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-white">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-secondary hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {selectedIpos.map((ev, i) => {
                  const gmpStr = ev.ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp;
                  const link = ev.ipo.detailsUrl || ev.ipo.url;
                  return (
                    <div key={i} className="bg-black/30 border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-white">{ev.ipo.name}</h4>
                          <p className="text-xs text-secondary">{ev.ipo.type || 'Mainboard'}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${ev.color}`}>
                          {ev.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                        <div>
                          <p className="text-secondary">Price Band</p>
                          <p className="text-white font-medium">{ev.ipo.priceRange || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-secondary">Lot Size</p>
                          <p className="text-white font-medium">{ev.ipo.lotSize || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-secondary flex items-center gap-1"><TrendingUp size={10} /> GMP</p>
                          <p className={`font-bold ${gmpStr && !gmpStr.includes('-') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {gmpStr ? `₹${gmpStr}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {link && (
                        <a href={link} target="_blank" rel="noreferrer" className="mt-3 text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-bold">
                          View Details <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
