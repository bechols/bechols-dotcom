import { ErrorComponentProps } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function CatchBoundary({ error, reset, info }: ErrorComponentProps) {
  console.error("Route error:", error, info);

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an error while loading this page. This might be due
            to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Database connection issues</li>
            <li>Missing or corrupted data</li>
            <li>Network connectivity problems</li>
            <li>Temporary server issues</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
            <Button variant="ghost" asChild className="flex items-center gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {error?.toString()}
              {info?.componentStack &&
                `\n\nComponent Stack:\n${info.componentStack}`}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

// Default error component for TanStack Router
export default CatchBoundary;
