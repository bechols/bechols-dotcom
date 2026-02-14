import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import type { PersistedClient } from "@tanstack/query-persist-client-core";

// Custom persister using localStorage
function createLocalStoragePersister() {
  const STORAGE_KEY = "REACT_QUERY_OFFLINE_CACHE";

  return {
    persistClient: (client: PersistedClient): void => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(client));
        } catch (error) {
          console.error("Error persisting query client:", error);
        }
      }
    },
    restoreClient: (): PersistedClient | undefined => {
      if (typeof window !== "undefined") {
        try {
          const cached = window.localStorage.getItem(STORAGE_KEY);
          if (cached) {
            return JSON.parse(cached) as PersistedClient;
          }
        } catch (error) {
          console.error("Error restoring query client:", error);
        }
      }
      return undefined;
    },
    removeClient: (): void => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error("Error removing query client:", error);
        }
      }
    },
  };
}

// Build-time cache buster: changes on every deploy, invalidating stale localStorage
const CACHE_BUSTER = typeof __GIT_COMMIT_SHA__ !== "undefined" ? __GIT_COMMIT_SHA__ : "";

// Singleton QueryClient for client-side (with persistence)
let clientQueryClient: QueryClient | null = null;

export function createPersistentQueryClient(): QueryClient {
  // On client side, reuse the same QueryClient instance for persistence
  if (typeof window !== "undefined") {
    if (!clientQueryClient) {
      clientQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
            gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep cached data for 1 day
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnReconnect: true, // Refetch when network reconnects
            retry: 1, // Retry once on failure
          },
        },
      });

      // Set up persistence on client side
      const persister = createLocalStoragePersister();
      void persistQueryClient({
        queryClient: clientQueryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // Persist for 24 hours
        buster: CACHE_BUSTER, // Invalidate cache on new deploys
      });
    }
    return clientQueryClient;
  }

  // On server side, create a new QueryClient without persistence
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}

