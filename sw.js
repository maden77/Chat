const CACHE_NAME = 'securechat-v2';
const ASSETS = [
    '/chat/',
    '/chat/index.html',
    '/chat/style.css',
    '/chat/script.js',
    '/chat/crypto-utils.js',
    '/chat/manifest.json',
    '/chat/icon-192.png',
    '/chat/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => caches.match('/chat/index.html'))
    );
});