// public/sw.js
// Pages hold private player data, so HTML and API responses are never cached:
// navigations go to the network and fall back to a static offline page.
// Only public, versioned static assets are cached.
const CACHE_NAME = 'hoopiq-v2';

const ASSETS_TO_CACHE = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Install event - cache the offline page and icons
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

// Activate event - remove caches from older versions (including v1's cached pages)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: network only, offline page when there is no connection
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error())
    );
    return;
  }

  // Build assets are content-hashed, so cache-first is safe
  if (url.pathname.startsWith('/_next/static/') || ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
  // Everything else (API, data, uploads) goes straight to the network
});
