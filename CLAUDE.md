# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website for Ben Echols built with TanStack Start (full-stack React on Vite), TypeScript, and Tailwind CSS v4. Deployed on Vercel. Features a reading list backed by a SQLite database synced from Goodreads.

## Commands

- `npm run dev` - Start dev server (http://localhost:3000)
- `npm run build` - Production build
- `npm start` - Start production server
- `npm run lint` - ESLint
- `node scripts/scrape-goodreads.js` - Full Goodreads data scrape to SQLite
- `node scripts/sync-goodreads.js` - Incremental Goodreads sync
- `node scripts/init-db.js` - Initialize database schema
- `npm run sync:openlibrary` - Enrich read books with OpenLibrary references (flags: `--verbose`, `--dry-run`, `--force`)

No test framework is configured.

## Architecture

### Routing

TanStack Router with file-based routing in `src/app/`. Each route file exports a `Route` created with `createFileRoute('/path')`.

```
src/app/
├── __root.tsx              → Root layout (nav, footer, React Query provider)
├── index.tsx               → /
├── about.tsx               → /about (outlet for nested routes)
│   ├── index.tsx
│   ├── user-manual.tsx
│   └── how-i-got-into-pm.tsx
├── books.tsx               → /books (tab layout)
│   ├── index.tsx           → Currently reading + recently read
│   ├── want-to-read.tsx    → Paginated with search/sort
│   ├── analytics.tsx       → Reading analytics charts
│   └── explore.tsx         → Datasette DB explorer
├── interesting.tsx         → /interesting
└── globals.css
```

Route tree is auto-generated in `src/routeTree.gen.ts` — don't edit manually.

### Server Functions

Use `createServerFn()` from `@tanstack/react-start` for server-side data access. All server functions are async. Pattern:

```typescript
const getData = createServerFn({ method: "GET" })
  .handler(async () => { /* DB/API access */ });

// In route: loader: async () => await getData()
```

### Database

- **SQLite** via `better-sqlite3`, stored at `public/books.db`
- **Schema**: `books` table + `reviews` table (joined by `book_id`) + `book_genres` table, with shelves: `currently-reading`, `read`, `to-read`
- **Query layer**: `lib/database-queries.ts` — async functions for all book data operations
- **Connection**: `lib/database.ts` — handles initialization and path resolution
- **Vercel deployment**: Reuse one read-only connection and a shared initialization promise per module instance. Try `public/books.db`, then download from `VERCEL_URL` (or production when unset) into a unique temporary directory. Failed initialization can retry. `closeDatabase()` closes handles and removes temporary files.
- **Error pattern**: Database/query failures throw so React Query can retry and retain previously loaded data. Successful empty queries remain empty; do not replace failures with empty lists, zero analytics, or a partial Goodreads shelf. Book routes provide initial-load and refresh retry controls. Maintenance uses `getWritableDatabase()` or the existing standalone scripts, always against local `public/books.db`.
- **WAL checkpoint**: After modifying `books.db` locally, run `PRAGMA wal_checkpoint(TRUNCATE)` before committing. WAL data is invisible to Vercel serverless without checkpointing
- **OpenLibrary enrichment**: `scripts/sync-openlibrary.js` enriches books with `openlibrary_edition_key` and `openlibrary_work_key` via the OpenLibrary API (ISBN lookup with search fallback). Run separately after Goodreads sync
- **Genre enrichment pipeline** (run in order):
  1. `node scripts/fetch-genres.js` — Scrape genres from Goodreads shelves
  2. `node scripts/normalize-genres.js` — Apply manual mappings (e.g., "sci-fi" → "science-fiction")
  3. `node scripts/consolidate-genres.js` — Merge via `lib/genre-hierarchy.ts` hierarchy
  4. `node scripts/remove-infrequent-genres.js` — Drop genres below threshold

### State Management & Caching

- **React Query (TanStack Query v5)** with localStorage persistence (`lib/query-client.ts`)
- Stale time: 5 min, cache time: 24 hours (heavy routes like want-to-read override to 1hr/7d)
- Infinite scroll pagination for book lists using `useInfiniteQuery`
- **Dual-layer caching**: Service worker (`public/sw.js`) caches HTTP responses (stale-while-revalidate); React Query persists query state to localStorage. Both invalidated by git commit SHA, not time
- **Hydration rules** (violating these causes React error #418):
  - Always pass `initialData` from loader to `useQuery`
  - NEVER use `networkMode: "offlineFirst"` on routes with server-loaded data
  - NEVER use `refetchOnMount: true` on routes with server-loaded data
  - Use explicit `isHydrated` state (via `useEffect`) for client-only interactive elements like dropdowns

### Components

- `components/ui/` — shadcn/ui components built on Radix UI primitives. Add new ones from https://ui.shadcn.com/ following TanStack installation steps: https://ui.shadcn.com/docs/installation/tanstack
- `components/` — App components (Nav, Hero, BookCard, History, CatchBoundary)
- Path alias: `@/*` maps to project root (e.g., `@/components/ui/button`)

### Styling

- **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- `globals.css` must include `@import "tailwindcss";` — required for Tailwind v4
- Theme colors defined as CSS variables in `globals.css` `@theme` block
- Custom color: `williams-purple: #500082`
- Fonts: DM Sans Variable (sans), JetBrains Mono Variable (mono)
- Charts: Recharts library with ResponsiveContainer for responsive charts

### Data Visualization

- Recharts for all charts (LineChart, BarChart, stacked charts) at `/books/analytics`
- Custom tooltip formatters with inverted ordering for stacked bar charts

## Environment Variables

- `GOODREADS_USER_ID` — Required for Goodreads API
- `GOODREADS_API_KEY` — Required for Goodreads API

## GitHub Actions

- Auto-PR creation on push to non-main branches (`.github/workflows/auto-pr.yml`)
- Vercel preview URL posted as PR comment (`.github/workflows/vercel-preview-comment.yml`)

## Key Constraints

- Node.js 24.20+ required
- Always use `public/books.db` as the database path (not `data/books.db`)
- Route paths: use `/books/analytics` not `/books/analytics/`
- Git commit SHA injected at build time via `vite.config.ts` (`__GIT_COMMIT_SHA__`) — used as React Query cache buster
- Genre taxonomy is config-driven: `lib/genre-hierarchy.ts` is the single source of truth for both DB normalization scripts and UI rendering (genre dropdown optgroups)
- Adding new browser/service-worker globals requires updating `eslint.config.js` globals section
