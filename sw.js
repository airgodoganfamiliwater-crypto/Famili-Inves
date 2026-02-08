const CACHE_NAME = "fw-dashboard-v1.0.3";

// File static yang boleh di cache
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./ikon-192.png",
  "./ikon-512.png"
];

/* INSTALL */
self.addEventListener("install", e => {
  console.log("SW installing...");
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", e => {
  console.log("SW activated...");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* FETCH */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // 🔥 JANGAN CACHE GOOGLE SHEETS / API (REALTIME MODE)
  if (
    url.hostname.includes("opensheet.elk.sh") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 🔥 Jangan cache request POST / PUT / DELETE
  if (e.request.method !== "GET") {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first untuk file lokal (offline friendly)
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});