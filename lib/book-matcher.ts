// Pure functions for parsing OCR output and fuzzy matching against want-to-read list.
// Zero external dependencies.

import type { BookInfo } from "@/src/types/book-types";
import type { OcrResult } from "@/lib/ocr-scanner";

export interface ExtractedBook {
  title: string;
  author?: string;
}

export interface ScanMatch {
  extracted: ExtractedBook;
  matched?: BookInfo;
  confidence: "high" | "medium" | "none";
}

/** Normalize text for comparison: lowercase, strip punctuation, collapse whitespace */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Get set of words from normalized text */
function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

/** Jaccard similarity between two word sets (intersection / union) */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Parse structured OCR results into book entries.
 * Each OCR detection becomes one ExtractedBook. Low-confidence results
 * (mean < 0.5) are filtered out as noise.
 */
export function parseExtractedBooks(results: OcrResult[]): ExtractedBook[] {
  return results
    .filter((r) => r.confidence >= 0.5 && r.text.length > 1)
    .map((r) => {
      const cleaned = r.text.trim();
      // Try to split on " by " (case-insensitive)
      const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i);
      if (byMatch) {
        return { title: byMatch[1].trim(), author: byMatch[2].trim() };
      }
      return { title: cleaned };
    });
}

/**
 * Match extracted books against want-to-read list using word-overlap (Jaccard) similarity.
 * Author match provides a boost to confidence.
 */
export function matchBooksAgainstWantToRead(
  extracted: ExtractedBook[],
  wantToRead: BookInfo[],
): ScanMatch[] {
  return extracted.map((ext) => {
    const extTitleWords = wordSet(ext.title);
    let bestMatch: BookInfo | undefined;
    let bestScore = 0;

    for (const book of wantToRead) {
      const bookTitleWords = wordSet(book.title);
      let score = jaccardSimilarity(extTitleWords, bookTitleWords);

      // Author boost: if extracted has author and it overlaps with book author
      if (ext.author) {
        const extAuthorWords = wordSet(ext.author);
        const bookAuthorWords = wordSet(book.author);
        const authorSim = jaccardSimilarity(extAuthorWords, bookAuthorWords);
        if (authorSim > 0.3) {
          score += authorSim * 0.3; // Up to 0.3 bonus
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = book;
      }
    }

    let confidence: "high" | "medium" | "none";
    if (bestScore >= 0.6) {
      confidence = "high";
    } else if (bestScore >= 0.35) {
      confidence = "medium";
    } else {
      confidence = "none";
    }

    return {
      extracted: ext,
      matched: confidence !== "none" ? bestMatch : undefined,
      confidence,
    };
  });
}
