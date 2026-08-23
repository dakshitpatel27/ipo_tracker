import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, TrendingUp, BarChart2, Shield, CheckCircle2, Phone, Mail, Sparkles, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import Hero3DScene from '../components/ui/Hero3DScene';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', name: 'US / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', name: 'UK (+44)' },
  { code: '+971', flag: '🇦🇪', name: 'UAE (+971)' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore (+65)' },
  { code: '+61', flag: '🇦🇺', name: 'Australia (+61)' },
  { code: '+49', flag: '🇩🇪', name: 'Germany (+49)' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal (+977)' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh (+880)' }
];

const Auth = () => {
  const [authMode, setAuthMode] = useState('email'); // 'email' | 'phone'
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  // Phone Auth State
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp, login2FA, register } = useAuth();
  const [require2FA, setRequire2FA] = useState(false);
  const [totpToken, setTotpToken] = useState('');

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    try {
      if (authMode === 'phone') {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (!otpSent && cleanNumber.length < 10) {
          setError('Please enter a valid 10-digit mobile number.');
          return;
        }
      } else if (!isLogin) {
        if (!name || name.trim().length < 2) {
          setError('Full Name must be at least 2 characters long.');
          return;
        }
        if (!email || !EMAIL_REGEX.test(email.trim())) {
          setError('Please enter a valid email address (e.g. user@domain.com).');
          return;
        }
        if (!username || username.trim().length < 3) {
          setError('Username must be at least 3 characters long.');
          return;
        }
        if (!USERNAME_REGEX.test(username.trim())) {
          setError('Username can only contain letters, numbers, dots (.), and underscores (_).');
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
      }

      setSubmitting(true);
      if (authMode === 'phone') {
        if (!otpSent) {
          const cleanNumber = phoneNumber.replace(/\D/g, '');
          const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${cleanNumber}`;
          await sendPhoneOtp(formattedPhone, !isLogin);
          setOtpSent(true);
        } else {
          const cleanNumber = phoneNumber.replace(/\D/g, '');
          const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${cleanNumber}`;
          const res = await verifyPhoneOtp(otpCode, !isLogin, formattedPhone);
          if (res?.message === 'registered_pending' || res?.status === 'pending') {
            setPendingMessage(true);
          }
        }
      } else {
        if (isLogin) {
          if (require2FA) {
            await login2FA(username, totpToken);
          } else {
            const res = await login(username || email, password);
            if (res?.message === 'require_2fa') {
              setRequire2FA(true);
              setSubmitting(false);
              return;
            }
            if (res?.message === 'registered_pending' || res?.status === 'pending') {
              setPendingMessage(true);
            }
          }
        } else {
          const res = await register(name.trim(), username.trim(), password, email.trim().toLowerCase());
          if (res?.message === 'registered_pending' || res?.status === 'pending') {
            setPendingMessage(true);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await loginWithGoogle(!isLogin);
      if (res?.message === 'registered_pending' || res?.status === 'pending') {
        setPendingMessage(true);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('Biometric passkeys are not supported on this device/browser');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const options = await api.getWebAuthnLoginOptions(username);
      const challengeBuffer = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));

      const allowCreds = (options.allowCredentials || []).map(c => ({
        id: Uint8Array.from(atob(c.id), ch => ch.charCodeAt(0)),
        type: 'public-key'
      }));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          allowCredentials: allowCreds.length > 0 ? allowCreds : undefined,
          timeout: options.timeout || 60000
        }
      });

      if (!assertion) throw new Error('Biometric login cancelled');

      const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
      const res = await api.verifyWebAuthnLogin({ credentialId: assertion.id || rawIdBase64, username });

      if (res.token && res.user) {
        localStorage.setItem('ipo_token', res.token);
        localStorage.setItem('ipo_user', JSON.stringify(res.user));
        api.setToken(res.token);
        window.location.reload();
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric prompt cancelled or timed out');
      } else {
        setError(err.message || 'Biometric login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background text-gray-100 font-sans overflow-x-hidden custom-scrollbar">
      {/* Invisible container for Firebase Phone Auth Recaptcha */}
      <div id="recaptcha-container"></div>

      {/* Left/Top Panel (branding + 3D Scene) */}
      <div className="w-full md:w-[48%] lg:w-[45%] relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-white/10"
        style={{ background: 'linear-gradient(145deg, #0d0d14 0%, #09090b 60%, #111118 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-emerald-500/30 border border-emerald-500/30" />
            <div>
              <div className="font-bold text-white text-base tracking-tight">IPO Tracker</div>
              <div className="text-[0.6rem] text-indigo-400 font-semibold tracking-wider uppercase">Portfolio Pro</div>
            </div>
          </div>
        </div>

        {/* 3D Scene Display */}
        <div className="relative z-10 my-auto py-4 md:py-0">
          <Hero3DScene />
          <div className="mt-2 text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight tracking-tight mb-1.5">
              Your IPO portfolio,<br />
              <span className="text-indigo-400">professionally tracked.</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-sm mx-auto">
              Monitor allotments, profits, live market GMP & multi-account family portfolios in one place.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-[0.7rem] text-[var(--text-muted)] text-center hidden md:block">
          © 2026 IPO Tracker · Built for Indian investors
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10 relative overflow-hidden" style={{ perspective: '1000px' }}>
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-[20%] right-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute -bottom-[20%] left-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <motion.div
          key={isLogin ? 'login-card' : 'signup-card'}
          initial={{ opacity: 0, rotateY: isLogin ? -15 : 15, scale: 0.96 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: isLogin ? 15 : -15, scale: 0.96 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-sm relative z-10 my-auto"
        >
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/app-icon.png" alt="IPO Tracker Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-emerald-500/30 border border-emerald-500/30" />
            <span className="font-bold text-white text-lg tracking-tight">IPO Tracker</span>
          </div>

          <div className="mb-6">
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

          {/* Social & Biometric Sign In Options */}
          {!require2FA && !pendingMessage && (
            <div className="space-y-2.5 mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-.7-1.4-1.6-1.8-2.6z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>{isLogin ? 'Sign In with Google' : 'Sign Up with Google'}</span>
              </button>

              {isLogin && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl font-bold text-indigo-300 text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
                >
                  <Fingerprint size={18} className="text-indigo-400" />
                  <span>Login with Touch ID / Face ID</span>
                </button>
              )}

              <div className="flex rounded-xl bg-surface/50 border border-white/10 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setAuthMode('email'); setError(''); }}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all ${authMode === 'email' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <Mail size={14} /> Email / Username
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('phone'); setError(''); }}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all ${authMode === 'phone' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <Phone size={14} /> Phone OTP
                </button>
              </div>
            </div>
          )}

          {/* Pending message */}
          <AnimatePresence mode="wait">
            {pendingMessage ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/10">
                  <Shield size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Account Pending Admin Approval</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Your account registration request has been submitted to the administrator. You will gain full access to your dashboard once an admin approves your request.
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-amber-300 font-medium">
                  ⏳ Status: Awaiting Admin Verification
                </div>
                <button
                  onClick={() => { setIsLogin(true); setPendingMessage(false); setError(''); }}
                  className="btn-outline w-full justify-center text-sm py-2.5"
                >
                  Return to Sign In
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error && (
                  <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[0.8125rem] flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">⚠️</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {authMode === 'phone' ? (
                    <>
                      {!otpSent ? (
                        <div>
                          <label className="section-label block mb-1.5">Phone Number</label>
                          <div className="flex gap-2">
                            <select
                              value={countryCode}
                              onChange={e => setCountryCode(e.target.value)}
                              className="input-field w-36 shrink-0 bg-surface/80 text-xs font-semibold cursor-pointer border border-white/10"
                            >
                              {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code} className="bg-[#18181b] text-white">
                                  {c.flag} {c.code}
                                </option>
                              ))}
                            </select>

                            <div className="relative flex-1">
                              <input
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                className="input-field pl-9"
                                placeholder="9876543210"
                              />
                              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">We'll send an SMS verification code to your phone number.</p>
                        </div>
                      ) : (
                        <div>
                          <label className="section-label block mb-1.5">Enter SMS Verification Code</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="input-field text-center font-mono text-xl tracking-[0.75em] pl-[0.375em] py-3.5"
                            placeholder="000000"
                            autoFocus
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center mt-2 py-2.5 text-[0.875rem]"
                      >
                        {submitting ? 'Processing…' : (otpSent ? 'Verify Code & Sign In' : 'Send SMS OTP')}
                      </button>

                      {otpSent && (
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtpCode(''); }}
                          className="btn-outline w-full justify-center text-xs py-2"
                        >
                          Resend Code / Change Number
                        </button>
                      )}
                    </>
                  ) : (
                    <>
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
                        </motion.div>
                      ) : (
                        <>
                          {!isLogin && (
                            <>
                              <div>
                                <label className="section-label block mb-1.5">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  value={name}
                                  onChange={e => setName(e.target.value)}
                                  className="input-field"
                                  placeholder="Enter your full name"
                                />
                              </div>

                              <div>
                                <label className="section-label block mb-1.5">Email</label>
                                <input
                                  type="email"
                                  required
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  className="input-field"
                                  placeholder="you@example.com"
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <label className="section-label block mb-1.5">{isLogin ? 'Username or Email' : 'Username'}</label>
                            <input
                              type="text"
                              required
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              className="input-field"
                              placeholder={isLogin ? 'Enter username or email' : 'Choose a username'}
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
                    </>
                  )}
                </form>

                {!require2FA && authMode === 'email' && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => { setIsLogin(!isLogin); setError(''); }}
                      className="text-[0.8125rem] text-[var(--text-secondary)] hover:text-emerald-400 transition-colors border-0 bg-transparent cursor-pointer"
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
