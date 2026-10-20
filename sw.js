/* Offline app shell. No background sync, remote endpoints, or image caches. */
const CACHE_NAME='pixellilt-shell-v3';
const CORE=['./','./index.html','./styles.css','./src/app.js','./src/core.js','./src/zip.js','./assets/favicon.svg','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    // Cache only our app assets; never user files, blob URLs, or external content.
    if(response.ok && CORE.some(path=>new URL(path,self.location.href).href===event.request.url)) {
      const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  })));
});
