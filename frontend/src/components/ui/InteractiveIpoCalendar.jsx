import React, { useState } from 'react';
import { Calendar as CalendarIcon, Download, Share2, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const MOCK_EVENTS = [
  { id: '1', ipoName: 'Swiggy Limited', date: '2026-08-16', type: 'OPEN_DATE', desc: 'Bidding Opens' },
  { id: '2', ipoName: 'Swiggy Limited', date: '2026-08-18', type: 'CLOSE_DATE', desc: 'Bidding Closes @ 5:00 PM' },
  { id: '3', ipoName: 'Swiggy Limited', date: '2026-08-20', type: 'ALLOTMENT_DATE', desc: 'Allotment Declaration Date' },
  { id: '4', ipoName: 'Swiggy Limited', date: '2026-08-22', type: 'LISTING_DATE', desc: 'Stock Listing on BSE & NSE' },
  { id: '5', ipoName: 'Hyundai Motor India', date: '2026-08-25', type: 'LISTING_DATE', desc: 'Stock Listing Date' },
];

const InteractiveIpoCalendar = () => {
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  const handleExportICS = (event) => {
    const startDate = event.date.replace(/-/g, '') + 'T090000Z';
    const endDate = event.date.replace(/-/g, '') + 'T170000Z';

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IPO Tracker Terminal Pro//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${event.id}@ipotracker.pro
DTSTAMP:${startDate}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.ipoName} - ${event.desc}
DESCRIPTION:IPO Tracker Reminder for ${event.ipoName} (${event.type}).
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${event.ipoName} ${event.desc}
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.ipoName}_${event.type}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported .ics calendar event for ${event.ipoName}!`);
  };

  const handleGoogleCalendarSync = (event) => {
    const dates = `${event.date.replace(/-/g, '')}T090000Z/${event.date.replace(/-/g, '')}T170000Z`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.ipoName + ' - ' + event.desc)}&dates=${dates}&details=${encodeURIComponent('IPO Event tracked on IPO Tracker Terminal Pro')}`;
    window.open(url, '_blank');
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <CalendarIcon size={16} className="text-indigo-400" /> Interactive IPO Event Calendar & iCal / Google Sync
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Never miss an IPO bidding deadline, allotment date, or listing day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-indigo-300">{selectedMonth}</span>
        </div>
      </div>

      <div className="space-y-2">
        {MOCK_EVENTS.map((evt) => (
          <div
            key={evt.id}
            className="p-3.5 rounded-xl bg-surface-2 border border-border flex flex-wrap items-center justify-between gap-3 text-xs hover:border-indigo-500/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 font-mono font-bold flex flex-col items-center justify-center border border-indigo-500/20">
                <span className="text-[10px] text-secondary uppercase">{evt.date.split('-')[1]}</span>
                <span className="text-sm text-white font-bold leading-none">{evt.date.split('-')[2]}</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm">{evt.ipoName}</span>
                <p className="text-secondary text-[11px] mt-0.5">{evt.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportICS(evt)}
                className="btn-outline py-1 px-2.5 text-[11px] flex items-center gap-1.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
                title="Download .ics event file for Apple iCal & Outlook"
              >
                <Download size={12} /> .ICS File
              </button>
              <button
                onClick={() => handleGoogleCalendarSync(evt)}
                className="btn-outline py-1 px-2.5 text-[11px] flex items-center gap-1.5 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                title="Sync with Google Calendar"
              >
                <Share2 size={12} /> Google Sync
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveIpoCalendar;
