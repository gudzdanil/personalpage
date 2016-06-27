var CACHE_NAME = 'dependencies-cache';

// Files required to make this app work offline
var REQUIRED_FILES = [
    'img/c-asteroids-1.png',
    'img/c-asteroids-2.png',
    'img/c-asteroids-3.png',
    'img/c-asteroids-4.png',
    'img/c-asteroids-5.png',
    'img/c-asteroids-6.png',
    'style.js',
    'index.html'
];

self.addEventListener('activate', function(event) {
    // Calling claim() to force a "controllerchange" event on navigator.serviceWorker
    event.waitUntil(self.clients.claim());
});

self.addEventListener('install', function(event) {
    // Perform install step:  loading each required file into cache
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log(1, cache);
                // Add all offline dependencies to the cache
                return cache.addAll(REQUIRED_FILES);
            })
            .then(function() {
                console.log(2,arguments);
                // At this point everything has been cached
                return self.skipWaiting();
            })
    );
});

self.addEventListener('fetch', function(event) {
    console.log(3,event);
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                    console.log(4,response);
                    // Cache hit - return the response from the cached version
                    if (response) {
                        return response;
                    }

                    // Not in cache - return the result from the live server
                    // `fetch` is essentially a "fallback"
                    return fetch(event.request);
                }
            )
    );
});