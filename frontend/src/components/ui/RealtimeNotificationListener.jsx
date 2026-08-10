import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TrendingUp, Bell, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

export const RealtimeNotificationListener = () => {
  const { user } = useAuth();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('ipo_token');
    if (!token) return;

    // Connect to SSE stream
    const streamUrl = `${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'gmp_alert' || data.type === 'broadcast') {
          // Play subtle audio alert if permitted
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          } catch(e) {}

          // Display rich real-time toast
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-[#09090b] border border-indigo-500/50 shadow-2xl shadow-indigo-500/10 rounded-xl p-4 flex items-start gap-3.5 text-white pointer-events-auto backdrop-blur-xl`}
              >
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0 border border-indigo-500/30">
                  <TrendingUp size={20} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={10} className="animate-spin" /> Realtime GMP Alert
                    </span>
                    <span className="text-[10px] text-zinc-400">Just Now</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{data.title}</h4>
                  <p className="text-[0.75rem] text-zinc-300 leading-normal">{data.body}</p>
                </div>
              </div>
            ),
            { duration: 7000 }
          );
        }
      } catch (e) {
        console.error('Error parsing SSE message:', e);
      }
    };

    es.onerror = (err) => {
      // EventSource automatically retries connection
      console.warn('SSE connection interrupted, retrying...');
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user]);

  return null;
};

export default RealtimeNotificationListener;
