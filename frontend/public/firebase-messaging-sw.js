// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAyZVQM8yHSboZlF4R-KxbL_bJyRQ5UeiE",
  authDomain: "ipo-tracker-cba4e.firebaseapp.com",
  projectId: "ipo-tracker-cba4e",
  storageBucket: "ipo-tracker-cba4e.firebasestorage.app",
  messagingSenderId: "1047325134530",
  appId: "1:1047325134530:web:8bb31659adc54586af355b"
});

const messaging = firebase.messaging();

// Firebase SDK automatically handles displaying background notifications 
// when it receives a 'notification' payload. No manual intervention needed!
