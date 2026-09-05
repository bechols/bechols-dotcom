/* global process, fetch, URL */
import assert from "node:assert/strict";
import { test } from "node:test";

const origin = process.env.SITE_TEST_URL || "http://127.0.0.1:3000";
const get = (path, accept = "text/html", method = "GET") =>
  fetch(new URL(path, origin), { headers: { Accept: accept }, method });

test("homepage keeps its minimal server-rendered introduction and Person identity", async () => {
  const response = await get("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
  const text = main.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(text.length >= 100, `Only ${text.length} homepage characters`);
  assert.doesNotMatch(text, /My experience spans|His experience spans|This is my personal site/);
  assert.match(main, /href="\/about"/);
  assert.match(html, /rel="alternate"[^>]*type="text\/markdown"/);
  assert.match(main, /<h1\b[^>]*>Ben Echols<\/h1>/);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  assert.ok(schemas.some((schema) => schema["@type"] === "Person" && schema.name === "Ben Echols"));
});

test("Markdown negotiation honors preferences and varies both representations", async () => {
  for (const [accept, expected] of [
    ["text/markdown", "text/markdown"],
    ["text/html", "text/html"],
    ["*/*", "text/html"],
    ["text/markdown;q=0.5, text/html;q=0.9", "text/html"],
    ["text/html;q=0.5, text/markdown;q=0.9", "text/markdown"],
    ["text/markdown;q=0, */*;q=1", "text/html"],
    ["text/html;q=0, text/markdown;q=0", null],
    ["application/json", null],
  ]) {
    const response = await get("/", accept);
    assert.equal(response.status, expected ? 200 : 406, accept);
    assert.match(response.headers.get("vary") || "", /\bAccept\b/i);
    if (expected) assert.ok(response.headers.get("content-type").startsWith(expected), accept);
    if (expected === "text/markdown") {
      const markdown = await response.text();
      assert.match(markdown, /^# Ben Echols/m);
      assert.match(markdown, /^## About this site/m);
      assert.ok(markdown.length >= 500);
      assert.match(markdown, /\[.*\]\(.*\/about\)/);
      assert.doesNotMatch(markdown, /<script|<svg|\$TSR/);
    }
  }
  const head = await get("/", "text/markdown", "HEAD");
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-type"), /^text\/markdown/);
  assert.equal(await head.text(), "");
});

test("missing pages retain 404 and offer recovery in HTML and Markdown", async () => {
  for (const path of ["/this-page-does-not-exist", "/about/this-page-does-not-exist"]) {
    for (const accept of ["text/html", "text/markdown"]) {
      const response = await get(path, accept);
      assert.equal(response.status, 404);
      assert.ok(response.headers.get("content-type").startsWith(accept));
      const body = await response.text();
      assert.match(body, /\/sitemap.xml/);
      assert.match(body, /\/llms.txt/);
    }
  }
});

test("discovery files and sitemap pages are publicly readable", async () => {
  const sitemap = await get("/sitemap.xml", "application/xml");
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9/);
  const paths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  for (const path of ["/", "/about", "/about/user-manual", "/about/how-i-got-into-pm", "/books", "/books/want-to-read", "/books/analytics", "/books/explore", "/interesting"]) {
    assert.ok(paths.includes(path), `Sitemap missing ${path}`);
    const response = await get(path, "text/markdown");
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /^text\/markdown/, path);
    assert.ok((await response.text()).trim().length > 0, path);
  }
  const instructions = await get("/llms.txt", "text/plain");
  assert.equal(instructions.status, 200);
  assert.match(await instructions.text(), /when to use/i);
  const robots = await get("/robots.txt", "text/plain");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/www.bechols.com\/sitemap.xml/);
  for (const path of ["/about/how-i-got-into-pm"]) {
    const response = await get(path, "text/markdown");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/markdown/);
    assert.ok((await response.text()).length >= 500, path);
  }
});
