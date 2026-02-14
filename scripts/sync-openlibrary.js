#!/usr/bin/env node

import Database from "better-sqlite3";
import { resolve } from "path";

// Configuration
const RATE_LIMIT_MS = 350; // ~3 requests per second (identified client limit)
const SEARCH_RATE_LIMIT_MS = 350;
const MAX_RETRIES = 2;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const dryRun = args.includes("--dry-run");
const forceAll = args.includes("--force");
const shelfFilter = args.find((arg) => !arg.startsWith("--")) || "read";

function log(message) {
  if (verbose) {
    console.log(message);
  }
}

// Initialize database
const dbPath = resolve(process.cwd(), "public", "books.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure OpenLibrary columns exist (for databases created before this migration)
try {
  db.exec(
    `ALTER TABLE books ADD COLUMN openlibrary_edition_key TEXT`,
  );
  console.log("Added openlibrary_edition_key column");
} catch {
  // Column already exists
}
try {
  db.exec(
    `ALTER TABLE books ADD COLUMN openlibrary_work_key TEXT`,
  );
  console.log("Added openlibrary_work_key column");
} catch {
  // Column already exists
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "PersonalSite (benjamin.echols@gmail.com)" },
      });

      if (response.status === 429) {
        const waitTime = (attempt + 1) * 2000;
        console.log(`   ⏳ Rate limited, waiting ${waitTime / 1000}s...`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        log(`   ⚠️  HTTP ${response.status} for ${url}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      if (attempt < retries) {
        const waitTime = (attempt + 1) * 2000;
        log(
          `   ⚠️  Fetch error (attempt ${attempt + 1}/${retries + 1}): ${error.message}, retrying in ${waitTime / 1000}s...`,
        );
        await delay(waitTime);
      } else {
        log(`   ❌ Fetch failed after ${retries + 1} attempts: ${error.message}`);
        return null;
      }
    }
  }
  return null;
}

/**
 * Look up a book by ISBN via the OpenLibrary ISBN endpoint.
 * Returns { edition_key, work_key } or null.
 */
async function lookupByISBN(isbn) {
  const url = `https://openlibrary.org/isbn/${isbn}.json`;
  log(`   🔍 ISBN lookup: ${url}`);

  const data = await fetchWithRetry(url);
  if (!data || !data.key) return null;

  // data.key is like "/books/OL7353617M"
  const editionKey = data.key.replace("/books/", "");

  // data.works is like [{ key: "/works/OL4335613W" }]
  let workKey = null;
  if (data.works && data.works.length > 0) {
    workKey = data.works[0].key.replace("/works/", "");
  }

  return { edition_key: editionKey, work_key: workKey };
}

/**
 * Search for a book by title and author via the OpenLibrary Search API.
 * Returns { edition_key, work_key } or null.
 */
async function lookupBySearch(title, author) {
  // Clean up title: remove series info in parentheses for better matching
  const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, "").trim();

  const params = new URLSearchParams({
    title: cleanTitle,
    author: author,
    limit: "1",
    fields: "key,edition_key,cover_edition_key",
  });
  const url = `https://openlibrary.org/search.json?${params}`;
  log(`   🔍 Search lookup: ${url}`);

  const data = await fetchWithRetry(url);
  if (!data || !data.docs || data.docs.length === 0) return null;

  const doc = data.docs[0];

  // doc.key is like "/works/OL4335613W"
  const workKey = doc.key ? doc.key.replace("/works/", "") : null;

  // Use cover_edition_key as the edition, or first from edition_key array
  let editionKey = doc.cover_edition_key || null;
  if (!editionKey && doc.edition_key && doc.edition_key.length > 0) {
    editionKey = doc.edition_key[0];
  }

  return { edition_key: editionKey, work_key: workKey };
}

async function main() {
  console.log(`📚 OpenLibrary enrichment for "${shelfFilter}" shelf`);
  if (dryRun) console.log("🏃 Dry run mode — no database changes will be made");
  if (forceAll) console.log("🔄 Force mode — re-enriching all books");
  console.log("================================================");

  // Get books to enrich
  const whereClause = forceAll
    ? ""
    : "AND b.openlibrary_edition_key IS NULL AND b.openlibrary_work_key IS NULL";

  const books = db
    .prepare(
      `
    SELECT b.goodreads_id, b.title, b.author, b.isbn
    FROM books b
    JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = ? ${whereClause}
    ORDER BY r.date_read DESC
  `,
    )
    .all(shelfFilter);

  console.log(`📖 Found ${books.length} books to enrich\n`);

  if (books.length === 0) {
    console.log("✅ All books already have OpenLibrary data!");
    db.close();
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE books
    SET openlibrary_edition_key = ?, openlibrary_work_key = ?
    WHERE goodreads_id = ?
  `);

  let matched = 0;
  let isbnMatched = 0;
  let searchMatched = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const progress = `[${i + 1}/${books.length}]`;

    console.log(`${progress} "${book.title}" by ${book.author}`);

    let result = null;

    // Try ISBN lookup first
    if (book.isbn) {
      result = await lookupByISBN(book.isbn);
      if (result) {
        isbnMatched++;
        log(`   ✅ ISBN match: edition=${result.edition_key}, work=${result.work_key}`);
      }
      await delay(RATE_LIMIT_MS);
    }

    // Fall back to search
    if (!result) {
      if (book.isbn) {
        log(`   ⚠️  ISBN lookup failed, trying search...`);
      }
      result = await lookupBySearch(book.title, book.author);
      if (result) {
        searchMatched++;
        log(
          `   ✅ Search match: edition=${result.edition_key}, work=${result.work_key}`,
        );
      }
      await delay(SEARCH_RATE_LIMIT_MS);
    }

    if (result) {
      matched++;
      if (!dryRun) {
        updateStmt.run(
          result.edition_key,
          result.work_key,
          book.goodreads_id,
        );
      }
      console.log(
        `   ✅ → OL edition: ${result.edition_key || "—"}, work: ${result.work_key || "—"}`,
      );
    } else {
      failed++;
      console.log(`   ❌ No match found`);
    }
  }

  console.log("\n================================================");
  console.log(`📊 Results:`);
  console.log(`   Total processed: ${books.length}`);
  console.log(`   Matched:         ${matched} (${((matched / books.length) * 100).toFixed(1)}%)`);
  console.log(`     via ISBN:      ${isbnMatched}`);
  console.log(`     via search:    ${searchMatched}`);
  console.log(`   Not found:       ${failed}`);

  if (failed > 0) {
    console.log(`\n📋 Books without OpenLibrary matches:`);
    const unmatched = db
      .prepare(
        `
      SELECT b.title, b.author, b.isbn
      FROM books b
      JOIN reviews r ON b.goodreads_id = r.goodreads_id
      WHERE r.shelf = ? AND b.openlibrary_edition_key IS NULL AND b.openlibrary_work_key IS NULL
      ORDER BY b.title
    `,
      )
      .all(shelfFilter);

    for (const book of unmatched) {
      console.log(`   • "${book.title}" by ${book.author}${book.isbn ? ` (ISBN: ${book.isbn})` : " (no ISBN)"}`);
    }
  }

  db.close();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  db.close();
  process.exit(1);
});
