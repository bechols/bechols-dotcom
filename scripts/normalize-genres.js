#!/usr/bin/env node

import Database from "better-sqlite3";
import { resolve } from "path";

const dbPath = resolve(process.cwd(), "public/books.db");
const db = new Database(dbPath);

// Mapping of genre variations to canonical names
const GENRE_MAPPINGS = {
  // Non-fiction variations
  nonfiction: "non-fiction",

  // Science fiction variations
  "sci-fi": "science-fiction",
  scifi: "science-fiction",
  "science fiction": "science-fiction",

  // Fiction variations
  "general-fiction": "fiction",
  "contemporary-fiction": "fiction",

  // Technology variations
  tech: "technology",

  // Mathematics variations
  math: "mathematics",
  maths: "mathematics",

  // Classic variations
  classic: "classics",

  // Dystopian variations
  dystopia: "dystopian",

  // Historical fiction variations
  historical: "historical-fiction",

  // Biography variations
  biographies: "biography",
  "biography-memoir": "biography",
  autobiographies: "biography",

  // Short stories variations
  "short-fiction": "short-stories",
  stories: "short-stories",
  short: "short-stories",

  // Young adult variations
  "ya": "young-adult",

  // Self help variations
  "self-improvement": "self-help",
  "personal-development": "self-help",

  // Programming/CS variations
  "computer-science": "programming",
  coding: "programming",

  // Remove overly specific/personal shelves
  "physical-tbr": null,
  "to-read": null,
  "currently-reading": null,
  read: null,
  owned: null,
  "owned-books": null,
  kindle: null,
  audiobook: null,
  audiobooks: null,
  ebook: null,
  ebooks: null,
  "e-book": null,
  "e-books": null,
  favorites: null,
  favourite: null,
  favourites: null,
  series: null,
  "my-library": null,
  "to-buy": null,
  "wish-list": null,
  wishlist: null,
  dnf: null,
  "did-not-finish": null,
  abandoned: null,

  // Remove rating shelves
  "5-stars": null,
  "4-stars": null,
  "3-stars": null,
  "2-stars": null,
  "1-star": null,

  // Remove format-specific shelves
  hardcover: null,
  paperback: null,

  // Remove personal organization
  "library-books": null,
  borrowed: null,
  "book-club": null,

  // Remove overly specific author/series tags
  "stephen-king": null,
  king: null,
  "brandon-sanderson": null,
  cosmere: null,
  dfw: null,

  // Remove contest/award-specific tags (keep general ones like booker-prize)
  tob: null,
  "tob-2014": null,
  "tournament-of-books": null,
  indiespensable: null,

  // Remove personal metadata
  "mylibrary-to-read": null,
  "stuff-i-own": null,
  "nrm-classroom": null,
  "ac-removes": null,
  "acti-law-philo-pol-socio": null,
  "ready-to-read": null,

  // Keep these as-is (no mapping needed, just documenting)
  // Popular genres that should stay:
  // - fiction, fantasy, science-fiction
  // - non-fiction, history, biography, memoir
  // - mystery, horror, thriller
  // - romance, historical-fiction
  // - philosophy, psychology, science
  // - business, economics, politics
  // - poetry, essays, literary-fiction
};

console.log("📚 Normalizing genre data...\n");

// Get current genre stats
const genresBefore = db
  .prepare(
    "SELECT COUNT(DISTINCT genre) as count FROM book_genres WHERE genre <> '_none'"
  )
  .get();

console.log(`Starting with ${genresBefore.count} unique genres\n`);

// Track changes
let updated = 0;
let deleted = 0;

db.prepare("BEGIN TRANSACTION").run();

try {
  for (const [from, to] of Object.entries(GENRE_MAPPINGS)) {
    if (to === null) {
      // Delete this genre entirely
      const result = db
        .prepare("DELETE FROM book_genres WHERE genre = ?")
        .run(from);
      if (result.changes > 0) {
        deleted += result.changes;
        console.log(`  ❌ Deleted ${result.changes} instances of "${from}"`);
      }
    } else {
      // First, delete cases where the book already has the target genre
      // (to avoid unique constraint violations)
      const deleteResult = db
        .prepare(`
          DELETE FROM book_genres
          WHERE genre = ?
          AND goodreads_id IN (
            SELECT goodreads_id FROM book_genres WHERE genre = ?
          )
        `)
        .run(from, to);

      if (deleteResult.changes > 0) {
        deleted += deleteResult.changes;
        console.log(`  🗑️  Removed ${deleteResult.changes} duplicate "${from}" (already had "${to}")`);
      }

      // Now update the remaining ones
      const result = db
        .prepare("UPDATE book_genres SET genre = ? WHERE genre = ?")
        .run(to, from);
      if (result.changes > 0) {
        updated += result.changes;
        console.log(`  ✅ Renamed "${from}" → "${to}" (${result.changes} books)`);
      }
    }
  }

  // Remove any duplicate genre assignments (same book + same genre after normalization)
  const dedupResult = db.prepare(`
    DELETE FROM book_genres
    WHERE rowid NOT IN (
      SELECT MIN(rowid)
      FROM book_genres
      WHERE genre <> '_none'
      GROUP BY goodreads_id, genre
    )
  `).run();

  if (dedupResult.changes > 0) {
    console.log(`\n  🔄 Removed ${dedupResult.changes} duplicate genre assignments`);
  }

  db.prepare("COMMIT").run();

  const genresAfter = db
    .prepare(
      "SELECT COUNT(DISTINCT genre) as count FROM book_genres WHERE genre <> '_none'"
    )
    .get();

  console.log("\n📊 Summary:");
  console.log(`   Genres before: ${genresBefore.count}`);
  console.log(`   Genres after:  ${genresAfter.count}`);
  console.log(`   Records updated: ${updated}`);
  console.log(`   Records deleted: ${deleted}`);
  console.log(
    `   Reduction: ${genresBefore.count - genresAfter.count} genres (${Math.round(((genresBefore.count - genresAfter.count) / genresBefore.count) * 100)}%)`
  );

  // Show top genres after normalization
  console.log("\n🏆 Top 20 genres after normalization:");
  const topGenres = db
    .prepare(`
      SELECT genre, COUNT(*) as count
      FROM book_genres
      WHERE genre <> '_none'
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 20
    `)
    .all();

  topGenres.forEach(({ genre, count }, i) => {
    console.log(`   ${i + 1}. ${genre} (${count})`);
  });

  console.log("\n✅ Genre normalization complete!");
} catch (error) {
  db.prepare("ROLLBACK").run();
  console.error("❌ Error normalizing genres:", error);
  process.exit(1);
} finally {
  db.close();
}
