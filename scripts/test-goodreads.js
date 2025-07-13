#!/usr/bin/env node

import axios from "axios";
import { parseString } from "xml2js";
import { config } from "dotenv";

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

async function testCurrentlyReading() {
  console.log("📚 Testing Currently Reading API...");

  const options = {
    method: "get",
    url: "https://www.goodreads.com/review/list",
    params: {
      id: GOODREADS_USER_ID,
      shelf: "currently-reading",
      v: 2,
      key: GOODREADS_API_KEY,
      per_page: 5,
      page: 1,
      sort: "date_read",
    },
  };

  try {
    const response = await axios(options);

    return new Promise((resolve) => {
      parseString(response.data, function (err, result) {
        if (err) {
          console.error("❌ XML parsing error:", err.message);
          resolve([]);
          return;
        }

        if (
          !result["GoodreadsResponse"]["reviews"][0]["review"] ||
          Object.keys(result["GoodreadsResponse"]["reviews"][0]["review"])
            .length === 0
        ) {
          console.log("✅ Currently reading: No books found (empty shelf)");
          resolve([]);
          return;
        }

        const books = result["GoodreadsResponse"]["reviews"][0]["review"].map(
          (element) => ({
            author: element["book"][0]["authors"][0]["author"][0]["name"],
            link: element["book"][0]["link"][0],
            title: element["book"][0]["title"][0],
            imageURL: element["book"][0]["image_url"][0],
          }),
        );

        console.log(`✅ Currently reading: Found ${books.length} book(s)`);
        books.forEach((book, i) => {
          console.log(`   ${i + 1}. "${book.title}" by ${book.author}`);
        });

        resolve(books);
      });
    });
  } catch (error) {
    console.error("❌ API request failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
    return [];
  }
}

async function testRecentlyRead() {
  console.log("\n📖 Testing Recently Read API...");

  const options = {
    method: "GET",
    url: "https://www.goodreads.com/review/list",
    params: {
      v: "2",
      sort: "date_read",
      shelf: "read",
      per_page: "5",
      page: "1",
      id: GOODREADS_USER_ID,
      key: GOODREADS_API_KEY,
    },
  };

  try {
    const response = await axios(options);

    return new Promise((resolve) => {
      parseString(response.data, function (err, result) {
        if (err) {
          console.error("❌ XML parsing error:", err.message);
          resolve([]);
          return;
        }

        if (
          !result["GoodreadsResponse"]["reviews"][0]["review"] ||
          Object.keys(result["GoodreadsResponse"]["reviews"][0]["review"])
            .length === 0
        ) {
          console.log("✅ Recently read: No books found (empty shelf)");
          resolve([]);
          return;
        }

        const books = result["GoodreadsResponse"]["reviews"][0]["review"].map(
          (element) => ({
            rating: element["rating"][0],
            review: element["body"][0],
            author: element["book"][0]["authors"][0]["author"][0]["name"],
            link: element["book"][0]["link"][0],
            title: element["book"][0]["title"][0],
            imageURL: element["book"][0]["image_url"][0],
          }),
        );

        console.log(`✅ Recently read: Found ${books.length} book(s)`);
        books.forEach((book, i) => {
          const rating = book.rating ? `${book.rating}★` : "No rating";
          console.log(
            `   ${i + 1}. "${book.title}" by ${book.author} (${rating})`,
          );
          if (book.review && book.review.trim()) {
            console.log(
              `      Review: ${book.review.trim().substring(0, 100)}${book.review.trim().length > 100 ? "..." : ""}`,
            );
          }
        });

        resolve(books);
      });
    });
  } catch (error) {
    console.error("❌ API request failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
    return [];
  }
}

async function main() {
  console.log("🔍 Testing Goodreads API Integration");
  console.log("=====================================");
  console.log(`User ID: ${GOODREADS_USER_ID}`);
  console.log(`API Key: ${GOODREADS_API_KEY.substring(0, 8)}...`);
  console.log("");

  const [currentBooks, recentBooks] = await Promise.all([
    testCurrentlyReading(),
    testRecentlyRead(),
  ]);

  console.log("\n📊 Summary:");
  console.log(`   Currently reading: ${currentBooks.length} book(s)`);
  console.log(`   Recently read: ${recentBooks.length} book(s)`);

  if (currentBooks.length === 0 && recentBooks.length === 0) {
    console.log("\n⚠️  No books found in either shelf. This could mean:");
    console.log("   - Your shelves are empty");
    console.log("   - API credentials are incorrect");
    console.log("   - Goodreads API is having issues");
  } else {
    console.log("\n🎉 Goodreads API integration is working!");
  }
}

main().catch(console.error);
