import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { api } from "./api";

const firebaseConfig = {
  apiKey: "AIzaSyAyZVQM8yHSboZlF4R-KxbL_bJyRQ5UeiE",
  authDomain: "ipo-tracker-cba4e.firebaseapp.com",
  projectId: "ipo-tracker-cba4e",
  storageBucket: "ipo-tracker-cba4e.firebasestorage.app",
  messagingSenderId: "1047325134530",
  appId: "1:1047325134530:web:8bb31659adc54586af355b"
};
const vapidKeyStore = "BJlqEdcexXwVOJGat1ZtAvShjLPjoQyWe91_ZpIO2Hul5TVVzR9Atno1OXt8K8xazKh5QYlCjjFTLJUkjcCnnwY";

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const messagingInstance = getMessaging(app);

export const requestForToken = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  
  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
    } catch (e) {
      return null;
    }
  } else if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const currentToken = await getToken(messagingInstance, { vapidKey: vapidKeyStore });
    if (currentToken && currentToken.length >= 30) {
      return currentToken;
    }
    return null;
  } catch (err) {
    console.warn('[FCM Token Notice]:', err.message);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (!messagingInstance) return;
  onMessage(messagingInstance, (payload) => {
    callback(payload);
  });
};
