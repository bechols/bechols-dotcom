import { type BookWithReview, getDatabase } from "./database";
import type { BookInfo } from "@/src/types/book-types";
import { GENRE_HIERARCHY } from "./genre-hierarchy";

export interface GenreAnalytics {
  category: string; // Parent category name
  books: number; // Number of books read
  avgRating: number; // Average rating (1-5)
  stdDev: number; // Standard deviation of ratings
}

export async function getCurrentlyReadingFromDB(): Promise<BookWithReview[]> {
  try {
    const db = await getDatabase();

    const stmt = db.prepare(`
      SELECT 
        b.*,
        r.shelf,
        r.rating,
        r.review,
        r.date_added,
        r.date_read,
        r.date_started,
        r.read_count,
        r.owned
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = 'currently-reading'
      ORDER BY r.date_added DESC
    `);

    return stmt.all() as BookWithReview[];
  } catch (error) {
    console.error(
      "Error fetching currently reading books from database:",
      error,
    );
    throw error;
  }
}

export async function getRecentlyReadFromDB(
  limit: number = 10,
): Promise<BookWithReview[]> {
  try {
    const db = await getDatabase();

    const stmt = db.prepare(`
      SELECT 
        b.*,
        r.shelf,
        r.rating,
        r.review,
        r.date_added,
        r.date_read,
        r.date_started,
        r.read_count,
        r.owned
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = 'read' 
      ORDER BY r.date_read IS NULL, r.date_read DESC
      LIMIT ?
    `);

    return stmt.all(limit) as BookWithReview[];
  } catch (error) {
    console.error("Error fetching recently read books from database:", error);
    throw error;
  }
}

export async function getRecentlyReadPaginatedFromDB(
  limit: number = 10,
  offset: number = 0,
): Promise<{ books: BookWithReview[]; hasMore: boolean }> {
  try {
    const db = await getDatabase();

    // Ensure parameters are integers
    const safeLimit = Math.max(1, Math.floor(Number(limit)));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));

    console.log(`DB query: LIMIT ${safeLimit + 1} OFFSET ${safeOffset}`);

    // Get books with one extra to check if there are more
    const stmt = db.prepare(`
      SELECT 
        b.*,
        r.shelf,
        r.rating,
        r.review,
        r.date_added,
        r.date_read,
        r.date_started,
        r.read_count,
        r.owned
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = 'read' 
      ORDER BY r.date_read IS NULL, r.date_read DESC
      LIMIT ? OFFSET ?
    `);

    const results = stmt.all(safeLimit + 1, safeOffset) as BookWithReview[];
    const hasMore = results.length > safeLimit;
    const books = hasMore ? results.slice(0, safeLimit) : results;

    return { books, hasMore };
  } catch (error) {
    console.error(
      "Error fetching paginated recently read books from database:",
      error,
    );
    throw error;
  }
}

export async function getWantToReadFromDB(): Promise<BookWithReview[]> {
  try {
    const db = await getDatabase();

    const stmt = db.prepare(`
      SELECT
        b.*,
        r.shelf,
        r.rating,
        r.review,
        r.date_added,
        r.date_read,
        r.date_started,
        r.read_count,
        r.owned
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = 'to-read'
      ORDER BY r.date_added DESC
    `);

    const books = stmt.all() as BookWithReview[];
    return attachGenresToBooks(db, books);
  } catch (error) {
    console.error("Error fetching want to read books from database:", error);
    throw error;
  }
}

export async function getWantToReadPaginatedFromDB(
  limit: number = 20,
  offset: number = 0,
  sortBy: "title" | "author" | "date_added" = "date_added",
  sortOrder: "asc" | "desc" = "desc",
  searchFilter: string = "",
): Promise<{ books: BookWithReview[]; hasMore: boolean }> {
  try {
    const db = await getDatabase();

    // Ensure parameters are integers
    const safeLimit = Math.max(1, Math.floor(Number(limit)));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));

    // Build WHERE clause with filters
    let whereClause = "WHERE r.shelf = 'to-read'";
    const params: (string | number)[] = [];

    if (searchFilter) {
      whereClause += " AND (b.title LIKE ? OR b.author LIKE ?)";
      params.push(`%${searchFilter}%`, `%${searchFilter}%`);
    }

    // Build ORDER BY clause
    let orderClause = "ORDER BY ";
    switch (sortBy) {
      case "title":
        orderClause += `b.title ${sortOrder.toUpperCase()}`;
        break;
      case "author":
        orderClause += `b.author ${sortOrder.toUpperCase()}`;
        break;
      case "date_added":
      default:
        orderClause += `r.date_added ${sortOrder.toUpperCase()}`;
        break;
    }

    // Get books with one extra to check if there are more
    const stmt = db.prepare(`
      SELECT 
        b.*,
        r.shelf,
        r.rating,
        r.review,
        r.date_added,
        r.date_read,
        r.date_started,
        r.read_count,
        r.owned
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `);

    const results = stmt.all([
      ...params,
      safeLimit + 1,
      safeOffset,
    ]) as BookWithReview[];
    const hasMore = results.length > safeLimit;
    const books = hasMore ? results.slice(0, safeLimit) : results;

    return { books, hasMore };
  } catch (error) {
    console.error(
      "Error fetching paginated want to read books from database:",
      error,
    );
    throw error;
  }
}

// Attach genres from book_genres table to an array of books
function attachGenresToBooks<T extends { goodreads_id: string }>(
  db: import("better-sqlite3").Database,
  books: T[],
): (T & { genres?: string[] })[] {
  if (books.length === 0) return books;

  try {
    const genreStmt = db.prepare(`
      SELECT goodreads_id, genre
      FROM book_genres
      WHERE genre != '_none'
      ORDER BY position ASC
    `);

    const allGenres = genreStmt.all() as {
      goodreads_id: string;
      genre: string;
    }[];

    // Group genres by goodreads_id
    const genreMap = new Map<string, string[]>();
    for (const row of allGenres) {
      const existing = genreMap.get(row.goodreads_id);
      if (existing) {
        existing.push(row.genre);
      } else {
        genreMap.set(row.goodreads_id, [row.genre]);
      }
    }

    return books.map((book) => ({
      ...book,
      genres: genreMap.get(book.goodreads_id) ?? [],
    }));
  } catch (error) {
    // Older snapshots may legitimately predate genre enrichment.
    if (
      error instanceof Error &&
      error.message === "no such table: book_genres"
    ) {
      return books;
    }
    throw error;
  }
}

// Transform database format to match existing BookInfo interface
export function transformDBBookToBookInfo(dbBook: BookWithReview): BookInfo {
  return {
    title: dbBook.title,
    author: dbBook.author,
    link: `https://www.goodreads.com/book/show/${dbBook.goodreads_id}`,
    imageURL: dbBook.image_url ?? "",
    rating: dbBook.rating && dbBook.rating > 0 ? dbBook.rating : undefined,
    review: dbBook.review ?? undefined,
    dateStarted: dbBook.date_started ?? undefined,
    dateRead: dbBook.date_read ?? undefined,
    isbn: dbBook.isbn ?? undefined,
    dateAdded: dbBook.date_added ?? undefined,
    genres: dbBook.genres ?? [],
  };
}

// Helper to find parent category for a genre
function findParentCategory(genre: string): string | null {
  for (const [parent, config] of Object.entries(GENRE_HIERARCHY)) {
    if (config.children.includes(genre)) {
      return parent;
    }
  }
  return null;
}

// Get genre analytics data: average rating and book count per parent category
export async function getGenreAnalyticsFromDB(): Promise<GenreAnalytics[]> {
  try {
    const db = await getDatabase();

    // Fetch all read books with genres and ratings
    const stmt = db.prepare(`
      SELECT
        b.goodreads_id,
        r.rating
      FROM books b
      INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = 'read'
        AND r.rating IS NOT NULL
        AND r.rating > 0
    `);

    const books = stmt.all() as Array<{ goodreads_id: string; rating: number }>;

    // Attach genres to books
    const booksWithGenres = attachGenresToBooks(db, books);

    // Map genres to parent categories and aggregate
    const categoryStats = new Map<
      string,
      { books: number; totalRating: number; ratings: number[] }
    >();

    for (const book of booksWithGenres) {
      const genres = book.genres ?? [];
      const parentCategories = new Set<string>();

      // Map child genres to parent categories
      for (const genre of genres) {
        const parent = findParentCategory(genre);
        if (parent) parentCategories.add(parent);
      }

      // Add book to each parent category
      for (const parent of parentCategories) {
        const stats = categoryStats.get(parent) ?? {
          books: 0,
          totalRating: 0,
          ratings: [],
        };
        stats.books += 1;
        stats.totalRating += book.rating;
        stats.ratings.push(book.rating);
        categoryStats.set(parent, stats);
      }
    }

    // Calculate averages, standard deviations, and format for chart
    return Array.from(categoryStats.entries())
      .map(([category, stats]) => {
        const avgRating = stats.totalRating / stats.books;
        // Calculate standard deviation
        const variance =
          stats.ratings.reduce(
            (sum, rating) => sum + Math.pow(rating - avgRating, 2),
            0,
          ) / stats.books;
        const stdDev = Math.sqrt(variance);

        return {
          category,
          books: stats.books,
          avgRating,
          stdDev,
        };
      })
      .filter((g) => g.books >= 5); // Show only categories with 5+ books to reduce noise
  } catch (error) {
    console.error("Error fetching genre analytics:", error);
    throw error;
  }
}
