#!/usr/bin/env node

import axios from "axios";
import { parseString } from "xml2js";
import { config } from "dotenv";
import Database from "better-sqlite3";
import { resolve } from "path";

// Load environment variables
config();

const GOODREADS_API_KEY = process.env.GOODREADS_API_KEY;

if (!GOODREADS_API_KEY) {
  console.error("❌ Missing required environment variable: GOODREADS_API_KEY");
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const forceRefresh = args.includes("--force");

function log(message) {
  if (verbose) {
    console.log(message);
  }
}

// Shelves that are not genres (user organizational shelves)
const NON_GENRE_SHELVES = new Set([
  "to-read",
  "currently-reading",
  "read",
  "favorites",
  "favourite",
  "favourites",
  "owned",
  "owned-books",
  "borrowed",
  "library",
  "kindle",
  "audiobook",
  "audiobooks",
  "audio",
  "ebook",
  "ebooks",
  "e-book",
  "e-books",
  "paperback",
  "hardcover",
  "book-club",
  "bookclub",
  "book-clubs",
  "re-read",
  "reread",
  "dnf",
  "did-not-finish",
  "wish-list",
  "wishlist",
  "want-to-buy",
  "my-books",
  "books-i-own",
  "default",
  "gave-up-on",
  "abandoned",
  "unfinished",
  "maybe",
  "tbr",
  "shelf",
  "calibre",
  "nook",
  "ibooks",
  "signed",
  "first-edition",
  "arc",
  "review-copy",
  "reviewed",
  "all-time-favorites",
  "all-time-favourites",
  "5-stars",
  "4-stars",
  "3-stars",
  "2-stars",
  "1-star",
  "on-hold",
  "stalled",
  "to-buy",
  "want",
]);

// Rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Initialize database
const dbPath = resolve(process.cwd(), "public", "books.db");
const db = new Database(dbPath);

function ensureGenresTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goodreads_id TEXT NOT NULL,
      genre TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      FOREIGN KEY (goodreads_id) REFERENCES books(goodreads_id),
      UNIQUE(goodreads_id, genre)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_book_genres_goodreads_id ON book_genres(goodreads_id);
    CREATE INDEX IF NOT EXISTS idx_book_genres_genre ON book_genres(genre);
  `);
}

function getBooksNeedingGenres() {
  if (forceRefresh) {
    return db
      .prepare("SELECT goodreads_id, title FROM books ORDER BY title")
      .all();
  }

  // Find books that don't have any genres yet
  return db
    .prepare(
      `
    SELECT b.goodreads_id, b.title
    FROM books b
    LEFT JOIN book_genres bg ON b.goodreads_id = bg.goodreads_id
    WHERE bg.id IS NULL
    ORDER BY b.title
  `,
    )
    .all();
}

function isGenreShelf(shelfName) {
  if (!shelfName) return false;
  const lower = shelfName.toLowerCase().trim();
  if (NON_GENRE_SHELVES.has(lower)) return false;
  // Filter out shelves that are just numbers or very short
  if (lower.length < 3) return false;
  // Filter out shelves with very personal naming patterns
  if (lower.startsWith("my-")) return false;
  if (lower.startsWith("to-")) return false;
  return true;
}

async function fetchBookGenres(goodreadsId) {
  const url = `https://www.goodreads.com/book/show/${goodreadsId}.xml`;
  const params = { key: GOODREADS_API_KEY };

  try {
    log(`🌐 Fetching: ${url}`);
    const response = await axios.get(url, { params });

    return new Promise((resolve, reject) => {
      parseString(response.data, function (err, result) {
        if (err) {
          reject(new Error(`XML parsing error: ${err.message}`));
          return;
        }

        const popularShelves =
          result?.GoodreadsResponse?.book?.[0]?.popular_shelves?.[0]?.shelf;

        if (!popularShelves || !Array.isArray(popularShelves)) {
          resolve([]);
          return;
        }

        // Extract genre-like shelves, sorted by count (most popular first)
        const genres = popularShelves
          .map((shelf) => ({
            name: shelf.$?.name,
            count: parseInt(shelf.$?.count || "0"),
          }))
          .filter((s) => isGenreShelf(s.name))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5) // Keep top 5 genres per book
          .map((s) => s.name);

        resolve(genres);
      });
    });
  } catch (error) {
    if (error.response?.status === 404) {
      log(`   ⚠️  Book ${goodreadsId} not found on Goodreads`);
      return [];
    }
    throw error;
  }
}

async function main() {
  console.log("📚 Fetching genre data from Goodreads...");

  ensureGenresTable();

  const books = getBooksNeedingGenres();

  if (books.length === 0) {
    console.log("✅ All books already have genre data!");
    db.close();
    return;
  }

  console.log(`📖 Found ${books.length} books needing genre data`);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO book_genres (goodreads_id, genre, position)
    VALUES (?, ?, ?)
  `);

  const deleteStmt = db.prepare(
    "DELETE FROM book_genres WHERE goodreads_id = ?",
  );

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(
      `   [${i + 1}/${books.length}] "${book.title}" (${book.goodreads_id})`,
    );

    try {
      const genres = await fetchBookGenres(book.goodreads_id);

      if (genres.length > 0) {
        // If force refreshing, clear existing genres first
        if (forceRefresh) {
          deleteStmt.run(book.goodreads_id);
        }

        for (let j = 0; j < genres.length; j++) {
          insertStmt.run(book.goodreads_id, genres[j], j);
        }
        log(`   ✅ Stored ${genres.length} genres: ${genres.join(", ")}`);
        successCount++;
      } else {
        // Insert a placeholder so we don't re-fetch books with no genres
        insertStmt.run(book.goodreads_id, "_none", 0);
        log(`   ⚠️  No genre data found`);
      }

      // Rate limiting - 1 second between requests
      if (i < books.length - 1) {
        await delay(1000);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
      // Continue with next book
      await delay(1000);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ ${successCount} books with genres`);
  console.log(`   ❌ ${errorCount} errors`);
  console.log(
    `   📖 ${books.length - successCount - errorCount} books with no genre data`,
  );

  db.close();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  db.close();
  process.exit(1);
});
