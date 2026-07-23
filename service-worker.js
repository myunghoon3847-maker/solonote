const CACHE_NAME = "hoonnote-v4-5-13-1-cache";
const APP_CACHE_PREFIXES = ["hoonnote-", "solonote-"];

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json?v=464",
  "./css/style.css?v=464",
  "./js/config.js?v=464",
  "./js/auth.js?v=464",
  "./js/storage.js?v=464",
  "./js/ui.js?v=464",
  "./js/app.js?v=464",
  "./js/account.js?v=464",
  "./js/pwa.js?v=464",
  "./icons/logo-mark.svg?v=464",
  "./icons/brand-wordmark.svg?v=464",
  "./icons/settings-gear.png?v=464",
  "./icons/icon-192.png?v=464",
  "./icons/icon-512.png?v=464",
  "./icons/icon-maskable-192.png?v=464",
  "./icons/icon-maskable-512.png?v=464",
  "./icons/icon-monochrome-512.png?v=464",
  "./icons/apple-touch-icon.png?v=464",
  "./legal/legal.css?v=464",
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
          .filter(
            (cacheName) =>
              cacheName !== CACHE_NAME &&
              APP_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))
          )
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
      .catch(() => caches.match(request))
  );
});
