import Database from "better-sqlite3";
import { resolve } from "path";

export type Book = {
  id: number;
  goodreads_id: string;
  title: string;
  author: string;
  isbn?: string;
  image_url?: string;
  description?: string;
  pages?: number;
  publication_year?: number;
  created_at: string;
};

export type Review = {
  id: number;
  book_id: number;
  shelf: string;
  rating?: number;
  review?: string;
  date_added?: string;
  date_read?: string;
  date_started?: string;
  read_count: number;
  owned: number;
};

export type BookWithReview = Book & {
  shelf: string;
  rating?: number;
  review?: string;
  date_added?: string;
  date_read?: string;
  date_started?: string;
  read_count: number;
  owned: number;
  genres?: string[];
};

let db: Database.Database | null = null;

export async function getDatabase(): Promise<Database.Database | null> {
  // Always try to create a fresh database for now to debug
  // if (!db) {
  try {
    // Try local file first (for development)
    const dbPath = resolve(process.cwd(), "public", "books.db");
    console.log("Attempting to load database from:", dbPath);
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    console.log("✅ Database loaded from local file");
  } catch (error) {
    console.log("Local file failed:", error.message);
    try {
      // Fallback: fetch from public URL (for Vercel)
      console.log("Local database not found, fetching from public URL...");

      // Use absolute URL for reliable server-side fetch
      const response = await fetch("https://bechols.com/books.db");
      console.log(
        "Fetch response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch database: ${response.status} ${response.statusText}`,
        );
      }

      const dbBuffer = await response.arrayBuffer();
      console.log("Database buffer size:", dbBuffer.byteLength);

      // Write buffer to temporary file for SQLite to open
      const tmpPath = "/tmp/books.db";
      const fs = await import("fs");
      fs.writeFileSync(tmpPath, Buffer.from(dbBuffer));

      db = new Database(tmpPath);
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      console.log("✅ Database loaded from public URL");
    } catch (fetchError) {
      console.error("Database not available via file or URL:", fetchError);
      return null;
    }
  }
  // }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, skipping initialization");
    return;
  }

  // Create books table
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goodreads_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      image_url TEXT,
      description TEXT,
      pages INTEGER,
      publication_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create reviews table
  database.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      shelf TEXT NOT NULL DEFAULT 'read',
      rating INTEGER,
      review TEXT,
      date_added DATETIME,
      date_read DATETIME,
      date_started DATETIME,
      read_count INTEGER DEFAULT 1,
      owned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id),
      UNIQUE(book_id, shelf)
    )
  `);

  // Create indexes for better performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_books_goodreads_id ON books(goodreads_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_shelf ON reviews(shelf);
    CREATE INDEX IF NOT EXISTS idx_reviews_date_read ON reviews(date_read);
  `);
}

export async function insertBook(
  book: Omit<Book, "id" | "created_at">,
): Promise<number> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, cannot insert book");
    return -1;
  }

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO books (goodreads_id, title, author, isbn, image_url, description, pages, publication_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    book.goodreads_id,
    book.title,
    book.author,
    book.isbn,
    book.image_url,
    book.description,
    book.pages,
    book.publication_year,
  );

  return result.lastInsertRowid as number;
}

export async function insertReview(
  review: Omit<Review, "id" | "created_at">,
): Promise<number> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, cannot insert review");
    return -1;
  }

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO reviews (book_id, shelf, rating, review, date_added, date_read, date_started, read_count, owned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    review.book_id,
    review.shelf,
    review.rating,
    review.review,
    review.date_added,
    review.date_read,
    review.date_started,
    review.read_count,
    review.owned,
  );

  return result.lastInsertRowid as number;
}

export async function getBookByGoodreadsId(
  goodreadsId: string,
): Promise<Book | null> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, cannot get book by Goodreads ID");
    return null;
  }

  const stmt = database.prepare("SELECT * FROM books WHERE goodreads_id = ?");
  return stmt.get(goodreadsId) as Book | null;
}

export async function getBooksByShelf(
  shelf: string,
): Promise<BookWithReview[]> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, cannot get books by shelf");
    return [];
  }

  const stmt = database.prepare(`
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
    INNER JOIN reviews r ON b.id = r.book_id
    WHERE r.shelf = ?
    ORDER BY r.date_read DESC, r.date_added DESC
  `);

  return stmt.all(shelf) as BookWithReview[];
}

export async function getCurrentlyReading(): Promise<BookWithReview[]> {
  return await getBooksByShelf("currently-reading");
}

export async function getRecentlyRead(
  limit: number = 10,
): Promise<BookWithReview[]> {
  const database = await getDatabase();

  if (!database) {
    console.warn("Database not available, cannot get recently read books");
    return [];
  }

  const stmt = database.prepare(`
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
    INNER JOIN reviews r ON b.id = r.book_id
    WHERE r.shelf = 'read' AND r.date_read IS NOT NULL
    ORDER BY r.date_read DESC
    LIMIT ?
  `);

  return stmt.all(limit) as BookWithReview[];
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
