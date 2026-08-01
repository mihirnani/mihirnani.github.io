/* Deutsch lernen — offline service worker */
const CACHE="deutsch-lernen-v1";
const PAGE="./deutsch-lernen.html";
const ASSETS=[PAGE,"./deutsch-lernen-manifest.json","./deutsch-lernen-icon-180.png","./deutsch-lernen-icon-192.png","./deutsch-lernen-icon-512.png"];
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.allSettled(ASSETS.map(async u=>{const r=await fetch(new Request(u,{cache:"reload"}));if(r.ok)await c.put(u,r)}));await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("deutsch-lernen-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;if(e.request.mode==="navigate"){e.respondWith(stalePage(e.request));return}if(["image","manifest"].includes(e.request.destination))e.respondWith(cacheFirst(e.request))});
async function stalePage(req){const c=await caches.open(CACHE);const cached=await c.match(PAGE);const network=fetch(req).then(async r=>{if(r.ok)await c.put(PAGE,r.clone());return r}).catch(()=>null);if(cached){network;return cached}return(await network)||new Response("<!doctype html><meta charset=utf-8><title>Deutsch offline</title><main style='font:16px system-ui;padding:2rem'><h1>Deutsch lernen</h1><p>Open the course once while online so it can be cached.</p></main>",{status:503,headers:{"Content-Type":"text/html;charset=utf-8"}})}
async function cacheFirst(req){const c=await caches.open(CACHE),hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r}
