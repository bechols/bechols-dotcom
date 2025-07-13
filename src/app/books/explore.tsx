import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/books/explore")({
  component: BooksExplore,
});

function BooksExplore() {
  const datasetteUrl = `https://lite.datasette.io/?url=${encodeURIComponent("https://www.bechols.com/books.db")}`;

  return (
    <iframe
      src={datasetteUrl}
      className="w-full h-[800px] border rounded-lg"
      title="Books Database Explorer"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
    />
  );
}
