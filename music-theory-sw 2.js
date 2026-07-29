"use strict";

const CACHE_PREFIX = "music-theory-pwa-";
const CACHE_VERSION = "v4";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_PAGE = "/music-theory.html";
const APP_ASSETS = [
  APP_PAGE,
  "/music-theory-manifest.json",
  "/music-theory-icon-180.png",
  "/music-theory-icon-192.png",
  "/music-theory-icon-512.png"
];
const APP_PATHS = new Set(APP_ASSETS);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // A missing optional icon must not prevent the course itself from installing.
    await Promise.allSettled(
      APP_ASSETS.map(async path => {
        const response = await fetch(new Request(path, { cache: "reload" }));
        if (response.ok) await cache.put(path, response);
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !APP_PATHS.has(url.pathname)) return;

  if (url.pathname === APP_PAGE) {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  event.respondWith(cacheFirstAsset(event.request));
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response.ok) {
      try {
        await cache.put(APP_PAGE, response.clone());
      } catch (error) {
        // Never replace a successful network response with a cache-write error.
      }
    }

    return response;
  } catch (error) {
    return (
      (await cache.match(APP_PAGE)) ||
      new Response(
        "<!doctype html><meta charset='utf-8'><title>Harmonia offline</title>" +
        "<main style='font:16px system-ui;padding:2rem;max-width:42rem'>" +
        "<h1>Harmonia</h1>" +
        "<p>The course is not cached yet. Reconnect and open it once online.</p>" +
        "</main>",
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      )
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        // Serve the successful response even when storage is unavailable.
      }
    }
    return response;
  } catch (error) {
    return new Response("", {
      status: 504,
      statusText: "Asset unavailable offline"
    });
  }
}
