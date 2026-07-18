const CACHE_NAME = "hoonnote-v4-3-3-cache";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json?v=433",
  "./css/style.css?v=433",
  "./js/config.js?v=433",
  "./js/auth.js?v=433",
  "./js/storage.js?v=433",
  "./js/ui.js?v=433",
  "./js/app.js?v=433",
  "./js/account.js?v=433",
  "./js/pwa.js?v=433",
  "./icons/icon-192.png?v=433",
  "./icons/icon-512.png",
  "./legal/legal.css?v=433",
  "./legal/privacy.html",
  "./legal/terms.html",
  "./support/index.html",
  "./support/delete-account.html"
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

  const request = event.request;
  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    const scopePath = new URL(self.registration.scope).pathname;
    const isAppShellNavigation =
      requestUrl.pathname === scopePath ||
      requestUrl.pathname === `${scopePath}index.html`;

    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request, { ignoreSearch: true });
          if (cachedResponse) {
            return cachedResponse;
          }
          if (isAppShellNavigation) {
            return caches.match("./index.html");
          }
          return new Response("오프라인 상태에서는 이 페이지를 처음 열 수 없습니다.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
