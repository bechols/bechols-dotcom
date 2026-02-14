import { createFileRoute } from "@tanstack/react-router";
import {
  getWantToReadFromDB,
  transformDBBookToBookInfo,
} from "@/lib/database-queries";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SortAsc, SortDesc, Filter, Tag } from "lucide-react";
import type { BookInfo } from "@/src/types/book-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createServerFn } from "@tanstack/react-start";
import { fetchGoodreadsShelf } from "@/src/lib/goodreads-api";
import { useQuery } from "@tanstack/react-query";

// Server function to get ALL want-to-read books in one shot
const getAllWantToRead = createServerFn({
  method: "GET",
}).handler(async (): Promise<BookInfo[]> => {
  try {
    const dbBooks = await getWantToReadFromDB();

    if (dbBooks.length > 0) {
      return dbBooks.map(transformDBBookToBookInfo);
    }

    // Fallback to API if database is empty
    console.log(
      "Database empty, falling back to Goodreads API for want-to-read books"
    );
    return await fetchGoodreadsShelf({ shelf: "to-read" });
  } catch (error: unknown) {
    console.error("Error fetching want-to-read books:", error);
    return [];
  }
});

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
  const [displayCount, setDisplayCount] = useState(40);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [showAllGenres, setShowAllGenres] = useState(false);

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
  }, [debouncedSearchFilter, sortBy, sortOrder, selectedGenres]);

  const { data: allBooks, status } = useQuery({
    queryKey: ["allWantToRead"],
    queryFn: async () => await getAllWantToRead(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    networkMode: "offlineFirst",
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Compute available genres sorted by frequency
  const availableGenres = useMemo(() => {
    const genreCounts = new Map<string, number>();
    for (const book of allBooks ?? []) {
      for (const genre of book.genres ?? []) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }
    return [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
  }, [allBooks]);

  const VISIBLE_GENRE_COUNT = 12;
  const displayedGenres = showAllGenres
    ? availableGenres
    : availableGenres.slice(0, VISIBLE_GENRE_COUNT);

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

    // Filter by selected genres (AND logic — book must match all selected)
    if (selectedGenres.size > 0) {
      books = books.filter((b) => {
        const bookGenres = new Set(b.genres ?? []);
        for (const genre of selectedGenres) {
          if (!bookGenres.has(genre)) return false;
        }
        return true;
      });
    }

    // Sort
    books = [...books].sort((a, b) => {
      const cmp =
        sortBy === "date_added"
          ? (a.dateAdded ?? "").localeCompare(b.dateAdded ?? "")
          : sortBy === "author"
            ? a.author.localeCompare(b.author)
            : a.title.localeCompare(b.title);
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return books;
  }, [allBooks, debouncedSearchFilter, sortBy, sortOrder, selectedGenres]);

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

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchFilter("");
    setSortBy("date_added");
    setSortOrder("desc");
    setSelectedGenres(new Set());
  };

  const hasActiveFilters =
    searchFilter ||
    sortBy !== "date_added" ||
    sortOrder !== "desc" ||
    selectedGenres.size > 0;

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

        {/* Genre filter chips */}
        {availableGenres.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Genres
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedGenres.map(({ genre, count }) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedGenres.has(genre)
                      ? "bg-williams-purple text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {genre.replace(/-/g, " ")}
                  <span
                    className={`text-[10px] ${selectedGenres.has(genre) ? "text-white/70" : "text-gray-400"}`}
                  >
                    {count}
                  </span>
                </button>
              ))}
              {availableGenres.length > VISIBLE_GENRE_COUNT && (
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {showAllGenres
                    ? "Show less"
                    : `+${availableGenres.length - VISIBLE_GENRE_COUNT} more`}
                </button>
              )}
            </div>
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
                <div className="flex flex-wrap gap-1 shrink-0">
                  {bookInfo.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500"
                    >
                      {genre.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {status === "pending" && (
        <div className="flex justify-center py-8">
          <div className="text-lg">Loading books...</div>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <div className="text-sm text-gray-400">Loading more...</div>
        </div>
      )}

      {status === "success" && filteredBooks.length === 0 && (
        <div className="text-lg py-6">
          {debouncedSearchFilter || selectedGenres.size > 0
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
