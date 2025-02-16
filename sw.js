const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // You may add other assets here (e.g., CSS, JS, images) as needed
];

// Cache files on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
