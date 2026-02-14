#!/usr/bin/env node

import Database from "better-sqlite3";
import { resolve } from "path";

const dbPath = resolve(process.cwd(), "public/books.db");
const db = new Database(dbPath);

const MIN_BOOKS = 5; // Minimum number of books required to keep a genre

console.log(`📚 Removing genres with fewer than ${MIN_BOOKS} books...\n`);

// Get current stats
const statsBefore = db
  .prepare(
    "SELECT COUNT(DISTINCT genre) as genres, COUNT(*) as total_records FROM book_genres WHERE genre <> '_none'"
  )
  .get();

console.log(`Starting with:`);
console.log(`  - ${statsBefore.genres} unique genres`);
console.log(`  - ${statsBefore.total_records} total genre assignments\n`);

db.prepare("BEGIN TRANSACTION").run();

try {
  // Find genres to remove (those with fewer than MIN_BOOKS)
  const genresToRemove = db
    .prepare(
      `
    SELECT genre, COUNT(*) as count
    FROM book_genres
    WHERE genre <> '_none'
    GROUP BY genre
    HAVING count < ?
    ORDER BY count DESC
  `
    )
    .all(MIN_BOOKS);

  console.log(`Found ${genresToRemove.length} genres to remove:\n`);

  // Show what we're removing (sample)
  const sampleSize = Math.min(20, genresToRemove.length);
  console.log(`First ${sampleSize} genres being removed:`);
  genresToRemove.slice(0, sampleSize).forEach(({ genre, count }) => {
    console.log(`  ❌ "${genre}" (${count} book${count === 1 ? "" : "s"})`);
  });

  if (genresToRemove.length > sampleSize) {
    console.log(`  ... and ${genresToRemove.length - sampleSize} more`);
  }

  // Delete all infrequent genres
  const result = db
    .prepare(
      `
    DELETE FROM book_genres
    WHERE genre IN (
      SELECT genre
      FROM book_genres
      WHERE genre <> '_none'
      GROUP BY genre
      HAVING COUNT(*) < ?
    )
  `
    )
    .run(MIN_BOOKS);

  db.prepare("COMMIT").run();

  // Get final stats
  const statsAfter = db
    .prepare(
      "SELECT COUNT(DISTINCT genre) as genres, COUNT(*) as total_records FROM book_genres WHERE genre <> '_none'"
    )
    .get();

  console.log("\n📊 Summary:");
  console.log(`  Genres before:  ${statsBefore.genres}`);
  console.log(`  Genres after:   ${statsAfter.genres}`);
  console.log(`  Genres removed: ${statsBefore.genres - statsAfter.genres}`);
  console.log(`  Records deleted: ${result.changes}`);
  console.log(
    `  Reduction: ${Math.round(((statsBefore.genres - statsAfter.genres) / statsBefore.genres) * 100)}%`
  );

  // Show remaining top genres
  console.log("\n🏆 Top 30 remaining genres:");
  const topGenres = db
    .prepare(
      `
    SELECT genre, COUNT(*) as count
    FROM book_genres
    WHERE genre <> '_none'
    GROUP BY genre
    ORDER BY count DESC
    LIMIT 30
  `
    )
    .all();

  topGenres.forEach(({ genre, count }, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${genre} (${count})`);
  });

  console.log("\n✅ Cleanup complete!");
} catch (error) {
  db.prepare("ROLLBACK").run();
  console.error("❌ Error removing genres:", error);
  process.exit(1);
} finally {
  db.close();
}
