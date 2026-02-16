// Service Worker — static-asset-only caching
// React Query + localStorage persistence handles data caching;
// this SW only caches the app shell (JS, CSS, fonts, images).
const CACHE_NAME = "bechols-static-v2";

// File extensions to cache (Vite hashes these, so cache-first is safe)
const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".woff2",
  ".woff",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".webp",
];

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

// Install — skip waiting to activate immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate — clean up old caches (including the old catch-all v1 cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && !name.startsWith("transformers")) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch — cache-first for static assets, network-only for everything else
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  const url = new URL(event.request.url);

  // Only cache same-origin static assets
  if (url.origin !== self.location.origin) return;
  if (!isStaticAsset(event.request.url)) return;

  // Cache-first: static assets have hashed filenames from Vite
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
