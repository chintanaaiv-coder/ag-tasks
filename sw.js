// AG Task Assigner — Service Worker v1.0
const CACHE = 'ag-tasks-v1';
const ASSETS = [
  './app-tester.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('SW cache error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', e => {
  // Always go network-first for Firebase calls
  if(e.request.url.includes('firebase') || e.request.url.includes('firestore') || e.request.url.includes('googleapis.com/firestore')) {
    return; // Let Firebase handle its own requests
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache successful GET responses
        if(e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — serve main HTML
        if(e.request.destination === 'document') {
          return caches.match('./app-tester.html');
        }
      });
    })
  );
});
