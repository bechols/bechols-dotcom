/* global process */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { QueryClient, InfiniteQueryObserver } from "@tanstack/react-query";

const root = process.cwd();
const output = join(root, "tests", ".book-errors-test.mjs");
await build({
  stdin: {
    contents:
      'export * from "./lib/book-server-fns"; export * from "./lib/database"; export * from "./lib/database-queries";',
    resolveDir: root,
  },
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins: [
    {
      name: "server-function-test-adapter",
      setup(build) {
        build.onResolve({ filter: /^@tanstack\/react-start$/ }, () => ({
          path: "server-function",
          namespace: "test",
        }));
        build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `export function createServerFn() { let validate = x => x; return { validator(fn) { validate = fn; return this; }, handler(fn) { return async (input) => fn({data: validate(input?.data)}); } }; }`,
        }));
      },
    },
  ],
});
const api = await import(output);
const fixture = mkdtempSync(join(tmpdir(), "books-errors-"));
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
await test("book data errors and cache retention", async (t) => {
  process.chdir(fixture);
  mkdirSync("public");
  copyFileSync(resolve(root, "public/books.db"), "public/books.db");
  const writer = await api.getWritableDatabase();
  try {
    await t.test("real snapshot serves lists and analytics", async () => {
      assert.ok((await api.getAllWantToRead()).length > 0);
      assert.equal(
        (await api.getRecentBooksPaginated({ data: 0 })).books.length,
        20,
      );
      assert.ok((await api.getAnalyticsData()).totalBooks > 0);
    });
    await t.test(
      "missing optional genres are allowed but broken genre queries reject",
      async () => {
        writer.exec("DROP TABLE book_genres");
        assert.ok((await api.getAllWantToRead()).length > 0);
        assert.deepEqual(await api.getGenreAnalyticsFromDB(), []);
        writer.exec("CREATE TABLE book_genres (goodreads_id TEXT)");
        await assert.rejects(api.getAllWantToRead(), /no such column/);
        await assert.rejects(api.getGenreAnalyticsFromDB(), /no such column/);
      },
    );
    await t.test("invalid pagination is rejected", async () => {
      for (const data of [
        -1,
        0.5,
        NaN,
        Infinity,
        "0",
        Number.MAX_SAFE_INTEGER,
      ]) {
        await assert.rejects(api.getRecentBooksPaginated({ data }));
      }
    });
    await t.test(
      "successful empty shelves and zero analytics remain valid data",
      async () => {
        writer.exec("DELETE FROM reviews");
        assert.deepEqual(await api.getAllWantToRead(), []);
        assert.deepEqual(await api.getCurrentBooks(), []);
        assert.deepEqual(await api.getRecentBooksPaginated({ data: 0 }), {
          books: [],
          nextCursor: null,
        });
        assert.equal((await api.getAnalyticsData()).totalBooks, 0);
      },
    );
    await t.test(
      "SQL failures reject across all query/server layers and preserve cache",
      async () => {
        writer.exec("DROP TABLE reviews");
        for (const query of [
          api.getCurrentBooks,
          api.getAllWantToRead,
          api.getAnalyticsData,
          api.getCurrentlyReadingFromDB,
          api.getRecentlyReadFromDB,
          api.getWantToReadPaginatedFromDB,
          api.getGenreAnalyticsFromDB,
          () => api.getRecentBooksPaginated({ data: 1 }),
        ]) {
          await assert.rejects(query(), /no such table: reviews/);
        }
        const cached = [{ title: "Previously loaded book" }];
        client.setQueryData(["books"], cached);
        await assert.rejects(
          client.fetchQuery({
            queryKey: ["books"],
            queryFn: api.getAllWantToRead,
          }),
        );
        assert.deepEqual(client.getQueryData(["books"]), cached);
        assert.equal(client.getQueryState(["books"]).status, "error");
      },
    );
    await t.test(
      "failed next page preserves pages and cursor for retry",
      async () => {
        const page = { books: [{ title: "First page" }], nextCursor: 1 };
        client.setQueryData(["recent"], { pages: [page], pageParams: [0] });
        const observer = new InfiniteQueryObserver(client, {
          queryKey: ["recent"],
          initialPageParam: 0,
          getNextPageParam: (page) => page.nextCursor,
          queryFn: ({ pageParam }) =>
            api.getRecentBooksPaginated({ data: pageParam }),
          retry: false,
        });
        const result = await observer.fetchNextPage();
        assert.equal(result.isFetchNextPageError, true);
        assert.deepEqual(result.data.pages, [page]);
        assert.equal(result.hasNextPage, true);
        observer.destroy();
      },
    );
  } finally {
    api.closeDatabase();
    client.clear();
    process.chdir(root);
    rmSync(fixture, { recursive: true, force: true });
    rmSync(output, { force: true });
  }
});
