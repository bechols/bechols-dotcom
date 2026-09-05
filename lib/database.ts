import Database from "better-sqlite3";
import { resolve, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

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
  openlibrary_edition_key?: string;
  openlibrary_work_key?: string;
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
let writableDb: Database.Database | null = null;
let initialization: Promise<Database.Database> | null = null;
let temporaryDirectory: string | null = null;
let generation = 0;

function openReadOnly(path: string): Database.Database {
  const connection = new Database(path, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    // Force SQLite to read the schema before publishing the connection.
    connection.prepare("SELECT name FROM sqlite_master LIMIT 1").all();
    connection.pragma("foreign_keys = ON");
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}

async function initializeReader(): Promise<Database.Database> {
  try {
    return openReadOnly(resolve(process.cwd(), "public", "books.db"));
  } catch (error) {
    console.warn(
      "Local books database unavailable; trying deployment copy:",
      error,
    );
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://bechols.com";
  const response = await fetch(`${baseUrl}/books.db`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(
      `Unable to load books database (${response.status}). Please retry.`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  // Each process/attempt owns a unique file. Never replace an open SQLite file.
  const directory = mkdtempSync(join(tmpdir(), "bechols-books-"));
  try {
    const path = join(directory, "books.db");
    writeFileSync(path, buffer, { flag: "wx" });
    const connection = openReadOnly(path);
    temporaryDirectory = directory;
    return connection;
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

export function getDatabase(): Promise<Database.Database> {
  if (db?.open) return Promise.resolve(db);
  if (!initialization) {
    const currentGeneration = generation;
    const pending = initializeReader()
      .then((connection) => {
        if (currentGeneration !== generation) {
          connection.close();
          if (temporaryDirectory) {
            rmSync(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
          }
          throw new Error("Database initialization was closed. Please retry.");
        }
        db = connection;
        return connection;
      })
      .finally(() => {
        if (initialization === pending) initialization = null;
      });
    initialization = pending;
  }
  return initialization;
}

// Maintenance helpers deliberately write only to the local source database.
// They must never update a downloaded deployment snapshot.
export function getWritableDatabase(): Promise<Database.Database> {
  if (!writableDb?.open) {
    const connection = new Database(
      resolve(process.cwd(), "public", "books.db"),
    );
    try {
      connection.pragma("journal_mode = WAL");
      connection.pragma("foreign_keys = ON");
      writableDb = connection;
    } catch (error) {
      connection.close();
      throw error;
    }
  }
  return Promise.resolve(writableDb);
}

export async function initDatabase(): Promise<void> {
  const database = await getWritableDatabase();

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
      openlibrary_edition_key TEXT,
      openlibrary_work_key TEXT,
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
  const database = await getWritableDatabase();

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
  const database = await getWritableDatabase();

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

  const stmt = database.prepare("SELECT * FROM books WHERE goodreads_id = ?");
  return (stmt.get(goodreadsId) as Book | undefined) ?? null;
}

export async function getBooksByShelf(
  shelf: string,
): Promise<BookWithReview[]> {
  const database = await getDatabase();

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
  generation++;
  // Keep an in-flight attempt shared until it settles; its generation check
  // closes the result and removes its own temporary file.
  if (db?.open) db.close();
  db = null;
  if (writableDb?.open) writableDb.close();
  writableDb = null;
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = null;
  }
}
