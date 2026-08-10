'use strict';
const LEGACY_CACHE_PREFIX='story-lyrics-';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(LEGACY_CACHE_PREFIX)).map(key=>caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
})()));
// Intentionally no fetch handler: LINA now runs directly from the production app.
