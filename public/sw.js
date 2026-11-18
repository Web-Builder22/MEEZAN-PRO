const CACHE_NAME = 'meezanflow-v3';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Do not intercept non-GET requests, cross-origin requests (Firebase/Google APIs), or browser extensions
  if (req.method !== 'GET' || !url.protocol.startsWith('http') || url.origin !== self.location.origin) {
    return;
  }

  // Always bypass cache for Vite internal modules, source files (/src/*), TypeScript/JS modules, and configs
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('vite') ||
    url.pathname.includes('node_modules') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.json')
  ) {
    return;
  }

  // Bypass cache completely for API requests, providing an offline JSON response wrapper on failure
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({
          error: 'Internet is currently disconnected. Offline safe-sandbox active.',
          offline: true,
          status: 'offline'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-First strategy for HTML & static assets with offline cache fallback
  e.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});

