import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Book, CalendarDays, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getDatabase } from "@/lib/database";

type AnalyticsData = {
  totalBooks: number;
  averageRating: number;
  booksThisYear: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
  readingActivity: Array<{ date_started: string; books: number }>;
  availableYears: number[];
};

const getAnalyticsData = createServerFn({
  method: "GET",
}).handler(async (): Promise<AnalyticsData> => {
  const db = await getDatabase();

  // If database is not available, return empty data
  if (!db) {
    console.warn("Database not available, returning empty analytics data");
    return {
      totalBooks: 0,
      averageRating: 0,
      booksThisYear: 0,
      ratingDistribution: [],
      topAuthors: [],
      readingActivity: [],
      availableYears: [],
    };
  }

  // Total books read
  const totalBooksResult = db
    .prepare(
      `
    SELECT COUNT(DISTINCT b.id) as count
    FROM books b
    INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = 'read'
  `
    )
    .get() as { count: number };

  // Average rating
  const avgRatingResult = db
    .prepare(
      `
    SELECT AVG(r.rating) as avg_rating
    FROM reviews r
    WHERE r.shelf = 'read' AND r.rating IS NOT NULL
  `
    )
    .get() as { avg_rating: number | null };

  // Books finished this year - use three-part fallback
  const currentYear = new Date().getFullYear().toString();
  const booksThisYear = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM reviews r
    WHERE r.shelf = 'read' 
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
      AND substr(COALESCE(date_read, date_started, date_added), 1, 4) = ?
  `
    )
    .get(currentYear) as { count: number };

  // Rating distribution
  const ratingDistribution = db
    .prepare(
      `
    SELECT 
      r.rating,
      COUNT(*) as count
    FROM reviews r
    WHERE r.shelf = 'read' AND r.rating IS NOT NULL
    GROUP BY r.rating
    ORDER BY r.rating
  `
    )
    .all() as Array<{ rating: number; count: number }>;

  // Top authors
  const topAuthors = db
    .prepare(
      `
    SELECT 
      b.author,
      COUNT(*) as count
    FROM books b
    INNER JOIN reviews r ON b.goodreads_id = r.goodreads_id
    WHERE r.shelf = 'read'
    GROUP BY b.author
    ORDER BY count DESC
    LIMIT 10
  `
    )
    .all() as Array<{ author: string; count: number }>;

  // Reading activity over time - get all data for flexible filtering
  // Use three-part fallback: date_read (finished) -> date_started -> date_added
  const readingActivity = db
    .prepare(
      `
    SELECT 
      COALESCE(date_read, date_started, date_added) as date_started,
      COUNT(*) as books
    FROM reviews r
    WHERE r.shelf = 'read' 
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
    GROUP BY COALESCE(date_read, date_started, date_added)
    ORDER BY COALESCE(date_read, date_started, date_added)
  `
    )
    .all() as Array<{ date_started: string; books: number }>;

  // Get available years from the data using same fallback logic
  const availableYearsResult = db
    .prepare(
      `
    SELECT DISTINCT substr(COALESCE(date_read, date_started, date_added), 1, 4) as year
    FROM reviews r
    WHERE r.shelf = 'read' 
      AND COALESCE(date_read, date_started, date_added) IS NOT NULL
      AND substr(COALESCE(date_read, date_started, date_added), 1, 4) IS NOT NULL
    ORDER BY year
  `
    )
    .all() as Array<{ year: string }>;

  const availableYears = availableYearsResult
    .map((row) => parseInt(row.year))
    .filter((year) => !isNaN(year));

  return {
    totalBooks: totalBooksResult.count,
    averageRating: avgRatingResult.avg_rating ?? 0,
    booksThisYear: booksThisYear.count,
    ratingDistribution,
    topAuthors,
    readingActivity,
    availableYears,
  };
});

// Helper function to parse ISO date from database (e.g., "2024-01-15")
function parseISODate(dateStr: string): Date | null {
  try {
    // ISO date format is YYYY-MM-DD
    const date = new Date(dateStr + "T00:00:00");
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Helper function to get ISO week number (1-53)
function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7; // Make Monday = 0
  target.setDate(target.getDate() - dayNumber + 3); // Thursday of the week
  const firstThursday = target.valueOf();
  target.setMonth(0, 1); // January 1st
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7)); // First Thursday of year
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}

// Helper function to aggregate reading activity by time period
function aggregateReadingActivity(
  data: Array<{ date_started: string; books: number }>,
  interval: "week" | "month" | "year",
  startDate: Date,
  endDate: Date
): Array<{ period: string; books: number; displayPeriod: string }> {
  const result: { [key: string]: number } = {};
  const now = new Date();


  // Adjust end date based on current time for month/week intervals
  let adjustedEndDate = new Date(endDate);
  if (interval === "month") {
    // Don't show months beyond current month - include the entire current month
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    if (adjustedEndDate > currentMonthEnd) {
      adjustedEndDate = currentMonthEnd;
    }
  } else if (interval === "week") {
    // Don't show weeks beyond current week - include the entire current week
    const currentWeekEnd = new Date(now);
    currentWeekEnd.setDate(now.getDate() + (6 - now.getDay())); // End of current week (Saturday)
    currentWeekEnd.setHours(23, 59, 59, 999);
    if (adjustedEndDate > currentWeekEnd) {
      adjustedEndDate = currentWeekEnd;
    }
  }

  // Filter and aggregate data
  let includedCount = 0;
  let excludedCount = 0;

  for (const item of data) {
    const date = parseISODate(item.date_started);
    if (!date || date < startDate || date > adjustedEndDate) {
      excludedCount++;
      continue;
    }
    includedCount++;

    let key: string;

    switch (interval) {
      case "week": {
        // Use ISO week number: YYYY-WW format
        const year = date.getFullYear();
        const weekNumber = getISOWeekNumber(date);
        key = `${year}-W${weekNumber.toString().padStart(2, "0")}`;
        break;
      }
      case "month": {
        key = date.toISOString().slice(0, 7); // YYYY-MM
        break;
      }
      case "year": {
        key = date.getFullYear().toString();
        break;
      }
    }

    result[key] = (result[key] || 0) + item.books;
  }


  // Fill missing periods with zeros
  const periods: Array<{
    period: string;
    books: number;
    displayPeriod: string;
  }> = [];
  const currentDate = new Date(startDate);


  while (currentDate <= adjustedEndDate) {
    let key: string;
    let displayKey: string;

    switch (interval) {
      case "week": {
        // Use ISO week number: YYYY-WW format
        const year = currentDate.getFullYear();
        const weekNumber = getISOWeekNumber(currentDate);
        key = `${year}-W${weekNumber.toString().padStart(2, "0")}`;
        displayKey = `Week ${weekNumber}, ${year}`;
        break;
      }
      case "month": {
        key = currentDate.toISOString().slice(0, 7);
        // Create date from the key to ensure consistency
        const keyDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        displayKey = keyDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        break;
      }
      case "year": {
        key = currentDate.getFullYear().toString();
        displayKey = key;
        break;
      }
    }

    periods.push({
      period: key,
      books: result[key] || 0,
      displayPeriod: displayKey,
    });


    // Increment the date AFTER processing the current period
    switch (interval) {
      case "week":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "month":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "year":
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }

  return periods;
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/books/analytics")({
  component: Analytics,
  loader: async () => {
    const data = await getAnalyticsData();
    return data;
  },
  errorComponent: ({ error, reset }) => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Analytics Unavailable
        </h2>
        <p className="text-muted-foreground mb-4">
          Unable to load reading analytics. This could be due to database issues
          or missing data.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm">Error Details</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {error?.toString()}
        </pre>
      </details>
    </div>
  ),
});

function Analytics() {
  const data = Route.useLoaderData();

  // Get dynamic year options
  const currentYear = new Date().getFullYear();
  const firstYear = data.availableYears[0] || currentYear - 2;
  const lastYear = Math.max(
    data.availableYears[data.availableYears.length - 1] || currentYear,
    currentYear
  );

  // State for time controls
  const [timeInterval, setTimeInterval] = useState<"week" | "month" | "year">(
    "month"
  );
  const [startYear, setStartYear] = useState(
    Math.max(firstYear, lastYear - 2).toString()
  );
  const [endYear, setEndYear] = useState(lastYear.toString());

  // Calculate date range - use explicit constructor to avoid timezone issues
  const startDate = new Date(parseInt(startYear), 0, 1); // Year, month (0-based), day
  const endDate = new Date(parseInt(endYear), 11, 31); // Year, month (0-based), day


  // Process reading activity data
  const readingActivityProcessed = aggregateReadingActivity(
    data.readingActivity,
    timeInterval,
    startDate,
    endDate
  );


  // Transform rating distribution for stacked bar chart
  const ratingChartData = [
    {
      name: "All Books",
      "0★": data.ratingDistribution.find((r) => r.rating === 0)?.count ?? 0,
      "1★": data.ratingDistribution.find((r) => r.rating === 1)?.count ?? 0,
      "2★": data.ratingDistribution.find((r) => r.rating === 2)?.count ?? 0,
      "3★": data.ratingDistribution.find((r) => r.rating === 3)?.count ?? 0,
      "4★": data.ratingDistribution.find((r) => r.rating === 4)?.count ?? 0,
      "5★": data.ratingDistribution.find((r) => r.rating === 5)?.count ?? 0,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Reading Analytics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Books Read"
          value={data.totalBooks}
          icon={Book}
          subtitle="All time"
        />
        <StatCard
          title="Average Rating"
          value={data.averageRating.toFixed(1)}
          icon={Star}
          subtitle="Out of 5 stars"
        />
        <StatCard
          title="Books This Year"
          value={data.booksThisYear}
          icon={CalendarDays}
          subtitle={new Date().getFullYear().toString()}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reading Activity Over Time */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Books Finished Over Time</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Interval:</label>
                  <select
                    value={timeInterval}
                    onChange={(e) =>
                      setTimeInterval(
                        e.target.value as "week" | "month" | "year"
                      )
                    }
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(
                      { length: lastYear - firstYear + 1 },
                      (_, i) => firstYear + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(
                      { length: lastYear - firstYear + 1 },
                      (_, i) => firstYear + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={readingActivityProcessed}
                margin={{ top: 30, right: 20, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayPeriod"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(label: string | number) => label}
                  formatter={(value: number): [number, string] => [
                    value,
                    "Books",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="books"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: "#8884d8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Authors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topAuthors.slice(0, 10).map((author, index) => (
                <div
                  key={author.author}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{author.author}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(author.count / data.topAuthors[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-600">
                      {author.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={ratingChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={() => "Rating Distribution"}
                  itemSorter={(item) => {
                    // Sort by rating value in descending order (5★ to 0★)
                    const rating = parseInt(
                      item.dataKey?.toString().replace("★", "") ?? "0"
                    );
                    return -rating;
                  }}
                />
                <Bar dataKey="0★" stackId="a" fill="#ef4444" />
                <Bar dataKey="1★" stackId="a" fill="#f97316" />
                <Bar dataKey="2★" stackId="a" fill="#eab308" />
                <Bar dataKey="3★" stackId="a" fill="#22c55e" />
                <Bar dataKey="4★" stackId="a" fill="#3b82f6" />
                <Bar dataKey="5★" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
