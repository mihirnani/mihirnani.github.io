"use strict";
const CACHE="lingua-latina-v1";
const ASSETS=["./lingua-latina.html","./lingua-latina-manifest.json","./lingua-latina-icon-180.png","./lingua-latina-icon-192.png","./lingua-latina-icon-512.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(caches.match(event.request).then(hit=>{
    const network=fetch(event.request).then(resp=>{
      if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}
      return resp
    }).catch(()=>hit);
    return hit||network
  }))
});