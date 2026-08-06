/* Astronomy — offline service worker
   The app is a single self-contained HTML file. Online visits use the
   newest HTML; offline visits fall back to the last successful copy.
*/
const CACHE_PREFIX = "astronomy-2e-";
const CACHE_VERSION = "v1";
const APP_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_PAGE = new URL("./astronomy.html", self.location.href).pathname;

const APP_FILES = [
  "./astronomy.html",
  "./astronomy-manifest.json",
  "./astronomy-icon-180.png",
  "./astronomy-icon-192.png",
  "./astronomy-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await Promise.allSettled(
      APP_FILES.map(async (url) => {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) {
          await cache.put(url, response);
        }
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (
    request.mode === "navigate" &&
    sameOrigin &&
    url.pathname === APP_PAGE
  ) {
    event.respondWith(networkFirstAppPage(request));
    return;
  }

  if (
    sameOrigin &&
    (request.destination === "manifest" || request.destination === "image")
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstAppPage(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      try {
        await cache.put("./astronomy.html", response.clone());
      } catch (error) { /* ignore cache write failure */ }
    }
    return response;
  } catch (error) {
    return (
      (await cache.match("./astronomy.html")) ||
      new Response(
        "<!doctype html><meta charset='utf-8'><title>Astronomy offline</title>" +
        "<main style='font:16px system-ui;padding:2rem;max-width:40rem'>" +
        "<h1>Astronomy</h1>" +
        "<p>The course is not cached yet. Reconnect to the internet and open it once.</p>" +
        "</main>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) { /* serve even if cache write fails */ }
    }
    return response;
  } catch (error) {
    return new Response("", { status: 504, statusText: "Asset unavailable offline" });
  }
}
