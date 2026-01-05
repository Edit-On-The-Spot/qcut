/**
 * Service Worker for qcut.app PWA
 * Enables offline functionality by caching static assets and FFmpeg WASM files.
 * Pages are cached on-demand as users navigate to them.
 */

const CACHE_NAME = 'qcut-v3';

// Core assets to cache immediately on install (must exist and return 200)
const CORE_ASSETS = [
  '/manifest.json',
  '/qcut-logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// CDN domains to cache (FFmpeg WASM files)
const CACHEABLE_CDN_DOMAINS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
];

/**
 * Checks if a URL is from a cacheable CDN domain.
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL is from a cacheable CDN.
 */
function isCacheableCDN(url) {
  try {
    const parsedUrl = new URL(url);
    return CACHEABLE_CDN_DOMAINS.some(domain => parsedUrl.hostname.includes(domain));
  } catch {
    return false;
  }
}

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  // Activate immediately without waiting for old service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.startsWith('http')) {
    return;
  }

  // Skip range requests (e.g., video/audio seeking) - they return 206 which can't be cached
  if (request.headers.get('range')) {
    return;
  }

  // For CDN requests (FFmpeg WASM), use cache-first with network fallback
  if (isCacheableCDN(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          // Only cache complete responses (status 200), not partial (206)
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // For same-origin requests, use stale-while-revalidate strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Start fetch in background to update cache
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Only cache complete responses (status 200) from same origin
          if (networkResponse.status === 200 && new URL(url).origin === self.location.origin) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, return cached response if available
          return cachedResponse;
        });

      // Return cached response immediately, or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
