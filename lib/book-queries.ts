import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query";
import {
  getAllWantToRead,
  getCurrentBooks,
  getRecentBooksPaginated,
  getAnalyticsData,
} from "@/lib/book-server-fns";

export const wantToReadQueryOptions = () =>
  queryOptions({
    queryKey: ["allWantToRead"],
    queryFn: () => getAllWantToRead(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    networkMode: "offlineFirst",
    refetchOnWindowFocus: false,
  });

export const currentBooksQueryOptions = () =>
  queryOptions({
    queryKey: ["currentBooks"],
    queryFn: () => getCurrentBooks(),
  });

export const recentBooksQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ["recentBooks"],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await getRecentBooksPaginated({ data: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

export const analyticsQueryOptions = () =>
  queryOptions({
    queryKey: ["analyticsData"],
    queryFn: () => getAnalyticsData(),
  });
