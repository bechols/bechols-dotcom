import { pageHead } from "@/lib/page-head";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Book, CalendarDays, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type GenreAnalytics } from "@/lib/database-queries";
import { analyticsQueryOptions } from "@/lib/book-queries";

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

// Helper function to get week number (simple approach)
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000; // 86400000 = 24 * 60 * 60 * 1000
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
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
  for (const item of data) {
    const date = parseISODate(item.date_started);
    if (!date || date < startDate || date > adjustedEndDate) {
      continue;
    }

    let key: string;

    switch (interval) {
      case "week": {
        // Use ISO week number: YYYY-WW format
        const year = date.getFullYear();
        const weekNumber = getWeekNumber(date);
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
        const weekNumber = getWeekNumber(currentDate);
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

// Custom scatter shape with error bars
interface ScatterShapeProps {
  cx?: number;
  cy?: number;
  payload?: GenreAnalytics;
}

function ScatterWithErrorBars(props: ScatterShapeProps) {
  const { cx, cy, payload } = props;

  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  // Calculate pixel height per rating unit (assuming 5-star scale and 400px height)
  // Y-axis goes from 0-5, chart height is 400px with margins
  const chartHeight = 400 - 80; // 400px - top/bottom margins
  const pixelsPerRating = chartHeight / 5;

  // Calculate error bar positions in pixels
  const errorBarHeight = payload.stdDev * pixelsPerRating;
  const upperY = cy - errorBarHeight;
  const lowerY = cy + errorBarHeight;
  const capWidth = 8;

  return (
    <g>
      {/* Error bar line */}
      <line
        x1={cx}
        y1={upperY}
        x2={cx}
        y2={lowerY}
        stroke="#8b5cf6"
        strokeWidth={1.5}
        opacity={0.5}
      />
      {/* Upper cap */}
      <line
        x1={cx - capWidth / 2}
        y1={upperY}
        x2={cx + capWidth / 2}
        y2={upperY}
        stroke="#8b5cf6"
        strokeWidth={1.5}
        opacity={0.5}
      />
      {/* Lower cap */}
      <line
        x1={cx - capWidth / 2}
        y1={lowerY}
        x2={cx + capWidth / 2}
        y2={lowerY}
        stroke="#8b5cf6"
        strokeWidth={1.5}
        opacity={0.5}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={6} fill="#8b5cf6" stroke="white" strokeWidth={2} />
    </g>
  );
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
  head: () =>
    pageHead(
      "/books/analytics",
      "Reading Analytics | Ben Echols",
      "Explore Ben Echols’s reading history through charts and statistics.",
    ),
  component: Analytics,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(analyticsQueryOptions());
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
  const { data } = useSuspenseQuery(analyticsQueryOptions());

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

        {/* Genre Analytics */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Genre Ratings vs Reading Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Error bars show rating variance (standard deviation) within each category
            </p>

            {data.genreAnalytics.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="books"
                      name="Books Read"
                      label={{
                        value: "Number of Books",
                        position: "insideBottom",
                        offset: -10,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="avgRating"
                      name="Average Rating"
                      domain={[0, 5]}
                      label={{
                        value: "Average Rating",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const firstPayload = payload[0];
                        if (
                          !firstPayload ||
                          typeof firstPayload !== "object" ||
                          !("payload" in firstPayload)
                        ) {
                          return null;
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        const data = firstPayload.payload as GenreAnalytics;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{data.category}</p>
                            <p className="text-sm">Books: {data.books}</p>
                            <p className="text-sm">
                              Avg Rating: {data.avgRating.toFixed(2)}★
                            </p>
                            <p className="text-sm">
                              Std Dev: ±{data.stdDev.toFixed(2)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Genre Categories"
                      data={data.genreAnalytics}
                      fill="#8b5cf6"
                      shape={(props: ScatterShapeProps) => <ScatterWithErrorBars {...props} />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No genre data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
