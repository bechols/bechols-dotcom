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
- **Schema**: `books` table + `reviews` table (joined by `book_id`), with shelves: `currently-reading`, `read`, `to-read`
- **Query layer**: `lib/database-queries.ts` — async functions for all book data operations
- **Connection**: `lib/database.ts` — handles initialization and path resolution
- **Vercel deployment**: Serverless functions can't read `public/` via filesystem. Production fetches the DB from `https://bechols.com/books.db` and writes to `/tmp/books.db`
- **Fallback**: Database failures return empty data (no crashes); falls back to Goodreads API if DB is empty

### State Management

- **React Query (TanStack Query v5)** with localStorage persistence (`lib/query-client.ts`)
- Stale time: 5 min, cache time: 24 hours
- Infinite scroll pagination for book lists using `useInfiniteQuery`

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

- Node.js 22+ required
- Always use `public/books.db` as the database path (not `data/books.db`)
- Route paths: use `/books/analytics` not `/books/analytics/`
- Git commit SHA injected at build time via `vite.config.ts` (`__GIT_COMMIT_SHA__`)
