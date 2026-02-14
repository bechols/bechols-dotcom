// Service Worker for offline support
const CACHE_NAME = "bechols-dotcom-v1";

// Install event - cache assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Helper function to check if a request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Cache all same-origin requests (JS, CSS, images, API calls)
  if (url.origin === self.location.origin) {
    return true;
  }
  
  // Don't cache external resources
  return false;
}

// Fetch event - stale-while-revalidate strategy
// Serve cached content immediately (fast/offline), update cache in background
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Only cache same-origin requests
  if (!shouldCache(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Always kick off a network fetch to update the cache for next time
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type !== "error"
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed - that's fine, we already served from cache
          return cachedResponse;
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || networkFetch.then((response) => {
        if (response) {
          return response;
        }
        // Nothing in cache and network failed
        if (event.request.mode === "navigate") {
          return new Response("Offline - no cached page available", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Network error", {
          status: 408,
          headers: { "Content-Type": "text/plain" },
        });
      });
    })
  );
});

