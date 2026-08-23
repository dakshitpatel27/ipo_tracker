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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background payload:', payload);
  const title = payload.notification?.title || payload.data?.title || '🚀 IPO Tracker Push Alert';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'New IPO update available.',
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    data: payload.data || {},
    requireInteraction: true
  };
  return self.registration.showNotification(title, options);
});

// Native Web Push fallback event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.notification?.title || payload.data?.title || '🚀 IPO Tracker Alert';
    const options = {
      body: payload.notification?.body || payload.data?.body || 'New update received.',
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      data: payload.data || {},
      requireInteraction: true
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(self.registration.showNotification('🚀 IPO Tracker Alert', {
      body: text,
      icon: '/app-icon.png',
      requireInteraction: true
    }));
  }
});

// Handle notification click to focus or open app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
