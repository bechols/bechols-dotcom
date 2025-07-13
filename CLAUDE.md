# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal website built with TanStack Start (React Router), TypeScript, and Tailwind CSS. The site showcases Ben Echols' personal information, reading list via Goodreads API integration, and various personal content pages.

## Common Commands

### Development

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

### Database Scripts

- `node scripts/scrape-goodreads.js` - Full Goodreads data scrape to populate database
- `node scripts/sync-goodreads.js` - Incremental sync for recent changes
- `node scripts/init-db.js` - Initialize database schema
- `node scripts/test-db-queries.js` - Test database query functions

### Testing

No test framework is currently configured in this project.

## Architecture & Key Components

### Project Structure

- **TanStack Start Router**: Uses TanStack Start with React Router for file-based routing
- **Routing**: Files in `src/app/` directory map to routes (e.g., `src/app/books/analytics.tsx` → `/books/analytics`)
- **Route Components**: Each route file exports a `Route` object created with `createFileRoute()`
- **Layout**: Global layout with navigation and footer
- **Pages**: Route-based pages in `src/app/` subdirectories (about, books, interesting)
- **Components**: Reusable UI components in `components/` directory
- **Styling**: Tailwind CSS with custom theme configuration

### UI Framework

- **Radix UI**: Core component library (@radix-ui/react-\*)
- **Shadcn/ui**: Component system built on Radix (components/ui/)
- **Lucide React**: Icon library
- **React Icons**: Additional icon sets (Simple Icons)

### Key Features

#### Goodreads Integration

The `/books` page integrates with Goodreads API to display:

- Currently reading books
- Recently read books with ratings and reviews
- Uses XML parsing (xml2js) and axios for API calls
- Requires environment variables: `GOODREADS_USER_ID` and `GOODREADS_API_KEY`

#### Custom Styling

- **Tailwind v4**: Uses Tailwind CSS v4 with @tailwindcss/vite plugin
- **IMPORTANT**: globals.css must include `@import "tailwindcss";` for Tailwind v4 to work properly
- Williams College purple color: `#500082` (defined as `williams-purple` in Tailwind config)
- Custom typography plugin enabled
- Responsive design with mobile-first approach

#### Git Integration

- Build-time git commit SHA injection via `next.config.mjs`
- Displayed in footer as `NEXT_PUBLIC_GIT_COMMIT_SHA`

### Component Architecture

- **Nav.tsx**: Main navigation with social links (LinkedIn, GitHub, email)
- **Hero.tsx**: Homepage hero section with personal photo and navigation buttons
- **UI Components**: Reusable components following Shadcn/ui patterns
  - Button, Card, AspectRatio, NavigationMenu
  - All styled with Tailwind CSS and CSS variables for theming

### Content Structure

- Personal pages in `src/app/about/` with nested routes
- Static content pages for books and interesting links
- Image optimization with React Image component
- Remote image support configured for Goodreads book covers

## Environment Variables

Required for full functionality:

- `GOODREADS_USER_ID` - Goodreads user ID for API calls
- `GOODREADS_API_KEY` - Goodreads API key for book data
- `NEXT_PUBLIC_GIT_COMMIT_SHA` - Auto-generated during build

## Database & Analytics

### Database Architecture

- **SQLite Database**: Uses SQLite database stored in `public/books.db` (accessible as static asset)
- **Async Database Functions**: All database functions are async to support both local file access and network fetching
- **Vercel Deployment Strategy**:
  - **Local Development**: Reads database from `public/books.db` file path
  - **Vercel Production**: Fetches database from `https://bechols.com/books.db` and writes to `/tmp/books.db`
  - **Error Handling**: Gracefully falls back to empty data if database unavailable
- **Database Queries**: Custom functions in `lib/database-queries.ts` for book data operations

### Analytics System

- **Complex Analytics**: Reading analytics with time-based aggregation at `/books/analytics`
  - Supports week/month/year intervals with current-time boundary enforcement
  - ISO 8601 date format (YYYY-MM-DD) with database constraints for data integrity
  - Full SQLite date function compatibility (strftime, date, julianday, etc.)
  - Stacked bar charts for rating distribution with inverted tooltip ordering
  - Progress bar visualizations for top authors ranking
- **Performance**: Analytics queries process 1000+ books efficiently with proper indexing
- **Dual Data Sources**: Falls back from database to Goodreads API if database is empty

### Critical Implementation Details

- **Server Functions**: Use `createServerFn()` for database access - all must be async
- **Database Path**: Always use `public/books.db` (not `data/books.db`) for consistency
- **Vercel Limitations**: Serverless functions can't access `public/` via filesystem, must fetch via HTTP
- **Error Recovery**: Database connection failures return empty data rather than crashing the app

## Data Visualization

- **Recharts Library**: Used for all charts (LineChart, BarChart, stacked charts)
- **Chart Configurations**: Custom tooltip formatters and itemSorter functions
- **Responsive Design**: All charts use ResponsiveContainer for mobile compatibility
- **Color Schemes**: Consistent color mapping across different chart types

## Development Notes

- Uses TypeScript with strict type checking
- ESLint configured with React/TypeScript recommended rules
- No testing framework currently configured
- Built with TanStack Start for full-stack React applications
- Responsive design optimized for mobile and desktop
- Uses semantic HTML and accessibility attributes

## Routing Notes

- **File-based routing**: Routes are defined by file structure in `src/app/`
- **Route exports**: Each route file must export a `Route` object created with `createFileRoute('/path')`
- **Nested routes**: Subdirectories create nested routes (e.g., `/books/analytics`)
- **Server functions**: Use `createServerFn()` for server-side data fetching
- **Loaders**: Routes can have loaders for data fetching before component renders
- **Route paths**: Use exact paths like `/books/analytics` not `/books/analytics/`

## GitHub Actions & Automation

### Auto-PR System

- **Auto PR Creation**: GitHub Action creates PRs automatically when pushing to any branch (except main)
- **Vercel Preview Integration**: Posts Vercel preview URLs in PR comments automatically
- **Setup Required**: Repository must have "Read and write permissions" enabled for Actions
- **Configuration**: See `.github/SETUP_AUTO_PR.md` for complete setup instructions
- **Optional Secrets**: `VERCEL_TOKEN` and `VERCEL_TEAM_ID` for faster preview URL detection

### Workflow Files

- `.github/workflows/auto-pr.yml` - Creates PRs and waits for Vercel deployments
- `.github/workflows/vercel-preview-comment.yml` - Updates PR comments with preview URLs

## Common Patterns

- **Card Components**: Extensive use of shadcn/ui Card components for layout
- **Hover Effects**: Consistent hover states with scale transforms and shadow changes
- **State Management**: Local useState for UI controls, server functions for data
- **Error Handling**: Graceful fallbacks from database to API with console logging
- **Accessibility**: Proper ARIA labels, semantic HTML, and keyboard navigation

## Shadcn UI Components Notes

- When using shadcn UI components, make sure they're actually installed in @components/ui/ . it's ok to add new components from https://ui.shadcn.com/, just follow the installation steps. https://ui.shadcn.com/docs/installation/tanstack
