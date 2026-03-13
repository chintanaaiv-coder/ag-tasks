const CACHE_NAME = 'aga-tasks-v42';

// Import Firebase Messaging SW
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in SW
firebase.initializeApp({
  apiKey:"AIzaSyAbUPspsGxAx2YAR6gY7R9rdV2_qn4T8TU",
  authDomain:"ag-task-assigner.firebaseapp.com",
  projectId:"ag-task-assigner",
  storageBucket:"ag-task-assigner.firebasestorage.app",
  messagingSenderId:"694765678250",
  appId:"1:694765678250:web:02b43ec9946150f47b6ad3"
});

const fcmMessaging = firebase.messaging();

// Handle background FCM push (app closed or minimized)
fcmMessaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'AGA Tasks';
  const body = payload.notification?.body || payload.data?.body || 'New update';
  return self.registration.showNotification(title, {
    body: body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'aga-fcm-' + Date.now(),
    renotify: true,
    data: { url: './' }
  });
});
const ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install - only cache external libraries
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - ALWAYS network first for HTML/JS, cache only for external libs
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Skip Firebase, API, and other external requests
  if (e.request.url.includes('firebasejs') || 
      e.request.url.includes('firestore') || 
      e.request.url.includes('googleapis.com/identitytoolkit') ||
      e.request.url.includes('nominatim')) {
    return;
  }
  // For our own HTML/JS files - always go to network first
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // For external CDN resources - cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Handle notification click - open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './index.html';
  e.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes('aga-tasks') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

// Handle push events (for future FCM integration)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'AGA Tasks';
  const options = {
    body: data.body || 'New update',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'aga-push-' + Date.now(),
    renotify: true,
    data: {url: './index.html'}
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
