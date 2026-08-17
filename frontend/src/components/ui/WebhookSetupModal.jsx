import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Webhook, Send, Check, Copy, ExternalLink, Code, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const WebhookSetupModal = ({ isOpen, onClose }) => {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('ipo_webhook_url') || '');
  const [eventAllotment, setEventAllotment] = useState(true);
  const [eventGmp, setEventGmp] = useState(true);
  const [eventMandate, setEventMandate] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen) return null;

  const samplePayload = {
    event: 'ALLOTMENT_RESULT',
    timestamp: new Date().toISOString(),
    ipoName: 'Bajaj Housing Finance Ltd',
    applicant: 'Dakshit Patel',
    status: 'ALLOTTED',
    sharesAllotted: 214,
    cutOffPrice: 70,
    expectedGain: '+114.2%',
    message: '🎉 Congratulations! 214 shares allotted for Bajaj Housing Finance.'
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast.error('Please enter a valid Webhook URL');
      return;
    }
    localStorage.setItem('ipo_webhook_url', webhookUrl.trim());
    toast.success('Webhook Gateway configuration saved!');
    onClose();
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a Webhook URL first');
      return;
    }
    setSendingTest(true);
    try {
      // Send live HTTP POST test payload
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload)
      });
      if (res.ok) {
        toast.success('🚀 Test Webhook payload delivered successfully!');
      } else {
        toast.success('Dispatch sent! (HTTP status: ' + res.status + ')');
      }
    } catch (e) {
      toast.error('Failed to dispatch webhook: ' + e.message + '. (CORS / URL error)');
    } finally {
      setSendingTest(false);
    }
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopiedPayload(true);
    toast.success('Sample JSON payload copied!');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-indigo-500/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <Webhook size={19} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-[var(--text-primary)]">Webhook Gateway Setup</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Dispatch live JSON alerts to Discord, Slack, or custom APIs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Target Webhook Endpoint URL
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                placeholder="https://discord.com/api/webhooks/... or https://your-server.com/api/webhook"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Supports Discord Webhooks, Slack Incoming Webhooks, or custom REST servers.
              </span>
            </div>

            {/* Event Toggles */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                Enabled Event Triggers
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventAllotment}
                    onChange={(e) => setEventAllotment(e.target.checked)}
                    className="rounded border-zinc-700 bg-transparent text-indigo-500"
                  />
                  <span>Allotment Drops</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventGmp}
                    onChange={(e) => setEventGmp(e.target.checked)}
                    className="rounded border-zinc-700 bg-transparent text-emerald-500"
                  />
                  <span>GMP Surges (&gt;10%)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventMandate}
                    onChange={(e) => setEventMandate(e.target.checked)}
                    className="rounded border-zinc-700 bg-transparent text-amber-500"
                  />
                  <span>Mandate Reminders</span>
                </label>
              </div>
            </div>

            {/* Payload Preview */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                  <Code size={13} /> Sample JSON Payload Preview
                </label>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="text-[10px] text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                >
                  {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPayload ? 'Copied' : 'Copy Payload'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-32">
                {JSON.stringify(samplePayload, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={sendingTest}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-500/25 transition-all"
              >
                <Send size={14} className={sendingTest ? 'animate-ping' : ''} />
                <span>{sendingTest ? 'Sending...' : 'Send Test Webhook'}</span>
              </button>

              <button
                type="submit"
                className="w-1/2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <span>Save Webhook Gateway</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WebhookSetupModal;
