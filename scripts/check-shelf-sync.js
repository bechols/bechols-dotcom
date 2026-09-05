#!/usr/bin/env node

import axios from "axios";
import { parseString } from "xml2js";
import { config } from "dotenv";
import Database from "better-sqlite3";
import { resolve } from "path";

// Load environment variables
config();

const GOODREADS_USER_ID = process.env.GOODREADS_USER_ID;
const GOODREADS_API_KEY = process.env.GOODREADS_API_KEY;

if (!GOODREADS_USER_ID || !GOODREADS_API_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!GOODREADS_USER_ID) console.error("  - GOODREADS_USER_ID");
  if (!GOODREADS_API_KEY) console.error("  - GOODREADS_API_KEY");
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const shelfName = args.find((arg) => !arg.startsWith("--"));
const verbose = args.includes("--verbose") || args.includes("-v");

if (!shelfName) {
  console.error("❌ Please provide a shelf name as an argument");
  console.error(
    "Usage: node scripts/check-shelf-sync.js <shelf-name> [--verbose]",
  );
  console.error("Examples:");
  console.error("  node scripts/check-shelf-sync.js read");
  console.error(
    "  node scripts/check-shelf-sync.js currently-reading --verbose",
  );
  console.error("  node scripts/check-shelf-sync.js to-read -v");
  process.exit(1);
}

function log(message, forceShow = false) {
  if (verbose || forceShow) {
    console.log(message);
  }
}

// Initialize database
const dbPath = resolve(process.cwd(), "public", "books.db");
const db = new Database(dbPath);

// Add integrity check and recovery
function checkAndRepairDatabase() {
  try {
    // Check database integrity
    const integrityResult = db.pragma('integrity_check');
    if (integrityResult[0]?.integrity_check !== 'ok') {
      console.error('❌ Database integrity check failed:', integrityResult);
      
      // Try to repair database
      console.log('🔧 Attempting database repair...');
      db.pragma('journal_mode = DELETE');
      db.exec('VACUUM');
      db.pragma('journal_mode = WAL');
      
      // Recheck integrity
      const recheck = db.pragma('integrity_check');
      if (recheck[0]?.integrity_check !== 'ok') {
        throw new Error('Database repair failed - database is corrupted beyond repair');
      }
      console.log('✅ Database repaired successfully');
    }
  } catch (error) {
    console.error('❌ Database integrity check failed:', error.message);
    process.exit(1);
  }
}

// Check database integrity on startup
checkAndRepairDatabase();

// Helper functions
function safeExtract(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "object" && value.$ && value.$.nil === "true") {
    return null;
  }
  if (typeof value === "object") {
    return null;
  }
  return value;
}

function safeParseInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

function formatDate(dateString) {
  if (!dateString || dateString.trim() === "") {
    return null;
  }

  try {
    // Parse the date and format as YYYY-MM-DD
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

// Rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getDBShelfCount(shelf) {
  const result = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM reviews 
    WHERE shelf = ?
  `,
    )
    .get(shelf);

  return result.count;
}

async function getAPIShelfCount(shelf) {
  console.log(`🔍 Checking API count for "${shelf}" shelf...`);

  const options = {
    method: "GET",
    url: "https://www.goodreads.com/review/list",
    params: {
      id: GOODREADS_USER_ID,
      shelf: shelf,
      v: 2,
      key: GOODREADS_API_KEY,
      per_page: 1, // We only need the count, not the actual books
      page: 1,
    },
  };

  try {
    log(
      `🌐 API Request: ${options.url}?${new URLSearchParams(options.params)}`,
    );
    const response = await axios(options);
    log(`📡 API Response status: ${response.status}`);
    await delay(1000); // Rate limiting

    return new Promise((resolve, reject) => {
      parseString(response.data, function (err, result) {
        if (err) {
          reject(new Error(`XML parsing error: ${err.message}`));
          return;
        }

        if (!result?.GoodreadsResponse?.reviews?.[0]) {
          resolve(0);
          return;
        }

        // The total count is in the reviews attributes
        const reviewsElement = result.GoodreadsResponse.reviews[0];
        const totalCount = reviewsElement.$?.total || reviewsElement.$.end || 0;
        log(`📊 API XML attributes: ${JSON.stringify(reviewsElement.$)}`);
        resolve(parseInt(totalCount));
      });
    });
  } catch (error) {
    throw new Error(`Error fetching ${shelf} shelf count: ${error.message}`, {
      cause: error,
    });
  }
}

async function syncShelfData(shelf) {
  console.log(`🔄 Syncing all data for "${shelf}" shelf...`);

  let allBooks = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(`   📄 Fetching page ${page}...`);

    const options = {
      method: "GET",
      url: "https://www.goodreads.com/review/list",
      params: {
        id: GOODREADS_USER_ID,
        shelf: shelf,
        v: 2,
        key: GOODREADS_API_KEY,
        per_page: 200, // Max per page
        page: page,
        sort: "date_added",
      },
    };

    try {
      log(`🌐 Fetching: ${options.url}?${new URLSearchParams(options.params)}`);
      const response = await axios(options);
      log(
        `📡 Response status: ${response.status}, length: ${response.data.length} characters`,
      );
      await delay(1000); // Rate limiting

      const pageBooks = await new Promise((resolve, reject) => {
        parseString(response.data, function (err, result) {
          if (err) {
            reject(new Error(`XML parsing error: ${err.message}`));
            return;
          }

          if (!result?.GoodreadsResponse?.reviews?.[0]?.review) {
            resolve([]);
            return;
          }

          const reviews = result.GoodreadsResponse.reviews[0].review;
          const reviewArray = Array.isArray(reviews) ? reviews : [reviews];

          resolve(reviewArray);
        });
      });

      console.log(`   ✅ Got ${pageBooks.length} books from page ${page}`);

      // Stop if we got 0 books (reached the end)
      if (pageBooks.length === 0) {
        console.log(`   🏁 No more books found, stopping pagination`);
        hasMorePages = false;
      } else {
        allBooks = allBooks.concat(pageBooks);
        page++;
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      break;
    }
  }

  console.log(`📚 Total books fetched from API: ${allBooks.length}`);

  // Now sync all the books to the database with transaction safety
  let syncedCount;
  const insertBookStmt = db.prepare(`
    INSERT OR IGNORE INTO books (goodreads_id, title, author, isbn, image_url, description, pages, publication_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateBookStmt = db.prepare(`
    UPDATE books SET 
      title = ?, author = ?, isbn = ?, image_url = ?, description = ?, pages = ?, publication_year = ?
    WHERE goodreads_id = ?
  `);

  const insertReviewStmt = db.prepare(`
    INSERT OR REPLACE INTO reviews (goodreads_id, shelf, rating, review, date_added, date_read, date_started, read_count, owned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteOtherShelvesStmt = db.prepare(`
    DELETE FROM reviews 
    WHERE goodreads_id = ? AND shelf != ?
  `);

  const getBookByGoodreadsIdStmt = db.prepare(
    "SELECT id FROM books WHERE goodreads_id = ?",
  );

  // Wrap the entire sync operation in a transaction
  const syncTransaction = db.transaction((books) => {
    let count = 0;
    for (const element of books) {
      try {
        const book = element.book?.[0];
        const authors = book?.authors?.[0]?.author;
        const author = Array.isArray(authors) ? authors[0] : authors;

        const bookData = {
          goodreads_id: safeExtract(book?.id?.[0]?._ || book?.id?.[0]),
          title: safeExtract(book?.title?.[0]),
          author: safeExtract(author?.name?.[0]),
          isbn: safeExtract(book?.isbn?.[0]),
          image_url: safeExtract(book?.image_url?.[0]),
          description: safeExtract(book?.description?.[0]),
          pages: safeParseInt(book?.num_pages?.[0]),
          publication_year: safeParseInt(book?.publication_year?.[0]),
          shelf: safeExtract(element.shelves?.[0]?.shelf?.[0]?.$?.name) || shelf,
          rating: safeParseInt(element.rating?.[0]),
          review: safeExtract(element.body?.[0]),
          date_added: formatDate(safeExtract(element.date_added?.[0])),
          date_read: formatDate(safeExtract(element.read_at?.[0])),
          date_started: formatDate(safeExtract(element.started_at?.[0])),
          read_count: safeParseInt(element.read_count?.[0]) || 1,
          owned: safeParseInt(element.owned?.[0]) || 0,
        };

        if (!bookData.goodreads_id || !bookData.title || !bookData.author) {
          log(
            `⏭️  Skipping book - missing required data: id=${bookData.goodreads_id}, title="${bookData.title}", author="${bookData.author}"`,
          );
          continue;
        }

        log(
          `📖 Processing: "${bookData.title}" by ${bookData.author} (${bookData.goodreads_id})`,
        );

        // Insert or update book
        const bookResult = insertBookStmt.run(
          bookData.goodreads_id,
          bookData.title,
          bookData.author,
          bookData.isbn,
          bookData.image_url,
          bookData.description,
          bookData.pages,
          bookData.publication_year,
        );

        log(
          `📝 Book insert result: lastInsertRowid=${bookResult.lastInsertRowid}, changes=${bookResult.changes}`,
        );

        // Get book ID
        let bookId = bookResult.lastInsertRowid;
        if (!bookId) {
          // Book already exists, update it and get the ID
          updateBookStmt.run(
            bookData.title,
            bookData.author,
            bookData.isbn,
            bookData.image_url,
            bookData.description,
            bookData.pages,
            bookData.publication_year,
            bookData.goodreads_id,
          );
          const existingBook = getBookByGoodreadsIdStmt.get(
            bookData.goodreads_id,
          );
          bookId = existingBook?.id;
        }

        if (bookData.goodreads_id) {
          // Remove this book from any other shelves first
          const deleteResult = deleteOtherShelvesStmt.run(
            bookData.goodreads_id,
            bookData.shelf,
          );
          log(`🗑️  Deleted ${deleteResult.changes} reviews from other shelves`);

          // Insert/update review using goodreads_id directly
          const reviewResult = insertReviewStmt.run(
            bookData.goodreads_id,
            bookData.shelf,
            bookData.rating,
            bookData.review,
            bookData.date_added,
            bookData.date_read,
            bookData.date_started,
            bookData.read_count,
            bookData.owned,
          );
          log(
            `📊 Review insert result: lastInsertRowid=${reviewResult.lastInsertRowid}, changes=${reviewResult.changes}`,
          );
          count++;
        }
      } catch (error) {
        console.error(`❌ Error syncing book:`, error.message);
        if (verbose) {
          console.error(`🔍 Book data that caused error:`, JSON.stringify(element, null, 2));
          console.error(`🔍 Full error:`, error);
        }
      }
    }
    return count;
  });

  // Execute the transaction
  try {
    syncedCount = syncTransaction(allBooks);
  } catch (error) {
    console.error(`❌ Transaction failed:`, error.message);
    // Try to repair database if transaction fails
    checkAndRepairDatabase();
    throw error;
  }

  console.log(`✅ Synced ${syncedCount} books to database`);

  // Clean up: Remove books from this shelf that weren't in the API response
  if (allBooks.length > 0) {
    const apiGoodreadsIds = allBooks
      .map((element) =>
        safeExtract(
          element.book?.[0]?.id?.[0]?._ || element.book?.[0]?.id?.[0],
        ),
      )
      .filter((id) => id);

    log(
      `🧹 API returned ${apiGoodreadsIds.length} books: ${apiGoodreadsIds.join(", ")}`,
    );

    // Find books in DB for this shelf that aren't in the API response
    const dbBooks = db
      .prepare(
        `
      SELECT r.goodreads_id, b.title, b.author 
      FROM reviews r
      JOIN books b ON r.goodreads_id = b.goodreads_id 
      WHERE r.shelf = ?
    `,
      )
      .all(shelf);

    log(`🗄️  Database has ${dbBooks.length} books in ${shelf} shelf`);

    const orphanedBooks = dbBooks.filter(
      (dbBook) => !apiGoodreadsIds.includes(dbBook.goodreads_id),
    );

    if (orphanedBooks.length > 0) {
      console.log(
        `🧹 Found ${orphanedBooks.length} orphaned books to remove from ${shelf} shelf:`,
      );

      const deleteOrphanStmt = db.prepare(
        `DELETE FROM reviews WHERE goodreads_id = ? AND shelf = ?`,
      );

      for (const orphan of orphanedBooks) {
        const deleteResult = deleteOrphanStmt.run(orphan.goodreads_id, shelf);
        console.log(
          `   🗑️  Removed "${orphan.title}" by ${orphan.author} (${deleteResult.changes} records)`,
        );
      }
    } else {
      log(`✅ No orphaned books found`);
    }
  }

  return syncedCount;
}

async function main() {
  console.log(`🔍 Checking sync status for "${shelfName}" shelf...`);
  console.log("================================================");

  const startTime = Date.now();

  try {
    // Get counts from both sources
    const dbCount = await getDBShelfCount(shelfName);
    const apiCount = await getAPIShelfCount(shelfName);

    console.log(`\n📊 Count Comparison:`);
    console.log(`   🗄️  Database: ${dbCount} books`);
    console.log(`   🌐 API: ${apiCount} books`);
    console.log(`   📈 Difference: ${Math.abs(apiCount - dbCount)} books`);

    if (dbCount === apiCount) {
      console.log(`\n✅ Shelf "${shelfName}" is already in sync!`);
    } else {
      console.log(`\n🔄 Counts differ - syncing shelf data...`);
      await syncShelfData(shelfName);

      // Check final count
      const finalDbCount = await getDBShelfCount(shelfName);
      console.log(`\n📊 Final Database Count: ${finalDbCount} books`);

      if (finalDbCount === apiCount) {
        console.log(`✅ Shelf "${shelfName}" is now in sync!`);
      } else {
        console.log(`⚠️  Still some differences - may need manual review`);
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`\n⏱️  Total duration: ${duration} seconds`);
  } catch (error) {
    console.error(`❌ Error checking shelf sync:`, error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(console.error);
