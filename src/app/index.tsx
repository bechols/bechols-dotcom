import { pageHead } from "@/lib/page-head";
import Hero from "@/components/Hero";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageHead(
      "/",
      "Ben Echols",
      "Ben Echols’s personal site: experience, ways of working, books, and interesting ideas.",
    ),
    links: [
      { rel: "canonical", href: "https://www.bechols.com/" },
      { rel: "alternate", type: "text/markdown", href: "https://www.bechols.com/", title: "Markdown overview" },
      { rel: "alternate", type: "text/plain", href: "https://www.bechols.com/llms.txt", title: "Site guide for agents" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": "https://www.bechols.com/#person",
        name: "Ben Echols",
        description: "Product leader based in San Francisco, interested in complex systems and products for people who build stuff.",
        url: "https://www.bechols.com/",
        image: "https://www.bechols.com/ben_and_liz_point_lobos.webp",
        sameAs: ["https://linkedin.com/in/benechols", "https://github.com/bechols"],
      }),
    }],
  }),
  component: Home,
});

function Home() {
  return <Hero />;
}
