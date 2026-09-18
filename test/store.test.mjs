import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";
import { SnippetStore } from "../dist/storage/store.js";
const { extractTags, detectLanguage, qualityScore } = await import("../dist/models.js");

test("search finds by fuzzy title", () => {
  const s = new SnippetStore();
  s.add([make({}), make({ id: "t2", title: "JWT auth middleware", language: "typescript" })]);
  const r = s.search({ query: "token buket" });
  assert.ok(r.snippets.length > 0);
  assert.equal(r.snippets[0].id, "test-1");
});

test("language filter excludes mismatches", () => {
  const s = new SnippetStore();
  s.add([make({}), make({ id: "t2", title: "JWT auth", language: "typescript" })]);
  const r = s.search({ query: "auth", languages: ["typescript"] });
  assert.equal(r.snippets.length, 1);
  assert.equal(r.snippets[0].language, "typescript");
});

test("tag filter works", () => {
  const s = new SnippetStore();
  s.add([make({ tags: ["http"] }), make({ id: "t2", tags: ["db"] })]);
  const r = s.search({ query: "", tags: ["db"] });
  assert.equal(r.snippets[0].id, "t2");
});

test("empty index returns nothing", () => {
  const s = new SnippetStore();
  const r = s.search({ query: "anything" });
  assert.equal(r.snippets.length, 0);
});

test("extractTags detects http and async", () => {
  const tags = extractTags("await fetch(url)", "javascript");
  assert.ok(tags.includes("http"));
  assert.ok(tags.includes("async"));
});

test("detectLanguage", () => {
  assert.equal(detectLanguage("main.go"), "go");
  assert.equal(detectLanguage("unknownfile"), "text");
});

test("qualityScore rewards fresh repos", () => {
  const fresh = qualityScore({ stars: 100, forks: 10, recencyDays: 5 });
  const stale = qualityScore({ stars: 100, forks: 10, recencyDays: 400 });
  assert.ok(fresh > stale);
});

function make(over) {
  return {
    id: "test-1",
    title: "Token bucket rate limiter",
    description: "Limits requests using a token bucket algorithm",
    code: "func Allow() bool { /* token bucket */ }",
    language: "go",
    tags: ["http", "go"],
    source: { type: "github", url: "https://github.com/x/y", repository: "x/y" },
    author: { login: "tester" },
    quality: { stars: 1000, forks: 100, recencyDays: 10, score: 320 },
    updatedAt: new Date().toISOString(),
    indexedAt: new Date().toISOString(),
    ...over,
  };
}
