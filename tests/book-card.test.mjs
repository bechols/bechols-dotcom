/* global process */
import assert from "node:assert/strict";
import { test } from "node:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const root = process.cwd();
const output = join(root, "tests", ".book-card-test.cjs");

await build({
  stdin: {
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { BookCard } from "./components/BookCard";
      const html = renderToStaticMarkup(React.createElement(BookCard, {
        title: "Calendar Test",
        author: "Test Author",
        link: "https://example.com/book",
        imageURL: "https://example.com/cover.jpg",
        dateStarted: "2026-09-04",
        dateRead: "2026-09-05",
      }));
      console.log(html);
    `,
    resolveDir: root,
  },
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
});

test("calendar dates render identically in every timezone", () => {
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      const result = spawnSync(process.execPath, [output], {
        cwd: root,
        env: { ...process.env, TZ: timezone },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Started:\s*9\/4\/2026/);
      assert.match(result.stdout, /Finished:\s*9\/5\/2026/);
    }
  } finally {
    rmSync(output, { force: true });
  }
});
