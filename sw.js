const CACHE_NAME = "fw-cache-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/login.html",
  "/style.css",
  "/index.js",
  "/navbar.js",
  "/ikon-192.png",
  "/ikon-512.png"
];

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  console.log("[SW] Install");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );

  self.skipWaiting();
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Delete old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

/* ================= FETCH ================= */
self.addEventListener("fetch", (event) => {

  // 🔥 Strategy: Network First (biar data fresh, cocok dashboard)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // simpan cache baru
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // fallback ke cache kalau offline
        return caches.match(event.request);
      })
  );
});