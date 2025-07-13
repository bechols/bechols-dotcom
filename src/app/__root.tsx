import "./globals.css"
import {
    HeadContent,
    Outlet,
    Scripts,
    createRootRoute,
    Link,
  } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Nav from "@/components/Nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const commitSha = __GIT_COMMIT_SHA__;

function Footer() {
  const currentYear = new Date().getFullYear();
  const repoUrl = "https://github.com/bechols/bechols2024";

  return (
    <footer className="text-center text-xs text-gray-500 py-6 mt-12 border-t border-gray-200">
      {commitSha && (
        <p className="mt-1">
          <a
            href={`${repoUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            © {currentYear} Ben Echols
            <br />
            {commitSha}
          </a>
        </p>
      )}
    </footer>
  );
}

function NotFound() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-6xl mb-4">404</CardTitle>
          <p className="text-center text-xl text-muted-foreground">
            Page not found
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sorry, the page you're looking for doesn't exist.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild>
              <Link to="/">
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Ben Echols" },
      { name: "description", content: "Ben's personal site" }
    ],
    links: [
      { rel: "icon", href: "/williams-favicon-32x32.png" }
    ]
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
  context: () => ({
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes
        },
      },
    }),
  }),
})

function RootLayout() {
  const { queryClient } = Route.useRouteContext()
  
  return (
    <html lang="en" className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1 px-2 sm:px-4 md:px-8 lg:px-16">
              <Nav />
              <main className="flex justify-center pt-4 sm:pt-6 md:pt-8">
                <Outlet />
              </main>
            </div>
            <Footer />
          </div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}