// sw.js
self.addEventListener('install', event => {
  console.log('[Service Worker] Installed');
  self.skipWaiting(); // langsung aktif setelah install
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activated');
  // bersihkan cache lama kalau ada (opsional)
});

self.addEventListener('fetch', event => {
  // Tanpa caching, biarkan request berjalan normal
  event.respondWith(fetch(event.request));
});