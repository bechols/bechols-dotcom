/**
 * Genre hierarchy configuration for 2-level categorization
 * Consolidates genres into 11 parent categories with child genres
 */

export interface GenreConfig {
  children: string[];
  consolidate: Record<string, string>;
}

export const GENRE_HIERARCHY: Record<string, GenreConfig> = {
  "Fiction": {
    children: [
      "fiction",
      "literary-fiction",
      "contemporary",
      "novels",
      "classics",
      "short-stories",
      "short-story",
      "short-story-collections",
      "historical-fiction",
      "romance",
      "adventure",
      "humor",
      "western",
      "childrens",
      "mythology",
      "time-travel"
    ],
    consolidate: {
      "novels": "fiction",
      "contemporary": "literary-fiction",
      "short-story": "short-stories",
      "short-story-collections": "short-stories"
    }
  },
  "Science Fiction & Fantasy": {
    children: [
      "science-fiction",
      "sci-fi",
      "fantasy",
      "cyberpunk",
      "dystopian",
      "dystopia",
      "space-opera",
      "space",
      "epic-fantasy",
      "high-fantasy",
      "magical-realism",
      "urban-fantasy",
      "young-adult",
      "steampunk",
      "litrpg"
    ],
    consolidate: {
      "sci-fi": "science-fiction",
      "space": "space-opera",
      "dystopia": "dystopian"
    }
  },
  "Mystery, Thriller & Horror": {
    children: [
      "mystery",
      "thriller",
      "crime",
      "horror",
      "true-crime"
    ],
    consolidate: {}
  },
  "History & Biography": {
    children: [
      "history",
      "american-history",
      "biography",
      "memoir",
      "memoirs",
      "war",
      "military"
    ],
    consolidate: {
      "memoirs": "memoir"
    }
  },
  "Science & Nature": {
    children: [
      "science",
      "biology",
      "physics",
      "mathematics",
      "math",
      "medicine",
      "health",
      "nature",
      "evolution",
      "neuroscience",
      "complexity",
      "environment",
      "animals"
    ],
    consolidate: {
      "math": "mathematics"
    }
  },
  "Technology & Programming": {
    children: [
      "technology",
      "programming",
      "software",
      "software-engineering",
      "data",
      "artificial-intelligence",
      "ai",
      "computer-science",
      "computers",
      "engineering",
      "systems"
    ],
    consolidate: {
      "ai": "artificial-intelligence",
      "computers": "computer-science"
    }
  },
  "Business & Economics": {
    children: [
      "business",
      "economics",
      "econ",
      "finance",
      "management",
      "leadership",
      "entrepreneurship",
      "startup",
      "startups",
      "investing",
      "strategy",
      "work",
      "productivity",
      "product-management",
      "product",
      "marketing"
    ],
    consolidate: {
      "econ": "economics",
      "startups": "startup",
      "product": "product-management"
    }
  },
  "Social Sciences": {
    children: [
      "philosophy",
      "psychology",
      "self-help",
      "politics",
      "sociology",
      "law",
      "anthropology",
      "race",
      "feminism",
      "education",
      "language",
      "religion"
    ],
    consolidate: {}
  },
  "Arts, Design & Writing": {
    children: [
      "design",
      "architecture",
      "urban-planning",
      "urbanism",
      "writing",
      "literature",
      "essays",
      "poetry",
      "art",
      "music",
      "food",
      "creativity"
    ],
    consolidate: {
      "urbanism": "urban-planning"
    }
  },
  "Travel & Culture": {
    children: [
      "travel"
    ],
    consolidate: {}
  },
  "Reference & Other": {
    children: [
      "reference",
      "parenting",
      "games",
      "sports",
      "non-fiction"
    ],
    consolidate: {}
  }
};

/**
 * Genres to remove entirely from the database
 */
export const REMOVE_GENRES = [
  // Geographic
  "russia",
  "russian",
  "japan",
  "japanese",
  "india",
  "china",
  "africa",
  "new-york",
  "american",

  // Meta/format
  "audible",
  "1001-books",
  "pulitzer",
  "graphic-novel",
  "graphic-novels",
  "comics",
  "novella",

  // Overly specific with low counts
  "baduk",
  "comedy",
  "westerns",

  // Awards and reading challenges (meta genres)
  "booker-prize",
  "rory-gilmore-reading-challenge",
  "national-book-award",
  "nobel-prize",
  "newbery-medal"
];

/**
 * Build a mapping from child genre -> parent category
 */
export function buildGenreToParentMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const [parent, config] of Object.entries(GENRE_HIERARCHY)) {
    for (const child of config.children) {
      map.set(child, parent);
    }
  }

  return map;
}

/**
 * Build a flattened mapping of old genre -> new genre
 * Includes both consolidation rules and removal rules
 */
export function buildGenreConsolidationMap(): Map<string, string | null> {
  const map = new Map<string, string | null>();

  // Add consolidation mappings
  for (const config of Object.values(GENRE_HIERARCHY)) {
    for (const [oldGenre, newGenre] of Object.entries(config.consolidate)) {
      map.set(oldGenre, newGenre);
    }
  }

  // Mark removed genres
  for (const genre of REMOVE_GENRES) {
    map.set(genre, null); // null means remove
  }

  return map;
}

/**
 * Format a genre name for display (capitalize, replace hyphens with spaces)
 */
export function formatGenreName(genre: string): string {
  return genre
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
