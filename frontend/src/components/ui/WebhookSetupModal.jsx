import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Webhook, Send, Check, Copy, Code, MessageSquare, PhoneCall, Bot, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

const WebhookSetupModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('telegram'); // 'telegram' | 'whatsapp' | 'webhook'
  
  // Telegram State
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);

  // Custom Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('ipo_secret_key_123');
  const [webhookAlerts, setWebhookAlerts] = useState(true);

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getBotConfig();
      if (data) {
        setTelegramToken(data.telegramToken || '');
        setTelegramChatId(data.telegramChatId || '');
        setTelegramAlerts(data.telegramAlerts !== 0);
        setWhatsappNumber(data.whatsappNumber || '');
        setWhatsappAlerts(data.whatsappAlerts !== 0);
        setWebhookUrl(data.webhookUrl || localStorage.getItem('ipo_webhook_url') || '');
        setWebhookSecret(data.webhookSecret || 'ipo_secret_key_123');
        setWebhookAlerts(data.webhookAlerts !== 0);
      }
    } catch (e) {
      console.warn('Failed to load bot config:', e.message);
    } finally {
      setLoading(false);
    }
  };

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
    message: '🎉 Allotment Confirmed! 214 shares allotted.'
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    try {
      await api.updateBotConfig({
        telegramToken,
        telegramChatId,
        telegramAlerts: telegramAlerts ? 1 : 0,
        whatsappNumber,
        whatsappAlerts: whatsappAlerts ? 1 : 0,
        webhookUrl,
        webhookSecret,
        webhookAlerts: webhookAlerts ? 1 : 0
      });
      if (webhookUrl) localStorage.setItem('ipo_webhook_url', webhookUrl);
      toast.success('🎉 Notification Bot configurations saved successfully!');
      onClose();
    } catch (e) {
      toast.error('Failed to save configuration: ' + e.message);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramToken || !telegramChatId) {
      toast.error('Please enter Bot Token and Chat ID first');
      return;
    }
    setSendingTest(true);
    try {
      await api.testTelegramBot({ token: telegramToken, chatId: telegramChatId });
      toast.success('🚀 Test alert sent to Telegram!');
    } catch (e) {
      toast.error('Telegram test failed: ' + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsappNumber) {
      toast.error('Please enter WhatsApp number');
      return;
    }
    setSendingTest(true);
    try {
      await api.testWhatsAppBot({ whatsappNumber });
      toast.success(`📱 WhatsApp test alert dispatched to ${whatsappNumber}!`);
    } catch (e) {
      toast.error('WhatsApp test failed: ' + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Please enter a Webhook URL first');
      return;
    }
    setSendingTest(true);
    try {
      await api.testWebhook({ webhookUrl, webhookSecret });
      toast.success('🚀 Test payload delivered to Webhook endpoint!');
    } catch (e) {
      toast.error('Webhook test failed: ' + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-indigo-500/5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  Instant Allotment Alert Bot <Sparkles size={14} className="text-amber-400" />
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Get real-time alerts via Telegram, WhatsApp, or Custom Webhooks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[var(--border)] bg-[var(--surface-3)] p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('telegram')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'telegram'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:bg-white/5'
              }`}
            >
              <MessageSquare size={15} /> Telegram Bot
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:bg-white/5'
              }`}
            >
              <PhoneCall size={15} /> WhatsApp Alert
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('webhook')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'webhook'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:bg-white/5'
              }`}
            >
              <Webhook size={15} /> Custom Webhook
            </button>
          </div>

          {/* Tab Content Form */}
          <form onSubmit={handleSaveAll} className="p-5 space-y-4">
            {/* --- TELEGRAM TAB --- */}
            {activeTab === 'telegram' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5 text-sky-200">
                    <Bot size={14} /> Quick 2-Step Telegram Setup:
                  </span>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-sky-200/90">
                    <li>Create a bot with <strong>@BotFather</strong> on Telegram to get your Token.</li>
                    <li>Start a chat with your bot and send a message, then enter your Chat ID below.</li>
                  </ol>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">Telegram Bot Token</label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">Target Telegram Chat ID</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 987654321 or -100123456789 (Group)"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={telegramAlerts}
                      onChange={(e) => setTelegramAlerts(e.target.checked)}
                      className="rounded border-zinc-700 bg-transparent text-sky-500"
                    />
                    Enable Telegram Allotment Alerts
                  </label>

                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={sendingTest}
                    className="py-1.5 px-3 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Send size={13} className={sendingTest ? 'animate-ping' : ''} />
                    <span>{sendingTest ? 'Sending...' : 'Test Telegram Alert'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- WHATSAPP TAB --- */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5 text-emerald-200">
                    <PhoneCall size={14} /> Direct WhatsApp Allotment Push
                  </span>
                  <p className="text-[11px] text-emerald-200/90">
                    Receive direct WhatsApp notification messages for allotment victories, refund statuses, and GMP surges.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">WhatsApp Phone Number (with Country Code)</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={whatsappAlerts}
                      onChange={(e) => setWhatsappAlerts(e.target.checked)}
                      className="rounded border-zinc-700 bg-transparent text-emerald-500"
                    />
                    Enable WhatsApp Allotment Alerts
                  </label>

                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={sendingTest}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Send size={13} className={sendingTest ? 'animate-ping' : ''} />
                    <span>{sendingTest ? 'Sending...' : 'Test WhatsApp Alert'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- CUSTOM WEBHOOK TAB --- */}
            {activeTab === 'webhook' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">Target Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/... or https://your-server.com/api/webhook"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">Webhook Signing Secret (HMAC SHA-256)</label>
                  <input
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={webhookAlerts}
                      onChange={(e) => setWebhookAlerts(e.target.checked)}
                      className="rounded border-zinc-700 bg-transparent text-indigo-500"
                    />
                    Enable Webhook Events
                  </label>

                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={sendingTest}
                    className="py-1.5 px-3 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Send size={13} className={sendingTest ? 'animate-ping' : ''} />
                    <span>{sendingTest ? 'Sending...' : 'Test Webhook Dispatch'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 px-4 rounded-xl bg-surface-3 hover:bg-white/10 text-xs font-bold transition-all text-[var(--text-secondary)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="w-2/3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck size={16} /> Save Alert Bot Settings
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WebhookSetupModal;
