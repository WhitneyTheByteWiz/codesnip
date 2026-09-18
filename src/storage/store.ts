import MiniSearch from "minisearch";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Snippet, SearchQuery, SearchHit, SearchResult } from "../models.js";

const STORE_VERSION = 1;

export class SnippetStore {
  private mini: MiniSearch<Snippet>;
  private snippets = new Map<string, Snippet>();

  constructor() {
    this.mini = new MiniSearch<Snippet>({
      fields: ["title", "description", "code", "language", "tags"],
      storeFields: ["id"],
      extractField: (doc, field) => {
        if (field === "tags") return (doc as Snippet).tags?.join(" ") ?? "";
        return String((doc as unknown as Record<string, unknown>)[field] ?? "");
      },
      searchOptions: {
        boost: { title: 3, description: 2, tags: 2 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
  }

  add(snippets: Snippet[]): number {
    let added = 0;
    for (const s of snippets) {
      if (this.snippets.has(s.id)) continue;
      this.snippets.set(s.id, s);
      this.mini.add(s);
      added++;
    }
    return added;
  }

  search(q: SearchQuery): SearchResult {
    const t0 = performance.now();
    let hits: SearchHit[] = q.query.trim()
      ? this.mini.search(q.query)
      : [...this.snippets.values()].map((s) => ({ id: s.id, score: s.quality.score }));

    const languages = new Set(q.languages ?? []);
    const tags = new Set(q.tags ?? []);
    const sources = new Set(q.sources ?? []);
    const limit = q.limit ?? 20;

    const out: (Snippet & { score: number })[] = [];
    for (const hit of hits) {
      const s = this.snippets.get(hit.id as string);
      if (!s) continue;
      if (languages.size && !languages.has(s.language)) continue;
      if (sources.size && !sources.has(s.source.type)) continue;
      if (tags.size && !s.tags.some((t) => tags.has(t))) continue;
      out.push({ ...s, score: hit.score });
      if (out.length >= limit) break;
    }

    return {
      snippets: out,
      total: out.length,
      queryTimeMs: Math.round(performance.now() - t0),
    };
  }

  get size(): number {
    return this.snippets.size;
  }

  async save(file: string): Promise<void> {
    const payload = { version: STORE_VERSION, snippets: [...this.snippets.values()] };
    await mkdir(dirname(resolve(file)), { recursive: true });
    await writeFile(file, JSON.stringify(payload), "utf8");
  }

  static async load(file: string): Promise<SnippetStore> {
    const store = new SnippetStore();
    try {
      const raw = await readFile(file, "utf8");
      const { snippets } = JSON.parse(raw) as { snippets: Snippet[] };
      store.add(snippets);
    } catch {
      /* first run — empty index */
    }
    return store;
  }
}
