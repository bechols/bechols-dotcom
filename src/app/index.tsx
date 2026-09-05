import { pageHead } from "@/lib/page-head";
import Hero from "@/components/Hero";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "/",
      "Ben Echols",
      "Ben Echols’s personal site: experience, ways of working, books, and interesting ideas.",
    ),
  component: Home,
});

function Home() {
  return <Hero />;
}
