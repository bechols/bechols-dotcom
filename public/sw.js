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

// Fetch event - serve from cache, fallback to network
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
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If fetch fails and we're offline, try to return a cached version
          // This helps with navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/").then((cached) => {
              return cached || new Response("Offline - no cached page available", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              });
            });
          }
          // For other requests, return a network error
          return new Response("Network error", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});

