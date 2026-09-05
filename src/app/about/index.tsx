import { pageHead } from "@/lib/page-head";
import History from "@/components/History";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/")({
  head: () =>
    pageHead(
      "/about",
      "About Ben Echols",
      "Ben Echols’s experience and career history.",
    ),
  component: AboutIndex,
});

function AboutIndex() {
  return <History />;
}
