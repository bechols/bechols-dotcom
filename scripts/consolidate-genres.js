import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  GENRE_HIERARCHY,
  REMOVE_GENRES
} from "../lib/genre-hierarchy.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "..", "public", "books.db");

/**
 * Apply genre consolidation to the database
 * - Remove unwanted genres (geographic, meta, low-count)
 * - Consolidate similar genres (e.g., "math" -> "mathematics")
 * - Preserve parent→child hierarchy for UI display
 */
function consolidateGenres() {
  const db = new Database(dbPath);
  console.log("📚 Consolidating genres in database...\n");

  try {
    // Start transaction
    db.prepare("BEGIN TRANSACTION").run();

    // Get current genre counts
    const genreCountsQuery = db.prepare(`
      SELECT genre, COUNT(DISTINCT goodreads_id) as count
      FROM book_genres
      WHERE genre != '_none'
      GROUP BY genre
      ORDER BY count DESC
    `);
    const genreCounts = genreCountsQuery.all();
    console.log(`Found ${genreCounts.length} unique genres before consolidation\n`);

    // Step 1: Remove unwanted genres
    console.log("🗑️  Removing unwanted genres:");
    const removeStmt = db.prepare(`
      DELETE FROM book_genres
      WHERE genre = ?
    `);

    let removedCount = 0;
    for (const genre of REMOVE_GENRES) {
      const result = removeStmt.run(genre);
      if (result.changes > 0) {
        const count = genreCounts.find(g => g.genre === genre)?.count || 0;
        console.log(`   - Removed "${genre}" (${count} books, ${result.changes} entries)`);
        removedCount++;
      }
    }
    console.log(`   Total: ${removedCount} genres removed\n`);

    // Step 2: Consolidate similar genres
    console.log("🔄 Consolidating similar genres:");

    // For consolidation, we need to handle books that might already have both genres
    // If a book has both "math" and "mathematics", we just delete "math"
    // If a book only has "math", we update it to "mathematics"

    let consolidatedCount = 0;
    for (const config of Object.values(GENRE_HIERARCHY)) {
      for (const [oldGenre, newGenre] of Object.entries(config.consolidate)) {
        // Find books that have the old genre
        const booksWithOldGenre = db.prepare(`
          SELECT DISTINCT goodreads_id FROM book_genres WHERE genre = ?
        `).all(oldGenre);

        if (booksWithOldGenre.length === 0) continue;

        let updated = 0;
        let deleted = 0;

        for (const { goodreads_id } of booksWithOldGenre) {
          // Check if this book already has the new genre
          const hasNewGenre = db.prepare(`
            SELECT COUNT(*) as count FROM book_genres
            WHERE goodreads_id = ? AND genre = ?
          `).get(goodreads_id, newGenre);

          if (hasNewGenre.count > 0) {
            // Delete the old genre (book already has the new one)
            db.prepare(`
              DELETE FROM book_genres
              WHERE goodreads_id = ? AND genre = ?
            `).run(goodreads_id, oldGenre);
            deleted++;
          } else {
            // Update the old genre to the new one
            db.prepare(`
              UPDATE book_genres
              SET genre = ?
              WHERE goodreads_id = ? AND genre = ?
            `).run(newGenre, goodreads_id, oldGenre);
            updated++;
          }
        }

        const count = genreCounts.find(g => g.genre === oldGenre)?.count || 0;
        console.log(`   - "${oldGenre}" → "${newGenre}" (${count} books: ${updated} updated, ${deleted} deleted)`);
        consolidatedCount++;
      }
    }
    console.log(`   Total: ${consolidatedCount} genre mappings applied\n`);

    // Step 3: Remove duplicate genre entries for the same book
    // (After consolidation, a book might have multiple entries for the same genre)
    console.log("🧹 Removing duplicate genre entries:");
    const removeDuplicates = db.prepare(`
      DELETE FROM book_genres
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM book_genres
        GROUP BY goodreads_id, genre
      )
    `);
    const dupResult = removeDuplicates.run();
    console.log(`   Removed ${dupResult.changes} duplicate entries\n`);

    // Step 4: Show final genre counts
    const finalGenreCounts = genreCountsQuery.all();
    console.log("✅ Final genre distribution:");

    // Group by parent category
    const genresByParent = new Map();
    for (const parent of Object.keys(GENRE_HIERARCHY)) {
      genresByParent.set(parent, []);
    }

    // Categorize genres and count books
    for (const { genre, count } of finalGenreCounts) {
      let found = false;
      for (const [parent, config] of Object.entries(GENRE_HIERARCHY)) {
        if (config.children.includes(genre)) {
          genresByParent.get(parent).push({ genre, count });
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`   ⚠️  Uncategorized genre: "${genre}" (${count} books)`);
      }
    }

    // Display by parent category
    for (const [parent, genres] of genresByParent.entries()) {
      if (genres.length > 0) {
        const totalBooks = genres.reduce((sum, g) => sum + g.count, 0);
        console.log(`\n   ${parent} (${totalBooks} books):`);
        for (const { genre, count } of genres.sort((a, b) => b.count - a.count)) {
          console.log(`      - ${genre}: ${count}`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Before: ${genreCounts.length} unique genres`);
    console.log(`   After: ${finalGenreCounts.length} unique genres`);
    console.log(`   Removed: ${removedCount} genres`);
    console.log(`   Consolidated: ${consolidatedCount} mappings`);
    console.log(`   Duplicates cleaned: ${dupResult.changes} entries`);

    // Commit transaction
    db.prepare("COMMIT").run();
    console.log("\n✅ Genre consolidation complete!");

  } catch (error) {
    db.prepare("ROLLBACK").run();
    console.error("\n❌ Error during consolidation:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the consolidation
consolidateGenres();
