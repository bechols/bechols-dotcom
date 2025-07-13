#!/usr/bin/env node

import {
  getCurrentlyReadingFromDB,
  getRecentlyReadFromDB,
  transformDBBookToBookInfo,
} from "../lib/database-queries.js";

async function testQueries() {
  console.log("🧪 Testing database queries...");

  try {
    // Test currently reading
    console.log("\n📖 Currently Reading:");
    const currentBooks = getCurrentlyReadingFromDB();
    console.log(`Found ${currentBooks.length} books`);

    if (currentBooks.length > 0) {
      const transformed = currentBooks.map(transformDBBookToBookInfo);
      console.log("Sample book:", {
        title: transformed[0].title,
        author: transformed[0].author,
        rating: transformed[0].rating,
        hasReview: !!transformed[0].review,
      });
    }

    // Test recent books
    console.log("\n📚 Recently Read (last 5):");
    const recentBooks = getRecentlyReadFromDB(5);
    console.log(`Found ${recentBooks.length} books`);

    if (recentBooks.length > 0) {
      const transformed = recentBooks.map(transformDBBookToBookInfo);
      console.log("Sample book:", {
        title: transformed[0].title,
        author: transformed[0].author,
        rating: transformed[0].rating,
        hasReview: !!transformed[0].review,
      });
    }

    console.log("\n✅ Database queries working correctly!");
  } catch (error) {
    console.error("❌ Error testing database queries:", error);
  }
}

testQueries().catch(console.error);
