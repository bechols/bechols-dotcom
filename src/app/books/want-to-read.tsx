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
import { useInfiniteQuery } from "@tanstack/react-query";

// Server function to get paginated want-to-read books
const getWantToReadPaginated = createServerFn({
  method: "GET",
})
  .validator(
    (
      input: unknown,
    ): {
      pageParam: number;
      sortBy: "title" | "author" | "date_added";
      sortOrder: "asc" | "desc";
      titleFilter: string;
      authorFilter: string;
    } => {
      if (typeof input !== "object" || input === null) {
        throw new Error("Invalid input parameters");
      }

      const params = input as any;

      return {
        pageParam: typeof params.pageParam === "number" ? params.pageParam : 0,
        sortBy: ["title", "author", "date_added"].includes(params.sortBy)
          ? params.sortBy
          : "date_added",
        sortOrder: ["asc", "desc"].includes(params.sortOrder)
          ? params.sortOrder
          : "desc",
        titleFilter:
          typeof params.titleFilter === "string" ? params.titleFilter : "",
        authorFilter:
          typeof params.authorFilter === "string" ? params.authorFilter : "",
      };
    },
  )
  .handler(
    async ({
      data: { pageParam, sortBy, sortOrder, titleFilter, authorFilter },
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
          titleFilter,
          authorFilter,
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
            "Database empty, falling back to Goodreads API for want-to-read books",
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
    },
  );

export const Route = createFileRoute("/books/want-to-read")({
  component: WantToRead,
});

function WantToRead() {
  const [sortBy, setSortBy] = useState<"title" | "author" | "date_added">(
    "date_added",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [titleFilter, setTitleFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [debouncedTitleFilter, setDebouncedTitleFilter] = useState("");
  const [debouncedAuthorFilter, setDebouncedAuthorFilter] = useState("");

  // Debounce the filter inputs for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTitleFilter(titleFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [titleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAuthorFilter(authorFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [authorFilter]);

  const {
    data: wantToReadData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "wantToRead",
      sortBy,
      sortOrder,
      debouncedTitleFilter,
      debouncedAuthorFilter,
    ],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await getWantToReadPaginated({
        data: {
          pageParam,
          sortBy,
          sortOrder,
          titleFilter: debouncedTitleFilter,
          authorFilter: debouncedAuthorFilter,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor;
    },
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
      { threshold: 1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    setTitleFilter("");
    setAuthorFilter("");
    setSortBy("date_added");
    setSortOrder("desc");
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl md:text-3xl font-bold">Want to Read</h1>

      {/* Mobile-optimized search and filters */}
      <div className="space-y-4">
        {/* Search inputs */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search titles..."
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search authors..."
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="pl-10"
            />
          </div>
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
          {(titleFilter ||
            authorFilter ||
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
