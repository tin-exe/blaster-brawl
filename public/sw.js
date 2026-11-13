const CACHE_PREFIX = 'blaster-brawl-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const CORE_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/blaster-brawl-logo.svg',
  '/icons/blaster-icon-192.png',
  '/icons/blaster-icon-512.png',
  '/icons/blaster-icon-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    const response = await fetch('/index.html', { cache: 'reload' });
    if (response.ok) {
      const html = await response.clone().text();
      await cache.put('/index.html', response);
      const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
      await Promise.all(builtAssets.map(async (url) => {
        try {
          const asset = await fetch(url, { cache: 'reload' });
          if (asset.ok) await cache.put(url, asset);
        } catch { /* Keep installation resilient if a non-critical asset is transiently unavailable. */ }
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }
  const isBuiltAsset = url.pathname.startsWith('/assets/') || /\.(?:js|css|svg|webmanifest|png|ico|woff2?)$/i.test(url.pathname);
  if (!isBuiltAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
