import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  PhoneAuthProvider, 
  RecaptchaVerifier,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPhoneNumber
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAyZVQM8yHSboZlF4R-KxbL_bJyRQ5UeiE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ipo-tracker-cba4e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ipo-tracker-cba4e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ipo-tracker-cba4e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1047325134530",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1047325134530:web:8bb31659adc54586af355b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence for Firestore web client
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unsupported in browser');
    }
  });
} catch (e) {
  // Ignore error if already enabled
}

const googleProvider = new GoogleAuthProvider();

export const detectDeviceType = () => {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android App";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS App";
  if (/Mobi/i.test(ua)) return "Mobile Browser";
  return "Desktop Browser";
};

export const requestForToken = async () => {
  try {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications");
      return null;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Notification permission was not granted by user");
      return null;
    }

    let registration = null;
    if ("serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
    }

    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BJlqEdcexXwVOJGat1ZtAvShjLPjoQyWe91_ZpIO2Hul5TVVzR9Atno1OXt8K8xazKh5QYlCjjFTLJUkjcCnnwY";
    
    const tokenOptions = { vapidKey };
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    const currentToken = await getToken(messaging, tokenOptions);
    return currentToken || null;
  } catch (err) {
    console.warn("FCM messaging notice:", err?.message || err);
    return null;
  }
};

export {
  app,
  auth,
  db,
  googleProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  signInWithPhoneNumber
};
