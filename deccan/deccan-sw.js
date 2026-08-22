/* The Deccan, 1500–1830s — offline service worker. Pages network-first, shell cached. */
const VERSION = "v3";
const PREFIX = "deccan-";
const APP_CACHE = `${PREFIX}app-${VERSION}`;
const PAGE_CACHE = `${PREFIX}pages-${VERSION}`;
const APP_SHELL = ["./", "./index.html", "./about.html", "./style.css", "./offline.html", "./app.js", "./data/entries.js", "./data/periods.js", "./deccan.webmanifest", "./deccan-icon-192.png", "./deccan-icon-180.png"];
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await Promise.all(APP_SHELL.map((u) => cache.add(u).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, PAGE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(req.mode === "navigate" ? PAGE_CACHE : APP_CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req) || await (await caches.open(APP_CACHE)).match(req);
      if (hit) return hit;
      if (req.mode === "navigate") return (await caches.open(APP_CACHE)).match("./offline.html");
      throw e;
    }
  })());
});
