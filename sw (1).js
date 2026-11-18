// Family Care — lets the app open with no signal.
// Only caches the app itself; health data never passes through here.
const CACHE = 'family-care-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('family-care-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // Supabase etc. go straight to the network
  // Try the network first (so updates arrive), give up after 4s, then use the saved copy
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(e.request), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
    }
  })());
});
