#!/usr/bin/env node

import { mkdir } from "fs/promises";
import { resolve } from "path";
import { existsSync, unlinkSync } from "fs";
import Database from "better-sqlite3";

async function main() {
  console.log("🗄️  Initializing SQLite database...");

  try {
    // Create public directory if it doesn't exist
    const publicDir = resolve(process.cwd(), "public");
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
      console.log("📁 Created public directory");
    }

    // Initialize database with corruption recovery
    const dbPath = resolve(publicDir, "books.db");
    let db;
    
    try {
      db = new Database(dbPath);
      // Test if database is corrupted
      db.pragma('integrity_check');
    } catch (error) {
      if (error.code === 'SQLITE_CORRUPT') {
        console.log('🚨 Database is corrupted - creating fresh database...');
        // Remove corrupted database
        try {
          unlinkSync(dbPath);
        } catch {
          // File might not exist, which is fine
        }
        // Create new database
        db = new Database(dbPath);
      } else {
        throw error;
      }
    }
    
    // Set up database configuration for reliability
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("synchronous = FULL");
    db.pragma("cache_size = 10000");
    db.pragma("temp_store = MEMORY");

    // Create books table
    db.exec(`
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goodreads_id TEXT NOT NULL,
        shelf TEXT NOT NULL,
        rating INTEGER,
        review TEXT,
        date_added DATE CHECK(date_added IS NULL OR date_added GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        date_read DATE CHECK(date_read IS NULL OR date_read GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        date_started DATE CHECK(date_started IS NULL OR date_started GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        read_count INTEGER DEFAULT 1,
        owned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goodreads_id) REFERENCES books(goodreads_id),
        UNIQUE(goodreads_id, shelf)
      )
    `);

    // Create book_genres table for genre/topic data from Goodreads
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

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_books_goodreads_id ON books(goodreads_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_goodreads_id ON reviews(goodreads_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_shelf ON reviews(shelf);
      CREATE INDEX IF NOT EXISTS idx_reviews_date_read ON reviews(date_read);
      CREATE INDEX IF NOT EXISTS idx_book_genres_goodreads_id ON book_genres(goodreads_id);
      CREATE INDEX IF NOT EXISTS idx_book_genres_genre ON book_genres(genre);
    `);

    // Run integrity check after initialization
    console.log("🔍 Running database integrity check...");
    const integrityResult = db.pragma('integrity_check');
    if (integrityResult[0]?.integrity_check !== 'ok') {
      throw new Error('Database integrity check failed after initialization');
    }

    // Test the connection
    const result = db.prepare("SELECT COUNT(*) as count FROM books").get();
    console.log("✅ Database initialized successfully");
    console.log(`📊 Books table has ${result.count} records`);

    // Close the database
    db.close();
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
}

main().catch(console.error);
