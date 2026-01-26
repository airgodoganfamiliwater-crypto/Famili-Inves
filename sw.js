const CACHE_NAME = "familiwater-v1";

const ASSETS = [
  "login.html",
  "index.html",
  "profil.html",
  "portofolio.html",
  "penjualan.html",
  "neraca.html",
  "profilperusahaan.html",
  "statement.html",
  "perjanjian.html",

  "LogoFW.png",
  "ikon-512.png",
  "sampul.png",
  "hero1.png",
  "hero2.png",
  "fw1.png",
  "fw2.png",
  "fw3.png"
];

/* INSTALL */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", e => {
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
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});