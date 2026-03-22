// 의전 마스터 Service Worker v2.0
var CACHE_NAME = 'protocol-master-v2';
var urlsToCache = ['./', './index.html'];

// Install: cache app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
          .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for Firebase API, cache-first for app shell
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Network-first for Firebase/API calls
  if (url.indexOf('firebaseio.com') >= 0 ||
      url.indexOf('api.emailjs.com') >= 0 ||
      url.indexOf('api.github.com') >= 0 ||
      url.indexOf('api.jsonbin.io') >= 0) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({error: 'offline'}), {
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(fetchResponse) {
        // Cache new resources
        if (fetchResponse && fetchResponse.status === 200) {
          var responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(function() {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
