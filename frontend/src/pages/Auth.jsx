import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, TrendingUp, BarChart2, Shield, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: BarChart2,    text: 'Track all your IPO applications in one place' },
  { icon: TrendingUp,  text: 'Monitor profits, GMP & listing performance' },
  { icon: Shield,      text: 'Secure, private data — only you can see yours' },
  { icon: CheckCircle2, text: 'Smart allotment status checker per registrar' },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, login2FA, register } = useAuth();
  const [require2FA, setRequire2FA] = useState(false);
  const [totpToken, setTotpToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        if (require2FA) {
          await login2FA(username, totpToken);
        } else {
          const res = await login(username, password);
          if (res?.message === 'require_2fa') {
            setRequire2FA(true);
            setSubmitting(false);
            return;
          }
        }
      } else {
        const res = await register(username, password, email);
        if (res?.message === 'registered_pending') {
          setPendingMessage(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-gray-100 overflow-hidden font-sans">
      {/* ── Left Panel (branding) — hidden on mobile ── */}
      <div className="hidden md:flex md:w-[46%] lg:w-[42%] relative flex-col justify-between p-10 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0d0d14 0%, #09090b 60%, #111118 100%)' }}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-emerald-500/30 border border-emerald-500/30" />
            <div>
              <div className="font-bold text-white text-base tracking-tight">IPO Tracker</div>
              <div className="text-[0.6rem] text-indigo-400 font-semibold tracking-wider uppercase">Portfolio Pro</div>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Your IPO portfolio,<br />
              <span className="text-indigo-400">professionally tracked.</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              The most comprehensive IPO tracking tool for Indian retail investors. Monitor allotments, profits, and live market GMP in one place.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-3.5">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Icon size={14} />
                </div>
                <span className="text-[0.8125rem] text-[var(--text-secondary)]">{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom credit */}
        <div className="relative z-10 text-[0.7rem] text-[var(--text-muted)]">
          © 2026 IPO Tracker · Built for Indian investors
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-hidden">
        {/* Mobile bg orbs */}
        <div className="md:hidden fixed inset-0 pointer-events-none">
          <div className="absolute -top-[20%] right-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute -bottom-[20%] left-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-emerald-500/30 border border-emerald-500/30" />
            <span className="font-bold text-white text-lg tracking-tight">IPO Tracker</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight mb-1.5">
              {require2FA ? 'Security Code Required' : (isLogin ? 'Welcome back' : 'Create account')}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-secondary)]">
              {require2FA
                ? 'Enter the verification code generated by your authenticator app.'
                : (isLogin
                  ? 'Sign in to access your portfolio dashboard'
                  : 'Join thousands of IPO investors already tracking'
                )
              }
            </p>
          </div>

          {/* Pending message */}
          <AnimatePresence mode="wait">
            {pendingMessage ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your account is pending admin approval. You'll be able to log in once an administrator approves your request.
                  </p>
                </div>
                <button
                  onClick={() => { setIsLogin(true); setPendingMessage(false); }}
                  className="btn-outline w-full justify-center"
                >
                  Return to Login
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-5 p-3.5 bg-rose-500/8 border border-rose-500/20 text-rose-400 rounded-xl text-[0.8125rem] flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 shrink-0">⚠️</span>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {require2FA ? (
                    <motion.div key="totp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="section-label block mb-1.5 text-blue-400 font-bold uppercase">Authenticator Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={totpToken}
                        onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                        className="input-field text-center font-mono text-xl tracking-[0.75em] pl-[0.375em] py-3.5"
                        placeholder="000000"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center mt-6 py-2.5 text-[0.875rem]"
                      >
                        {submitting ? 'Verifying…' : 'Verify & Log In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRequire2FA(false); setTotpToken(''); setError(''); }}
                        className="btn-outline w-full justify-center mt-3"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <AnimatePresence>
                        {!isLogin && (
                          <motion.div
                            key="email"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <label className="section-label block mb-1.5">Email</label>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="input-field"
                              placeholder="you@example.com"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <label className="section-label block mb-1.5">Username</label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="input-field"
                          placeholder="Enter your username"
                          autoComplete="username"
                        />
                      </div>

                      <div>
                        <label className="section-label block mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="input-field pr-11"
                            placeholder="Enter your password"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center mt-2 py-2.5 text-[0.875rem]"
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            {isLogin ? 'Signing in…' : 'Creating account…'}
                          </span>
                        ) : (isLogin ? 'Sign In' : 'Create Account')}
                      </button>
                    </>
                  )}
                </form>

                {!require2FA && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => { setIsLogin(!isLogin); setError(''); }}
                      className="text-[0.8125rem] text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
                    >
                      {isLogin
                        ? <>Don't have an account? <span className="font-semibold text-emerald-400">Sign up</span></>
                        : <>Already have an account? <span className="font-semibold text-emerald-400">Sign in</span></>
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
