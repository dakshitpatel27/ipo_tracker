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
  console.log('[firebase-messaging-sw.js] Background payload received:', payload);
  const title = payload.notification?.title || payload.data?.title || '🚀 IPO Tracker Push Alert';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'New IPO update available.',
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  return self.registration.showNotification(title, options);
});

// Native Web Push event listener (Fires on all push events in foreground and background)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Native push event received:', event);

  let title = '🚀 IPO Tracker Alert';
  let body = 'New update received.';
  let icon = '/app-icon.png';
  let badge = '/app-icon.png';
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Native push JSON:', payload);

      title = payload.notification?.title || payload.webpush?.notification?.title || payload.data?.title || title;
      body = payload.notification?.body || payload.webpush?.notification?.body || payload.data?.body || body;
      icon = payload.notification?.icon || payload.webpush?.notification?.icon || icon;
      badge = payload.notification?.badge || payload.webpush?.notification?.badge || badge;
      data = payload.data || {};
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    tag: 'ipo-alert-' + Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Handle notification click to focus or open app window at target URL
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
  event.notification.close();

  const notifData = event.notification.data || {};
  let targetPath = notifData.click_action || notifData.url || '/application-matrix';

  const title = (event.notification.title || '').toLowerCase();
  const body = (event.notification.body || '').toLowerCase();

  if (title.includes('allotment') || body.includes('allotment')) {
    targetPath = '/allotted';
  } else if (title.includes('master') || body.includes('master')) {
    targetPath = '/ipo-master';
  } else {
    targetPath = '/application-matrix';
  }

  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
