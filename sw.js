// sw.js - Service Worker (Optimized v0.4 Stable)

const CACHE_NAME = 'money-manager-v0.4-stable';

// Core assets to pre-load
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './utils.js',
    './render.js',
    './manifest.json',
    // Cache External CDN libraries for offline usage
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2'
];

// 1. INSTALL: Cache everything immediately
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activation
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching App Shell v0.4');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ACTIVATE: Delete old caches (v0.2, v0.3, etc.) to free space
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// 3. FETCH: Stale-While-Revalidate Strategy
// (Serve from cache instantly, but update cache from network in background)
self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS (ignore chrome-extension schemes)
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Return cached response immediately if found
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // 2. Check if network response is valid
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // 3. Update cache with new version
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Network failed? That's fine, we already served the cache.
            });

            return cachedResponse || fetchPromise;
        })
    );
});
