const CACHE = 'roulette-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const url = new URL(e.request.url);
      if (
        e.request.method === 'GET' &&
        resp.ok &&
        url.origin === location.origin
      ) {
        const respClone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, respClone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
