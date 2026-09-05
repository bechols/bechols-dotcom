import { createServerFn } from "@tanstack/react-start";
import {
  getCurrentlyReadingFromDB,
  getRecentlyReadPaginatedFromDB,
  getWantToReadFromDB,
  getGenreAnalyticsFromDB,
  transformDBBookToBookInfo,
  type GenreAnalytics,
} from "@/lib/database-queries";
import { getDatabase } from "@/lib/database";
import type { BookInfo } from "@/src/types/book-types";

// A successful empty query is authoritative. Failures must reach React Query
// so it can retain cached data and retry rather than cache a false empty shelf.
export const getAllWantToRead = createServerFn({ method: "GET" }).handler(
  async (): Promise<BookInfo[]> =>
    (await getWantToReadFromDB()).map(transformDBBookToBookInfo),
);

export const getCurrentBooks = createServerFn({ method: "GET" }).handler(
  async (): Promise<BookInfo[]> =>
    (await getCurrentlyReadingFromDB()).map(transformDBBookToBookInfo),
);

export const getRecentBooksPaginated = createServerFn({ method: "GET" })
  .validator((input: unknown): number => {
    if (
      typeof input !== "number" ||
      !Number.isSafeInteger(input) ||
      input < 0 ||
      input > Math.floor(Number.MAX_SAFE_INTEGER / 20)
    ) {
      throw new Error("Page parameter must be a non-negative safe integer");
    }
    return input;
  })
  .handler(
    async ({
      data: pageParam,
    }): Promise<{ books: BookInfo[]; nextCursor: number | null }> => {
      const result = await getRecentlyReadPaginatedFromDB(20, pageParam * 20);
      return {
        books: result.books.map(transformDBBookToBookInfo),
        nextCursor: result.hasMore ? pageParam + 1 : null,
      };
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

  const totalBooksResult = db
    .prepare(
      `
    SELECT COUNT(DISTINCT b.id) as count
    FROM books b
    INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = 'read'
  `,
    )
    .get() as { count: number };

  const avgRatingResult = db
    .prepare(
      `
    SELECT AVG(r.rating) as avg_rating
    FROM reviews r
    WHERE r.shelf = 'read' AND r.rating IS NOT NULL
  `,
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
  `,
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
  `,
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
  `,
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
  `,
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
  `,
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
