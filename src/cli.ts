#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { SnippetStore } from "./storage/store.js";
import { GitHubSource } from "./sources/github.js";
import { startServer } from "./server/web.js";

const program = new Command();

function storeFile(): string {
  return resolve(process.env.CODESNIP_HOME ?? ".codesnip", "snippets.json");
}

async function loadStore(): Promise<SnippetStore> {
  return SnippetStore.load(storeFile());
}

program
  .name("codesnip")
  .description("Search and reuse battle-tested code snippets from real projects")
  .version("0.1.0");

program
  .command("index")
  .description("Index snippets from GitHub (top-starred repos matching keywords)")
  .requiredOption("-k, --keywords <words...>", "keywords to search for")
  .option("-l, --lang <language>", "filter by language")
  .option("-s, --stars <n>", "minimum stars", "100")
  .option("-n, --max <n>", "max results", "100")
  .option("--token <token>", "GitHub token (or set GITHUB_TOKEN)")
  .action(async (opts) => {
    const store = await loadStore();
    const gh = new GitHubSource(opts.token ?? process.env.GITHUB_TOKEN);
    process.stdout.write("Indexing from GitHub…\n");
    const snippets = await gh.fetch({
      keywords: opts.keywords,
      languages: opts.lang ? [opts.lang] : undefined,
      minStars: parseInt(opts.stars, 10),
      maxResults: parseInt(opts.max, 10),
    });
    const added = store.add(snippets);
    await store.save(storeFile());
    process.stdout.write(`Added ${added} snippets (total: ${store.size}) → ${storeFile()}\n`);
  });

program
  .command("search")
  .description("Search indexed snippets")
  .argument("<query>", "what to look for")
  .option("-l, --lang <language>", "filter by language")
  .option("-t, --tag <tags...>", "filter by tags")
  .option("-n, --limit <n>", "max results", "10")
  .action(async (query, opts) => {
    const store = await loadStore();
    if (store.size === 0) {
      process.stdout.write("Index is empty. Run first:  codesnip index -k \"your keywords\"\n");
      return;
    }
    const result = store.search({
      query,
      languages: opts.lang ? [opts.lang] : undefined,
      tags: opts.tag,
      limit: parseInt(opts.limit, 10),
    });
    if (result.snippets.length === 0) {
      process.stdout.write(`No results for "${query}" (${result.queryTimeMs}ms)\n`);
      return;
    }
    process.stdout.write(`${result.snippets.length} results (${result.queryTimeMs}ms)\n\n`);
    for (const s of result.snippets) {
      const stars = "★".repeat(Math.min(5, Math.floor(Math.log10(s.quality.stars + 1))));
      process.stdout.write(`${stars} ${s.title}  [${s.language}]  ⭐${s.quality.stars}\n`);
      process.stdout.write(`  ${s.description.slice(0, 100)}\n`);
      process.stdout.write(`  ${s.source.url}\n\n`);
    }
  });

program
  .command("show")
  .description("Show full snippet details by ID")
  .argument("<id>", "snippet id (from search)")
  .action(async (id) => {
    const store = await loadStore();
    const result = store.search({ query: id, limit: 1 });
    const s = result.snippets[0];
    if (!s || !s.id.includes(id)) {
      process.stdout.write(`Not found: ${id}\n`);
      return;
    }
    process.stdout.write(`${s.title}\n${"=".repeat(s.title.length)}\n${s.code}\n\nSource: ${s.source.url}\n`);
  });

program
  .command("serve")
  .description("Start the web UI (self-contained, runs in your browser)")
  .option("-p, --port <port>", "port", "4173")
  .action(async (opts) => {
    const { startServer } = await import("./server/web.js");
    await startServer(null, parseInt(opts.port, 10));
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
