/**
 * Service Worker for the character roulette application.
 *
 * - Pre-caches core assets so the app works offline.
 * - Cleans up old caches on activation.
 * - Serves responses from cache first and updates the cache from the network.
 */
const CACHE_NAME = 'roulette-v4'; // Update this to refresh old caches

const OFFLINE_URL = './index.html';

// Assets to cache during the installation phase
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Install event: cache application shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate event: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

// Fetch event: cache-first strategy with network fallback
self.addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Responds with a cached response if available; otherwise, fetches from the
 * network and caches the result when appropriate.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  // Attempt to serve from cache first
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    // Cache successful GET requests from our own origin
    if (
      request.method === 'GET' &&
      response.ok &&
      new URL(request.url).origin === location.origin
    ) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Offline fallback: return cached index page
    return caches.match(OFFLINE_URL);
  }
}
