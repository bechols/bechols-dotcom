// Cache only same-origin static assets; data caching belongs to React Query.
const CACHE_NAME = "bechols-static-v3";
const STATIC_ASSET = /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webp)$/i;
// Vite emits fingerprinted build assets under /assets/.
const FINGERPRINTED_ASSET = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith("bechols-static-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname === "/sw.js" ||
    !STATIC_ASSET.test(url.pathname)
  )
    return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (FINGERPRINTED_ASSET.test(url.pathname) && cached) return cached;

      // Stable URLs revalidate with the network, retaining an offline fallback.
      try {
        const response = await fetch(event.request, { cache: "no-cache" });
        if (response.status === 200)
          await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});
