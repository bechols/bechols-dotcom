import type {
  BookInfo,
  GoodreadsResult,
  ShelfConfig,
} from "@/src/types/book-types";
import axios from "axios";
import { parseString } from "xml2js";

export async function fetchGoodreadsShelf(
  config: ShelfConfig,
): Promise<BookInfo[]> {
  const options = {
    method: "GET",
    url: "https://www.goodreads.com/review/list",
    params: {
      id: process.env.GOODREADS_USER_ID,
      shelf: config.shelf,
      v: 2,
      key: process.env.GOODREADS_API_KEY,
      per_page: 5,
      page: 1,
      sort: "date_read",
    },
  };

  try {
    const response = await axios<string>(options);
    return parseGoodreadsXML(response.data, config);
  } catch (error: unknown) {
    console.error(`Error fetching ${config.shelf} books:`, error);
    return [];
  }
}

export function parseGoodreadsXML(
  xmlData: string,
  config: ShelfConfig,
): Promise<BookInfo[]> {
  return new Promise((resolve) => {
    parseString(xmlData, function (err: Error | null, result: GoodreadsResult) {
      if (err) {
        console.error("Error parsing Goodreads XML:", err);
        resolve([]);
        return;
      }

      const reviews = result?.GoodreadsResponse?.reviews?.[0]?.review;

      if (!reviews || reviews.length === 0) {
        resolve([]);
        return;
      }

      const books: BookInfo[] = reviews.map((element) => {
        const book = element.book[0];
        const author = book.authors[0].author[0];

        const bookInfo: BookInfo = {
          author: author.name[0],
          link: book.link[0],
          title: book.title[0],
          imageURL: book.image_url[0],
        };

        if (config.includeRating) {
          bookInfo.rating = parseInt(element.rating[0], 10);
        }

        if (config.includeReview) {
          const reviewText = element.body[0]?.trim();
          if (reviewText) {
            bookInfo.review = reviewText;
          }
        }

        return bookInfo;
      });
      resolve(books);
    });
  });
}
