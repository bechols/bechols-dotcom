import { BarChart3, BookOpen, Database } from 'lucide-react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { getCurrentlyReadingFromDB, getRecentlyReadPaginatedFromDB, transformDBBookToBookInfo } from '@/lib/database-queries';
import { useEffect, useRef } from 'react';
import { BookCard } from '@/components/BookCard';
import type { BookInfo } from '@/src/types/book-types';
import { Button } from '@/components/ui/button';
import { createServerFn } from '@tanstack/react-start';
import { fetchGoodreadsShelf } from '@/src/lib/goodreads-api';
import { useInfiniteQuery } from '@tanstack/react-query';

const getCurrentBooks = createServerFn({
  method: 'GET',
}).handler(async (): Promise<BookInfo[]> => {
  try {
    // Try database first
    const dbBooks = await getCurrentlyReadingFromDB()
    if (dbBooks.length > 0) {
      return dbBooks.map(transformDBBookToBookInfo)
    }
    
    console.log('Database empty, falling back to Goodreads API for currently reading')
    return fetchGoodreadsShelf({ shelf: 'currently-reading' })
  } catch (error: unknown) {
    console.error('Error fetching current books from database, falling back to API:', error)
    return fetchGoodreadsShelf({ shelf: 'currently-reading' })
  }
})

const getRecentBooksPaginated = createServerFn({
  method: 'GET',
})
  .validator((input: unknown): number => {
    if (typeof input !== 'number') {
      throw new Error('Page parameter must be a number')
    }
    return input
  })
  .handler(async ({ data: pageParam }): Promise<{ books: BookInfo[], nextCursor: number | null }> => {
  try {
    const limit = 20
    const offset = pageParam * limit
    
    // Try database first
    const result = await getRecentlyReadPaginatedFromDB(limit, offset)
    
    if (result.books.length > 0) {
      return {
        books: result.books.map(transformDBBookToBookInfo),
        nextCursor: result.hasMore ? pageParam + 1 : null
      }
    }
    
    // Fallback to API if database is empty (only first page)
    if (pageParam === 0) {
      console.log('Database empty, falling back to Goodreads API for recent books')
      const apiBooks = await fetchGoodreadsShelf({ 
        shelf: 'read', 
        includeRating: true, 
        includeReview: true 
      })
      return { books: apiBooks, nextCursor: null }
    }
    
    return { books: [], nextCursor: null }
  } catch (error: unknown) {
    console.error('Error fetching paginated recent books:', error)
    return { books: [], nextCursor: null }
  }
})


export const Route = createFileRoute('/books/')({
  component: Books,
  loader: async () => {
    const currentBooks = await getCurrentBooks()
    return { currentBooks }
  },
})

function Books() {
  const { currentBooks } = Route.useLoaderData()
  
  const {
    data: recentBooksData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['recentBooks'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await getRecentBooksPaginated({ data: pageParam })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor
    },
  })

  const recentBooks = recentBooksData?.pages.flatMap(page => page.books) ?? []
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 1 }
    )
    
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Currently reading</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link to="/books/want-to-read">
              <BookOpen className="h-4 w-4" />
              Want to Read
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link to="/books/analytics">
              <BarChart3 className="h-4 w-4" />
              Reading Analytics
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link to="/books/explore">
              <Database className="h-4 w-4" />
              Explore Database
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {currentBooks.map((bookInfo: BookInfo) => (
          <BookCard
            key={bookInfo.title}
            {...bookInfo}
          />
        ))}
      </div>
      {currentBooks.length === 0 && (
        <div className="text-lg">{`Maybe I'm not reading anything right now, or maybe the Goodreads API finally stopped working.`}</div>
      )}

      {recentBooks.length > 0 && (
        <h1 className="text-2xl md:text-3xl font-bold py-6">Recently read</h1>
      )}

      <div className="space-y-6">
        {recentBooks.map((bookInfo: BookInfo, index: number) => (
          <div key={`${bookInfo.title}-${index}`}>
            <BookCard
              {...bookInfo}
            />
          </div>
        ))}
      </div>
      
      {/* Loading and infinite scroll trigger */}
      {status === 'pending' && (
        <div className="flex justify-center py-8">
          <div className="text-lg">Loading books...</div>
        </div>
      )}
      
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="text-lg">Loading more books...</div>
          ) : (
            <Button onClick={() => void fetchNextPage()} variant="outline">
              Load More
            </Button>
          )}
        </div>
      )}
      
      {status === 'success' && recentBooks.length === 0 && (
        <div className="text-lg py-6">No recently read books found.</div>
      )}
    </div>
  )
}