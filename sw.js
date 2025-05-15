// sw.js - Service Worker

const CACHE_VERSION = 'v1.2';
const PRECACHE_NAME = `wpa-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `wpa-runtime-${CACHE_VERSION}`;

// List of resources to precache
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/manifest.json',
  '/stylev4.css',
  '/routes.json',
  '/cameras.json',
  '/cameraData.js',
  '/js/main.js',
  '/js/utils.js',
  '/js/dataLoader.js',
  '/js/filters.js',
  '/js/dropdowns.js',
  '/js/gallery.js',
  '/js/modal.js',
  '/js/geolocation.js',
  '/js/events.js',
  '/js/ui.js',
  '/images/mobileSplash.webp',
  '/Icongridbackground3.png',
  '/desktop-splash.mp4'
];

// On install, pre-cache key resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// On activate, clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== PRECACHE_NAME && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler: serve cached resources, with network fallback & runtime caching
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  // Always serve precached assets for same-origin requests that match
  if (PRECACHE_URLS.includes(requestURL.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Runtime caching for images
  if (requestURL.pathname.startsWith('/images/') ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/.test(requestURL.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            // Cache a clone for future
            cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Fallback to network, with cache fallback on failure
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
