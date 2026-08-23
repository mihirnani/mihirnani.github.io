/* Hellenike – offline service worker
   Page-specific service worker for /ancient-greek.html.
   Online visits use the newest HTML; offline visits use the last cached copy.
*/

"use strict";

const CACHE_PREFIX = "ancient-greek-";
const CACHE_VERSION = "v6";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_PAGE = "/more/ancient-greek.html";

const APP_ASSETS = [
  APP_PAGE,
  "/more/ancient-greek-manifest.json",
  "/more/ancient-greek-icon-180.png",
  "/more/ancient-greek-icon-192.png",
  "/more/ancient-greek-icon-512.png"
];

const APP_PATHS = new Set(APP_ASSETS);

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /*
        Cache every available application file. Promise.allSettled means
        that one missing optional icon will not prevent installation.
      */
      await Promise.allSettled(
        APP_ASSETS.map(async path => {
          const response = await fetch(
            new Request(path, { cache: "reload" })
          );

          if (response.ok) {
            await cache.put(path, response);
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();

      /*
        Delete only older Hellenike caches.
        Caches belonging to other applications are left untouched.
      */
      await Promise.all(
        cacheKeys
          .filter(
            key =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
    Ignore requests to other domains and files belonging to other apps.
  */
  if (url.origin !== self.location.origin) return;
  if (!APP_PATHS.has(url.pathname)) return;

  if (url.pathname === APP_PAGE) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    /*
      Prefer the newest online HTML. "no-store" prevents an older copy
      in the browser's ordinary HTTP cache from being returned.
    */
    const response = await fetch(request, {
      cache: "no-store"
    });

    if (response.ok) {
      try {
        await cache.put(APP_PAGE, response.clone());
      } catch (error) {
        /*
          A cache-storage failure should not prevent the current online
          page from being displayed.
        */
      }
    }

    return response;
  } catch (error) {
    const cached = await cache.match(APP_PAGE);

    return (
      cached ||
      new Response(
        "<!doctype html>" +
          "<html lang='en'>" +
          "<head>" +
          "<meta charset='utf-8'>" +
          "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
          "<title>Hellenike offline</title>" +
          "</head>" +
          "<body>" +
          "<main style='font:16px/1.55 system-ui;padding:2rem;max-width:42rem'>" +
          "<h1>Hellenike</h1>" +
          "<p>The course has not yet been cached. Reconnect to the internet and open it once.</p>" +
          "</main>" +
          "</body>" +
          "</html>",
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          }
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
        /*
          Serve the fetched asset even if the browser cannot write it
          to Cache Storage.
        */
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
