import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const handlers = {};
const stored = new Map();
const deleted = [];
let claimed = false;
let networkCalls = 0;
let offline = false;
const cache = {
  put: async (request, response) => stored.set(request.url, response),
  match: async (request) => stored.get(request.url),
};
vm.runInNewContext(
  readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
  {
    URL,
    self: {
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      location: { origin: "https://www.bechols.com" },
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
    },
    caches: {
      open: async () => cache,
      match: cache.match,
      keys: async () => [
        "bechols-static-v2",
        "bechols-static-v3",
        "unrelated-cache",
      ],
      delete: async (name) => deleted.push(name),
    },
    fetch: async () => {
      networkCalls++;
      if (offline) throw new Error("offline");
      return new globalThis.Response(String(networkCalls));
    },
  },
);
let activation;
handlers.activate({
  waitUntil: (promise) => {
    activation = promise;
  },
});
await activation;
assert.deepEqual(deleted, ["bechols-static-v2"]);
assert.ok(claimed);

async function request(path) {
  let response;
  const pending = [];
  handlers.fetch({
    request: { method: "GET", url: `https://www.bechols.com${path}` },
    respondWith: (value) => {
      response = value;
    },
    waitUntil: (value) => pending.push(value),
  });
  const result = await response;
  await Promise.all(pending);
  return result;
}
const first = await request("/ben_and_liz_point_lobos.webp");
const second = await request("/ben_and_liz_point_lobos.webp");
assert.notEqual(
  await first.text(),
  await second.text(),
  "stable images must refresh",
);
const beforeHashed = networkCalls;
const hashed = await request("/assets/index-Ab12Cd34.js");
const cached = await request("/assets/index-Ab12Cd34.js");
assert.equal(await hashed.clone().text(), await cached.clone().text());
assert.equal(networkCalls, beforeHashed + 1);
offline = true;
assert.ok(
  await request("/ben_and_liz_point_lobos.webp"),
  "stable image remains available offline",
);
assert.equal(await request("/books.db"), undefined);
assert.equal(await request("/sw.js"), undefined);
console.log(
  "Service worker refresh, immutable cache, offline fallback, and exclusions passed.",
);
