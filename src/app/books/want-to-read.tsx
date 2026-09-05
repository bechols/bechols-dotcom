import { pageHead } from "@/lib/page-head";
import { BookDataError, BookRefreshError } from "@/components/BookDataError";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SortAsc, SortDesc, Filter } from "lucide-react";
import type { BookInfo } from "@/src/types/book-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  GENRE_HIERARCHY,
  formatGenreName,
} from "@/lib/genre-hierarchy";
import { wantToReadQueryOptions } from "@/lib/book-queries";

export const Route = createFileRoute("/books/want-to-read")({
  head: () =>
    pageHead(
      "/books/want-to-read",
      "Want to Read | Ben Echols",
      "Browse and search the books on Ben Echols’s want-to-read list.",
    ),
  errorComponent: BookDataError,
  component: WantToRead,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(wantToReadQueryOptions());
  },
});

function WantToRead() {
  const {
    data: allBooks,
    isError,
    refetch,
    isFetching,
  } = useSuspenseQuery(wantToReadQueryOptions());
  const [sortBy, setSortBy] = useState<"title" | "author" | "date_added">(
    "date_added"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useState("");
  const [displayCount, setDisplayCount] = useState(40);
  const [selectedGenre, setSelectedGenre] = useState<string>("");

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchFilter(searchFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(40);
  }, [debouncedSearchFilter, sortBy, sortOrder, selectedGenre]);

  // Group genres by parent category using the hierarchy
  const genreHierarchy = useMemo(() => {
    const genreCounts = new Map<string, number>();
    for (const book of allBooks ?? []) {
      for (const genre of book.genres ?? []) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    // Organize genres into parent categories
    const hierarchy: Record<
      string,
      { children: Array<{ genre: string; count: number }>; totalCount: number }
    > = {};

    for (const [parent, config] of Object.entries(GENRE_HIERARCHY)) {
      const children = config.children
        .map((genre) => ({
          genre,
          count: genreCounts.get(genre) ?? 0,
        }))
        .filter((g) => g.count > 0) // Only show genres with books
        .sort((a, b) => b.count - a.count); // Sort by count within category

      if (children.length > 0) {
        const totalCount = children.reduce((sum, g) => sum + g.count, 0);
        hierarchy[parent] = { children, totalCount };
      }
    }

    return hierarchy;
  }, [allBooks]);

  // Client-side search, sort, and genre filtering
  const filteredBooks = useMemo(() => {
    let books = allBooks ?? [];

    // Filter by search term
    if (debouncedSearchFilter) {
      const lower = debouncedSearchFilter.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(lower) ||
          b.author.toLowerCase().includes(lower)
      );
    }

    // Filter by selected genre (child genre or parent category)
    if (selectedGenre) {
      // Check if it's a parent category
      const parentConfig = GENRE_HIERARCHY[selectedGenre];
      if (parentConfig) {
        // Filter by any child genre in this parent category
        const childGenres = new Set(parentConfig.children);
        books = books.filter((b) =>
          (b.genres ?? []).some((g) => childGenres.has(g))
        );
      } else {
        // Filter by specific child genre
        books = books.filter((b) => (b.genres ?? []).includes(selectedGenre));
      }
    }

    // Sort
    books = [...books].sort((a, b) => {
      const cmp =
        sortBy === "date_added"
          ? (a.dateAdded ?? "").localeCompare(b.dateAdded ?? "")
          : sortBy === "author"
            ? (() => {
                const lastNameA = a.author.split(" ").pop() ?? a.author;
                const lastNameB = b.author.split(" ").pop() ?? b.author;
                return lastNameA.localeCompare(lastNameB) || a.author.localeCompare(b.author);
              })()
            : a.title.localeCompare(b.title);
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return books;
  }, [allBooks, debouncedSearchFilter, sortBy, sortOrder, selectedGenre]);

  // Virtual infinite scroll via displayCount
  const displayedBooks = filteredBooks.slice(0, displayCount);
  const hasMore = displayCount < filteredBooks.length;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount((prev) => prev + 20);
        }
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

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
    setSelectedGenre("");
  };

  const hasActiveFilters =
    searchFilter ||
    sortBy !== "date_added" ||
    sortOrder !== "desc" ||
    selectedGenre !== "";

  return (
    <div className="flex flex-col gap-4 pb-6">
      {isError && (
        <BookRefreshError retry={() => void refetch()} pending={isFetching} />
      )}
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

        {/* Genre filter dropdown with hierarchy */}
        {Object.keys(genreHierarchy).length > 0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              aria-label="Filter by genre"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-williams-purple focus:border-transparent"
            >
              <option value="">All genres</option>
              {Object.entries(genreHierarchy).map(
                ([parent, { children, totalCount }]) => (
                  <optgroup key={parent} label={parent}>
                    <option value={parent}>
                      All {parent} ({totalCount})
                    </option>
                    {children.map(({ genre, count }) => (
                      <option key={genre} value={genre}>
                        {formatGenreName(genre)} ({count})
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>
        )}

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
          {hasActiveFilters && (
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

      {/* Compact list view — no cover images for offline reliability */}
      <div className="space-y-1">
        {displayedBooks.map((bookInfo: BookInfo, index: number) => (
          <div
            key={`${bookInfo.title}-${index}`}
            className="border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm leading-tight truncate">
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
              {bookInfo.genres && bookInfo.genres.length > 0 && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 shrink-0">
                  {formatGenreName(bookInfo.genres[0])}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <div className="text-sm text-gray-400">Loading more...</div>
        </div>
      )}

      {filteredBooks.length === 0 && (
        <div className="text-lg py-6">
          {debouncedSearchFilter || selectedGenre
            ? "No books match your filters."
            : "No books found on your want-to-read list."}
        </div>
      )}

      {/* Results count */}
      {displayedBooks.length > 0 && (
        <div className="text-sm text-gray-500 py-4 text-center">
          Showing {displayedBooks.length} of {filteredBooks.length} book
          {filteredBooks.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
