import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/books/explore')({
  component: BooksExplore,
})

function BooksExplore() {
  const datasetteUrl = `https://lite.datasette.io/?url=${encodeURIComponent('https://www.bechols.com/books.db')}`
  const uploadUrl = 'https://lite.datasette.io/'
  const databaseUrl = 'https://www.bechols.com/books.db'

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter">Explore Books Database</h1>
        <p className="text-muted-foreground">
          Interactive SQL exploration of my reading data using <a href="https://github.com/simonw/datasette-lite" target="_blank" rel="noopener noreferrer">Datasette Lite</a>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Explorer</CardTitle>
          <CardDescription>
            Query and explore my books database directly. Try queries like:
            <code className="block mt-2 p-2 bg-muted rounded text-sm">
              SELECT title, author, rating, date_read FROM books WHERE rating = 5 ORDER BY date_read DESC
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={datasetteUrl}
            className="w-full h-[800px] border rounded-b-lg"
            title="Books Database Explorer"
            sandbox="allow-scripts allow-same-origin allow-downloads"
          />
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click table names in the sidebar to browse data</li>
          <li>Use the SQL query box to write custom queries</li>
          <li>Export results as CSV or JSON using the download buttons</li>
          <li>All data is loaded into your browser - no server queries needed</li>
        </ul>
      </div>
    </div>
  )
}