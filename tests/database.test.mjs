/* global process, setTimeout, Response */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const output = join(root, "tests", ".database-test.mjs");
await build({
  entryPoints: ["lib/database.ts"],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const dbModule = await import(output);
const originalFetch = globalThis.fetch;
const fixture = mkdtempSync(join(tmpdir(), "books-test-"));
const bytes = (await import("node:fs")).readFileSync(
  resolve(root, "public/books.db"),
);

await test("database lifecycle", async (t) => {
  process.chdir(fixture);
  try {
    mkdirSync("public");
    copyFileSync(resolve(root, "public/books.db"), "public/books.db");
    await t.test(
      "concurrent local reads share a read-only connection",
      async () => {
        const connections = await Promise.all(
          Array.from({ length: 20 }, () => dbModule.getDatabase()),
        );
        assert.ok(connections.every((db) => db === connections[0]));
        assert.equal(connections[0].readonly, true);
        assert.throws(
          () => connections[0].exec("CREATE TABLE forbidden (id INTEGER)"),
          /readonly/,
        );
        dbModule.closeDatabase();
        assert.equal(connections[0].open, false);
      },
    );
    await t.test(
      "explicit writes remain local and visible to readers",
      async () => {
        const writer = await dbModule.getWritableDatabase();
        writer.exec("CREATE TABLE lifecycle_test (id INTEGER)");
        const reader = await dbModule.getDatabase();
        writer.exec("INSERT INTO lifecycle_test VALUES (42)");
        assert.equal(
          reader.prepare("SELECT id FROM lifecycle_test").get().id,
          42,
        );
        dbModule.closeDatabase();
      },
    );
    rmSync("public/books.db");
    await t.test(
      "fallback initializes once, never creates a missing local database",
      async () => {
        let downloads = 0;
        globalThis.fetch = async () => {
          downloads++;
          await new Promise((r) => setTimeout(r, 10));
          return new Response(bytes);
        };
        const connections = await Promise.all(
          Array.from({ length: 20 }, () => dbModule.getDatabase()),
        );
        assert.equal(downloads, 1);
        assert.ok(connections.every((db) => db === connections[0]));
        assert.equal(connections[0].readonly, true);
        assert.equal(existsSync("public/books.db"), false);
        const downloadedPath = connections[0].name;
        dbModule.closeDatabase();
        assert.equal(existsSync(downloadedPath), false);
      },
    );
    await t.test("failed initialization rejects and can retry", async () => {
      globalThis.fetch = async () =>
        new Response("unavailable", { status: 503 });
      await assert.rejects(dbModule.getDatabase());
      globalThis.fetch = async () => new Response(bytes);
      assert.ok((await dbModule.getDatabase()).open);
      dbModule.closeDatabase();
    });
    await t.test(
      "closing during initialization does not publish a leaked connection",
      async () => {
        let finish;
        globalThis.fetch = () =>
          new Promise((r) => {
            finish = r;
          });
        const pending = dbModule.getDatabase();
        await new Promise((r) => setTimeout(r, 10));
        dbModule.closeDatabase();
        finish(new Response(bytes));
        await assert.rejects(pending);
        globalThis.fetch = async () => new Response(bytes);
        assert.ok((await dbModule.getDatabase()).open);
      },
    );
  } finally {
    dbModule.closeDatabase();
    globalThis.fetch = originalFetch;
    process.chdir(root);
    rmSync(fixture, { recursive: true, force: true });
    rmSync(output, { force: true });
  }
});
