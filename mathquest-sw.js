"use strict";

const CACHE_PREFIX = "mathquest-pwa-";
const CACHE_NAME = CACHE_PREFIX + "v2";
const APP_PAGE = "/mathquest.html";
const APP_SHELL = [
  APP_PAGE,
  "/mathquest-manifest.json",
  "/mathquest-icon-180.png",
  "/mathquest-icon-192.png",
  "/mathquest-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // For the application document, prefer the current online version and
  // fall back to the cached copy when offline.
  if (request.mode === "navigate" && url.pathname === APP_PAGE) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(APP_PAGE, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(APP_PAGE)) || Response.error();
      }
    })());
    return;
  }

  // Icons and manifest are immutable app-shell assets: cached first,
  // network second.
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
