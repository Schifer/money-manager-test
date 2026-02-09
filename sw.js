// sw.js
const CACHE_NAME = 'money-manager-v1';
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
