import { pageHead } from "@/lib/page-head";
import { BookDataError, BookRefreshError } from "@/components/BookDataError";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import type { BookInfo } from "@/src/types/book-types";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import {
  currentBooksQueryOptions,
  recentBooksQueryOptions,
} from "@/lib/book-queries";

export const Route = createFileRoute("/books/")({
  head: () =>
    pageHead(
      "/books",
      "Reading List | Ben Echols",
      "Books Ben Echols is currently reading and has recently read, with ratings and reviews.",
    ),
  errorComponent: BookDataError,
  component: Books,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(currentBooksQueryOptions()),
      context.queryClient.prefetchInfiniteQuery(recentBooksQueryOptions()),
    ]);
  },
});

function Books() {
  const {
    data: currentBooks,
    isError: currentError,
    refetch: refetchCurrent,
    isFetching: fetchingCurrent,
  } = useSuspenseQuery(currentBooksQueryOptions());

  const {
    data: recentBooksData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError: recentError,
    isFetchNextPageError,
    refetch: refetchRecent,
    isFetching: fetchingRecent,
  } = useSuspenseInfiniteQuery(recentBooksQueryOptions());

  const recentBooks =
    recentBooksData?.pages.flatMap((page) => page.books) ?? [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !recentError
        ) {
          void fetchNextPage();
        }
      },
      { threshold: 1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, recentError]);

  return (
    <div className="space-y-6">
      {currentError && (
        <BookRefreshError
          retry={() => void refetchCurrent()}
          pending={fetchingCurrent}
        />
      )}
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-4">
          Currently reading
        </h2>
        <div className="space-y-6">
          {currentBooks.map((bookInfo: BookInfo, index: number) => (
            <BookCard
              key={bookInfo.title}
              {...bookInfo}
              loading={index === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        {currentBooks.length === 0 && (
          <div className="text-lg">{`I’m not reading anything right now.`}</div>
        )}
      </div>

      {recentBooks.length > 0 && (
        <div id="recently-read-section">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Recently read
          </h2>

          <div className="space-y-6">
            {recentBooks.map((bookInfo: BookInfo, index: number) => (
              <div key={`${bookInfo.title}-${index}`}>
                <BookCard
                  {...bookInfo}
                  loading={
                    currentBooks.length === 0 && index === 0 ? "eager" : "lazy"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {recentError && (
        <BookRefreshError
          retry={() =>
            void (isFetchNextPageError ? fetchNextPage() : refetchRecent())
          }
          pending={fetchingRecent}
        />
      )}

      {/* Loading and infinite scroll trigger */}
      {hasNextPage && !recentError && (
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

      {recentBooks.length === 0 && (
        <div className="text-lg py-6">No recently read books found.</div>
      )}
    </div>
  );
}
