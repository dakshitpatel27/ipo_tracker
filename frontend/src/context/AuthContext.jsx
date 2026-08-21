import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban } from 'lucide-react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const pollInterval = useRef(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState(null);

  useEffect(() => {
    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      const token = localStorage.getItem('ipo_token');
      if (token) {
        api.setToken(token);
        try {
          const res = await api.getMe();
          if (res.user && res.user.status === 'approved') {
            setUser(res.user);
            localStorage.setItem('ipo_user', JSON.stringify(res.user));
          } else {
            setUser(null);
            localStorage.removeItem('ipo_token');
            localStorage.removeItem('ipo_user');
            api.setToken(null);
          }
        } catch (e) {
          const savedUserStr = localStorage.getItem('ipo_user');
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.status === 'approved') {
                setUser(savedUser);
              } else {
                setUser(null);
              }
            } catch (err) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('ipo_user');
        api.setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch public settings for global state
    const fetchSettings = async () => {
       try {
           const data = await api.getPublicSettings();
           if (data?.subscriptionTiers) {
               setSubscriptionTiers(JSON.parse(data.subscriptionTiers));
           } else {
               setSubscriptionTiers({
                  free: { name: 'Free', maxApplicants: 2, maxRecords: 10, hasAnalytics: false },
                  pro: { name: 'Pro', maxApplicants: 1000, maxRecords: 10000, hasAnalytics: true }
               });
           }
       } catch(e) {}
    };
    fetchSettings();
  }, []);

  // Email/Password Login
  const login = async (usernameOrEmail, password) => {
    const res = await api.login({ username: usernameOrEmail, password });
    if (res.message === 'registered_pending' || res.user?.status === 'pending') {
      return { message: 'registered_pending', user: res.user };
    }
    if (res.token && res.user) {
      setUser(res.user);
      localStorage.setItem('ipo_token', res.token);
      localStorage.setItem('ipo_user', JSON.stringify(res.user));
      api.setToken(res.token);
    }
    return res;
  };

  // Google Sign-In & Sign-Up
  const loginWithGoogle = async (isSignup = false) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      const res = await api.googleAuth({
        email: fbUser.email,
        name: fbUser.displayName,
        uid: fbUser.uid,
        isSignup
      });

      if (res.message === 'registered_pending' || res.user?.status === 'pending') {
        try { await firebaseSignOut(auth); } catch (e) {}
        return { message: 'registered_pending', user: res.user };
      }

      if (res.token && res.user && res.user.status === 'approved') {
        setUser(res.user);
        localStorage.setItem('ipo_token', res.token);
        localStorage.setItem('ipo_user', JSON.stringify(res.user));
        api.setToken(res.token);
        return res.user;
      }

      try { await firebaseSignOut(auth); } catch (e) {}
      throw new Error(res.error || 'Account not found. Please sign up first.');
    } catch (err) {
      try { await firebaseSignOut(auth); } catch (e) {}
      throw new Error(err.message || 'Google authentication failed');
    }
  };

  // Phone Auth Setup Recaptcha
  const setupRecaptcha = (containerId = 'recaptcha-container') => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {}
      });
    }
    return window.recaptchaVerifier;
  };

  // Send SMS Code for Phone Auth
  const sendPhoneOtp = async (phoneNumber, isSignup = false) => {
    if (!isSignup) {
      // Verify phone number exists in backend before sending SMS
      const checkRes = await api.phoneAuth({ phoneNumber, isSignup: false });
      if (checkRes.message === 'registered_pending' || checkRes.user?.status === 'pending') {
        throw new Error('Account is pending admin approval');
      }
    }
    const verifier = setupRecaptcha();
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  };

  // Verify SMS Code
  const verifyPhoneOtp = async (code, isSignup = false, phoneNumber = '') => {
    if (!window.confirmationResult) {
      throw new Error('Please request OTP first');
    }
    const result = await window.confirmationResult.confirm(code);
    const fbUser = result.user;

    const res = await api.phoneAuth({
      phoneNumber: fbUser.phoneNumber || phoneNumber,
      uid: fbUser.uid,
      isSignup
    });

    if (res.message === 'registered_pending' || res.user?.status === 'pending') {
      try { await firebaseSignOut(auth); } catch (e) {}
      return { message: 'registered_pending', user: res.user };
    }

    if (res.token && res.user && res.user.status === 'approved') {
      setUser(res.user);
      localStorage.setItem('ipo_token', res.token);
      localStorage.setItem('ipo_user', JSON.stringify(res.user));
      api.setToken(res.token);
      return res.user;
    }

    try { await firebaseSignOut(auth); } catch (e) {}
    throw new Error(res.error || 'Account not found. Please sign up first.');
````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````  };

  // Email/Password Registration
  const register = async (name, username, password, email) => {
    return api.register({ name, username, password, email });
  };

  const login2FA = async (username, token) => {
    return api.login2FA(username, token);
  };

  const updateUserProfile = async (profileData) => {
    const data = await api.updateProfile(profileData);
    if (data.user) {
      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('ipo_user', JSON.stringify(updatedUser));
    }
    return data;
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    localStorage.removeItem('ipo_token');
    localStorage.removeItem('ipo_user');
    setUser(null);
    setIsSuspended(false);
    api.setToken(null);
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser,
      login, 
      loginWithGoogle,
      setupRecaptcha,
      sendPhoneOtp,
      verifyPhoneOtp,
      login2FA, 
      register, 
      updateUserProfile, 
      logout, 
      loading, 
      subscriptionTiers 
    }}>
      {children}
      
      <AnimatePresence>
        {isSuspended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="glass-card w-full max-w-sm overflow-hidden border-rose-500/30"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <Ban size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white">Account Suspended</h3>
                <p className="text-sm text-secondary">Your account has been suspended by an administrator. You can no longer access this application.</p>
              </div>
              <div className="bg-black/20 p-4 border-t border-border">
                <button onClick={logout} className="w-full px-4 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-glow shadow-rose-500/20">
                  Return to Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
