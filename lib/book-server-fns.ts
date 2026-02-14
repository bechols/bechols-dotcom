import { createServerFn } from "@tanstack/react-start";
import {
  getCurrentlyReadingFromDB,
  getRecentlyReadPaginatedFromDB,
  getWantToReadFromDB,
  getGenreAnalyticsFromDB,
  transformDBBookToBookInfo,
  type GenreAnalytics,
} from "@/lib/database-queries";
import { fetchGoodreadsShelf } from "@/src/lib/goodreads-api";
import { getDatabase } from "@/lib/database";
import type { BookInfo } from "@/src/types/book-types";

// Want-to-read books (all at once for client-side filtering)
export const getAllWantToRead = createServerFn({
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

// Currently reading books
export const getCurrentBooks = createServerFn({
  method: "GET",
}).handler(async (): Promise<BookInfo[]> => {
  try {
    const dbBooks = await getCurrentlyReadingFromDB();
    if (dbBooks.length > 0) {
      return dbBooks.map(transformDBBookToBookInfo);
    }

    console.log(
      "Database empty, falling back to Goodreads API for currently reading",
    );
    return fetchGoodreadsShelf({ shelf: "currently-reading" });
  } catch (error: unknown) {
    console.error(
      "Error fetching current books from database, falling back to API:",
      error,
    );
    return fetchGoodreadsShelf({ shelf: "currently-reading" });
  }
});

// Paginated recently read books
export const getRecentBooksPaginated = createServerFn({
  method: "GET",
})
  .validator((input: unknown): number => {
    if (typeof input !== "number") {
      throw new Error("Page parameter must be a number");
    }
    return input;
  })
  .handler(
    async ({
      data: pageParam,
    }): Promise<{ books: BookInfo[]; nextCursor: number | null }> => {
      try {
        const limit = 20;
        const offset = pageParam * limit;

        const result = await getRecentlyReadPaginatedFromDB(limit, offset);

        if (result.books.length > 0) {
          return {
            books: result.books.map(transformDBBookToBookInfo),
            nextCursor: result.hasMore ? pageParam + 1 : null,
          };
        }

        // Fallback to API if database is empty (only first page)
        if (pageParam === 0) {
          console.log(
            "Database empty, falling back to Goodreads API for recent books",
          );
          const apiBooks = await fetchGoodreadsShelf({
            shelf: "read",
            includeRating: true,
            includeReview: true,
          });
          return { books: apiBooks, nextCursor: null };
        }

        return { books: [], nextCursor: null };
      } catch (error: unknown) {
        console.error("Error fetching paginated recent books:", error);
        return { books: [], nextCursor: null };
      }
    },
  );

// Analytics data
export type AnalyticsData = {
  totalBooks: number;
  averageRating: number;
  booksThisYear: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
  readingActivity: Array<{ date_started: string; books: number }>;
  availableYears: number[];
  genreAnalytics: GenreAnalytics[];
};

export const getAnalyticsData = createServerFn({
  method: "GET",
}).handler(async (): Promise<AnalyticsData> => {
  const db = await getDatabase();

  if (!db) {
    console.warn("Database not available, returning empty analytics data");
    return {
      totalBooks: 0,
      averageRating: 0,
      booksThisYear: 0,
      ratingDistribution: [],
      topAuthors: [],
      readingActivity: [],
      availableYears: [],
      genreAnalytics: [],
    };
  }

  const totalBooksResult = db
    .prepare(
      `
    SELECT COUNT(DISTINCT b.id) as count
    FROM books b
    INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = 'read'
  `
    )
    .get() as { count: number };

  const avgRatingResult = db
    .prepare(
      `
    SELECT AVG(r.rating) as avg_rating
    FROM reviews r
    WHERE r.shelf = 'read' AND r.rating IS NOT NULL
  `
    )
    .get() as { avg_rating: number | null };

  const currentYear = new Date().getFullYear().toString();
  const booksThisYear = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM reviews r
    WHERE r.shelf = 'read'
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
      AND substr(COALESCE(date_read, date_started, date_added), 1, 4) = ?
  `
    )
    .get(currentYear) as { count: number };

  const ratingDistribution = db
    .prepare(
      `
    SELECT
      r.rating,
      COUNT(*) as count
    FROM reviews r
    WHERE r.shelf = 'read' AND r.rating IS NOT NULL
    GROUP BY r.rating
    ORDER BY r.rating
  `
    )
    .all() as Array<{ rating: number; count: number }>;

  const topAuthors = db
    .prepare(
      `
    SELECT
      b.author,
      COUNT(*) as count
    FROM books b
    INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = 'read'
    GROUP BY b.author
    ORDER BY count DESC
    LIMIT 10
  `
    )
    .all() as Array<{ author: string; count: number }>;

  const readingActivity = db
    .prepare(
      `
    SELECT
      COALESCE(date_read, date_started, date_added) as date_started,
      COUNT(*) as books
    FROM reviews r
    WHERE r.shelf = 'read'
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
    GROUP BY COALESCE(date_read, date_started, date_added)
    ORDER BY COALESCE(date_read, date_started, date_added)
  `
    )
    .all() as Array<{ date_started: string; books: number }>;

  const availableYearsResult = db
    .prepare(
      `
    SELECT DISTINCT substr(COALESCE(date_read, date_started, date_added), 1, 4) as year
    FROM reviews r
    WHERE r.shelf = 'read'
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
      AND substr(COALESCE(date_read, date_started, date_added), 1, 4) IS NOT NULL
    ORDER BY year
  `
    )
    .all() as Array<{ year: string }>;

  const availableYears = availableYearsResult
    .map((row) => parseInt(row.year))
    .filter((year) => !isNaN(year));

  const genreAnalytics = await getGenreAnalyticsFromDB();

  return {
    totalBooks: totalBooksResult.count,
    averageRating: avgRatingResult.avg_rating ?? 0,
    booksThisYear: booksThisYear.count,
    ratingDistribution,
    topAuthors,
    readingActivity,
    availableYears,
    genreAnalytics,
  };
});
