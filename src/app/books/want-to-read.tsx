import { createFileRoute } from "@tanstack/react-router";
import {
  getWantToReadPaginatedFromDB,
  transformDBBookToBookInfo,
} from "@/lib/database-queries";
import { useEffect, useRef, useState } from "react";
import { Search, SortAsc, SortDesc, Filter } from "lucide-react";
import type { BookInfo } from "@/src/types/book-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createServerFn } from "@tanstack/react-start";
import { fetchGoodreadsShelf } from "@/src/lib/goodreads-api";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

// Server function to get paginated want-to-read books
const getWantToReadPaginated = createServerFn({
  method: "GET",
})
  .validator(
    (
      input: unknown
    ): {
      pageParam: number;
      sortBy: "title" | "author" | "date_added";
      sortOrder: "asc" | "desc";
      searchFilter: string;
    } => {
      if (typeof input !== "object" || input === null) {
        throw new Error("Invalid input parameters");
      }

      const params = input as {
        pageParam?: number;
        sortBy?: string;
        sortOrder?: string;
        searchFilter?: string;
      };

      return {
        pageParam: typeof params.pageParam === "number" ? params.pageParam : 0,
        sortBy: ["title", "author", "date_added"].includes(params.sortBy)
          ? (params.sortBy as "title" | "author" | "date_added")
          : "date_added",
        sortOrder: ["asc", "desc"].includes(params.sortOrder)
          ? (params.sortOrder as "asc" | "desc")
          : "desc",
        searchFilter:
          typeof params.searchFilter === "string" ? params.searchFilter : "",
      };
    }
  )
  .handler(
    async ({
      data: { pageParam, sortBy, sortOrder, searchFilter },
    }): Promise<{ books: BookInfo[]; nextCursor: number | null }> => {
      try {
        const limit = 20;
        const offset = pageParam * limit;

        // Try database first
        const result = await getWantToReadPaginatedFromDB(
          limit,
          offset,
          sortBy,
          sortOrder,
          searchFilter
        );

        if (result.books.length > 0) {
          return {
            books: result.books.map(transformDBBookToBookInfo),
            nextCursor: result.hasMore ? pageParam + 1 : null,
          };
        }

        // Fallback to API if database is empty (only first page)
        if (pageParam === 0) {
          console.log(
            "Database empty, falling back to Goodreads API for want-to-read books"
          );
          const apiBooks = await fetchGoodreadsShelf({
            shelf: "to-read",
          });
          return { books: apiBooks, nextCursor: null };
        }

        return { books: [], nextCursor: null };
      } catch (error: unknown) {
        console.error("Error fetching paginated want-to-read books:", error);
        return { books: [], nextCursor: null };
      }
    }
  );

export const Route = createFileRoute("/books/want-to-read")({
  component: WantToRead,
});

function WantToRead() {
  const [sortBy, setSortBy] = useState<"title" | "author" | "date_added">(
    "date_added"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useState("");
  const queryClient = useQueryClient();

  // Debounce the search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchFilter(searchFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  const {
    data: wantToReadData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    // refetch,
  } = useInfiniteQuery({
    queryKey: ["wantToRead", sortBy, sortOrder, debouncedSearchFilter],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await getWantToReadPaginated({
        data: {
          pageParam,
          sortBy,
          sortOrder,
          searchFilter: debouncedSearchFilter,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor;
    },
    // Offline-first configuration
    staleTime: 60 * 60 * 1000, // 1 hour - data is fresh for 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep cached data for 24 hours
    placeholderData: (previousData) => previousData, // Show previous data while fetching
    refetchOnMount: true, // Refetch when component mounts (if online)
    refetchOnWindowFocus: false, // Don't refetch on window focus (already in default options)
    networkMode: "offlineFirst", // Use cached data when offline, fetch when online
  });

  const wantToReadBooks =
    wantToReadData?.pages.flatMap((page) => page.books) ?? [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Background load all books for the current view when online
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const preloadAllBooksForCurrentView = async () => {
      // Only preload when online
      if (!navigator.onLine) return;

      // Preload for the CURRENT view (current sort/filter)
      const currentQueryKey = [
        "wantToRead",
        sortBy,
        sortOrder,
        debouncedSearchFilter,
      ];

      // Check if we've already loaded all pages for this view
      const currentQueryData = queryClient.getQueryData(currentQueryKey) as
        | {
            pages: Array<{ books: BookInfo[]; nextCursor: number | null }>;
            pageParams: number[];
          }
        | undefined;

      // Check if all pages are already loaded (no nextCursor on last page)
      if (
        currentQueryData?.pages.length &&
        currentQueryData.pages[currentQueryData.pages.length - 1]
          ?.nextCursor === null
      ) {
        return; // Already fully loaded
      }

      // Don't interfere if the query is actively fetching (user might be scrolling)
      // But we can still preload in the background
      const currentQueryState = queryClient.getQueryState(currentQueryKey);
      // Continue even if pending - we'll just add to what's already loading

      // Start background preload for current view
      let pageParam = 0;
      let hasMore = true;

      // Get existing pages if any, and determine where to start
      if (currentQueryData && currentQueryData.pages.length > 0) {
        const lastPage =
          currentQueryData.pages[currentQueryData.pages.length - 1];
        if (lastPage.nextCursor !== null) {
          pageParam = lastPage.nextCursor;
        } else {
          hasMore = false; // Already have all pages
        }
      }

      while (hasMore) {
        try {
          const result = await getWantToReadPaginated({
            data: {
              pageParam,
              sortBy,
              sortOrder,
              searchFilter: debouncedSearchFilter,
            },
          });

          // Update cache incrementally as we load, merging with existing data
          queryClient.setQueryData(currentQueryKey, (old: any) => {
            if (!old) {
              return {
                pages: [result],
                pageParams: [pageParam],
              };
            }
            // Merge with existing pages, avoiding duplicates
            const existingPageParams = new Set(old.pageParams || []);

            // Only add if this page isn't already cached
            if (!existingPageParams.has(pageParam)) {
              return {
                pages: [...(old.pages || []), result],
                pageParams: [...(old.pageParams || []), pageParam],
              };
            }

            // Page already exists, return unchanged
            return old;
          });

          hasMore = result.nextCursor !== null;
          if (hasMore && result.nextCursor !== null) {
            pageParam = result.nextCursor;
            // Small delay to avoid overwhelming the server
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error("Error preloading books:", error);
          break;
        }
      }
    };

    // Start preload immediately when online (don't wait)
    if (navigator.onLine) {
      // Start immediately - don't delay
      void preloadAllBooksForCurrentView();
    }

    // Also trigger preload when coming back online
    const handleOnline = () => {
      setTimeout(() => {
        void preloadAllBooksForCurrentView();
      }, 1000);
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [queryClient, sortBy, sortOrder, debouncedSearchFilter]);

  // Handle sort change
  const handleSort = (newSortBy: "title" | "author" | "date_added") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchFilter("");
    setSortBy("date_added");
    setSortOrder("desc");
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search titles and authors..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sortBy === "title" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("title")}
            className="flex items-center gap-1"
          >
            Title
            {sortBy === "title" &&
              (sortOrder === "asc" ? (
                <SortAsc className="h-3 w-3" />
              ) : (
                <SortDesc className="h-3 w-3" />
              ))}
          </Button>
          <Button
            variant={sortBy === "author" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("author")}
            className="flex items-center gap-1"
          >
            Author
            {sortBy === "author" &&
              (sortOrder === "asc" ? (
                <SortAsc className="h-3 w-3" />
              ) : (
                <SortDesc className="h-3 w-3" />
              ))}
          </Button>
          <Button
            variant={sortBy === "date_added" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("date_added")}
            className="flex items-center gap-1"
          >
            Date Added
            {sortBy === "date_added" &&
              (sortOrder === "asc" ? (
                <SortAsc className="h-3 w-3" />
              ) : (
                <SortDesc className="h-3 w-3" />
              ))}
          </Button>

          {/* Clear filters button */}
          {(searchFilter ||
            sortBy !== "date_added" ||
            sortOrder !== "desc") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              <Filter className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Mobile-optimized list view */}
      <div className="space-y-2">
        {wantToReadBooks.map((bookInfo: BookInfo, index: number) => (
          <div
            key={`${bookInfo.title}-${index}`}
            className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex gap-3">
              {/* Small book cover */}
              <div className="flex-shrink-0 w-12 h-16 bg-gray-200 rounded overflow-hidden">
                {bookInfo.imageURL && (
                  <img
                    src={bookInfo.imageURL}
                    alt={bookInfo.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Book info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight mb-1 truncate">
                  <a
                    href={bookInfo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {bookInfo.title}
                  </a>
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {bookInfo.author}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading and infinite scroll trigger */}
      {status === "pending" && (
        <div className="flex justify-center py-8">
          <div className="text-lg">Loading books...</div>
        </div>
      )}

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="text-lg">Loading more books...</div>
          ) : (
            <Button onClick={() => void fetchNextPage()} variant="outline">
              Load More
            </Button>
          )}
        </div>
      )}

      {status === "success" && wantToReadBooks.length === 0 && (
        <div className="text-lg py-6">
          No books found on your want-to-read list.
        </div>
      )}

      {/* Results count */}
      {wantToReadBooks.length > 0 && (
        <div className="text-sm text-gray-500 py-4 text-center">
          Showing {wantToReadBooks.length} book
          {wantToReadBooks.length !== 1 ? "s" : ""}
          {hasNextPage && " (load more to see all)"}
        </div>
      )}
    </div>
  );
}
