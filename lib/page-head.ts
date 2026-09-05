const origin = "https://www.bechols.com";
const image = `${origin}/ben_and_liz_point_lobos.webp`;

export function pageHead(path: string, title: string, description: string) {
  const url = new URL(path, origin).href;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Ben Echols" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: "Ben with his favorite person." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: "Ben with his favorite person." },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
