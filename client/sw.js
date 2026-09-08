const CACHE_NAME = 'cepantezca-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo cachear recursos estáticos GET (no WebSockets ni APIs dinámicas)
  if (event.request.method === 'GET' && !event.request.url.includes('/stream') && !event.request.url.includes('/input') && !event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
    );
  }
});
