const CACHE_NAME = "solonote-v3-9-cache";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json?v=390",
  "./css/style.css?v=390",
  "./js/config.js?v=390",
  "./js/auth.js?v=390",
  "./js/storage.js?v=390",
  "./js/ui.js?v=390",
  "./js/app.js?v=390",
  "./js/pwa.js?v=390",
  "./icons/icon-192.png?v=390",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const request = event.request;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put("./index.html", responseClone)
          );
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then(
            (cachedResponse) =>
              cachedResponse || caches.match("./index.html")
          )
        )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(request, responseClone)
          );
        }

        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
