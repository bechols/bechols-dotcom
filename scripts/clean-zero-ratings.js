import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Path to the database
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "public", "books.db");

console.log("Cleaning zero ratings in database...");

try {
  // Open the database
  const db = new Database(dbPath);

  // Update all zero ratings to NULL
  const stmt = db.prepare("UPDATE reviews SET rating = NULL WHERE rating = 0");
  const result = stmt.run();

  console.log(`Updated ${result.changes} rows with zero ratings to NULL`);

  // Close the database
  db.close();

  console.log("Database cleanup completed successfully!");
} catch (error) {
  console.error("Error cleaning database:", error);
  process.exit(1);
}
