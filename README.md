# Ben Echols Personal Website

This is a personal website built with [TanStack Start](https://tanstack.com/start).

## Features

- **Personal Portfolio**: Professional experience and work history
- **Reading List**: Live integration with Goodreads API showing current and recent reads
- **Curated Content**: Collection of interesting articles and essays

## Getting Started

### Prerequisites

- Node.js 24.20+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (create `.env`):

```bash
GOODREADS_USER_ID=your_goodreads_user_id
GOODREADS_API_KEY=your_goodreads_api_key
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal) with your browser to see the result.

### Building

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── app/                    # File-based routes
│   ├── __root.tsx         # Root layout component
│   ├── index.tsx          # Homepage route
│   ├── about.tsx          # About page route
│   ├── about/             # Nested about routes
│   ├── books.tsx          # Books page with Goodreads integration
│   ├── interesting.tsx    # Curated articles page
│   └── globals.css        # Global styles and CSS variables
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   ├── Hero.tsx          # Homepage hero section
│   ├── Nav.tsx           # Navigation component
│   └── History.tsx       # Work experience component
└── lib/
    └── utils.ts          # Utility functions
```

## Key Features

### TanStack Server Functions

The books page uses TanStack Server Functions for secure server-side API calls to Goodreads, providing:

- Server-side data fetching
- Automatic loading states
- Type-safe data handling

### File-Based Routing

Routes are automatically generated from the file structure in `src/app/`:

- `/` → `index.tsx`
- `/about` → `about.tsx`
- `/about/user-manual` → `about/user-manual.tsx`
- `/books` → `books.tsx`
- `/interesting` → `interesting.tsx`

### Component System

Built on top of shadcn/ui for consistent, accessible components:

- Radix UI primitives
- Tailwind CSS styling
- Full TypeScript support
- Customizable design tokens

## Environment Variables

| Variable            | Description                          | Required             |
| ------------------- | ------------------------------------ | -------------------- |
| `GOODREADS_USER_ID` | Your Goodreads user ID for API calls | Yes (for books page) |
| `GOODREADS_API_KEY` | Your Goodreads API key               | Yes (for books page) |

## Learn More

To learn more about the technologies used:

- [TanStack Start Documentation](https://tanstack.com/start/latest) - The full-stack React framework
- [TanStack Router Documentation](https://tanstack.com/router/latest) - Type-safe routing
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility-first CSS framework
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Component system
- [Vite Documentation](https://vitejs.dev/) - Build tool and development server

## Deployment

Deployed on Vercel

## Agent-readable pages

Public pages support `Accept: text/markdown` as well as HTML. The server converts
the rendered page content, honors Accept quality values, and sets `Vary: Accept`
on both variants. The minimal homepage adds supplemental context from
`lib/site-overview.ts` only to its Markdown representation; it is also described
in `public/llms.txt`. No user-agent detection or hidden page text is used.
Unsupported formats return 406;
missing pages retain 404 with links to the sitemap and site guide.

`public/llms.txt` describes when to use the site, and `public/robots.txt` points
to `public/sitemap.xml`. Update the sitemap and guide when adding or removing
public pages. Update `lastmod` only when a page changes; the live reading lists
omit dates rather than reporting a stale or invented modification time.

With the development server running, run `npm run test:site`. To check a local
production build, run `npm run build`, start it with
`PORT=3001 node .output/server/index.mjs`, then run
`SITE_TEST_URL=http://127.0.0.1:3001 npm run test:site`.

## Migration Notes

This project was migrated from Next.js to TanStack Start, maintaining all functionality while upgrading to:

- More flexible routing system
- Better TypeScript integration
- Improved development experience with Vite
- Modern React patterns with Server Functions
