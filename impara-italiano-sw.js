"use strict";

const CACHE_NAME = "impara-italiano-pwa-v1";
const APP_PAGE = "/impara-italiano.html";
const APP_ASSETS = [
  APP_PAGE,
  "/impara-italiano-manifest.json",
  "/impara-italiano-icon-180.png",
  "/impara-italiano-icon-192.png",
  "/impara-italiano-icon-512.png"
];
const APP_PATHS = new Set(APP_ASSETS);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("impara-italiano-pwa-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !APP_PATHS.has(url.pathname)) return;

  if (url.pathname === APP_PAGE) {
    // Network-first keeps course updates fresh; the cached copy is the offline fallback.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(APP_PAGE, copy));
          }
          return response;
        })
        .catch(() => caches.match(APP_PAGE))
    );
    return;
  }

  // Icons and manifest change rarely: serve cached immediately and refresh in the background.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const refresh = fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});
