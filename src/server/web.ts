import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SnippetStore } from "../storage/store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function startServer(store: SnippetStore, port: number): Promise<void> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (url.pathname === "/api/search") {
      const q = url.searchParams.get("q") ?? "";
      const lang = url.searchParams.get("lang");
      const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20", 10));
      const result = store.search({
        query: q,
        languages: lang ? [lang] : undefined,
        limit,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await readFile(resolve(__dirname, "../../public/index.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html.replace("__COUNT__", String(store.size)));
      return;
    }

    res.writeHead(404).end("Not found");
  });

  await new Promise<void>((ok) => server.listen(port, ok));
  console.log(`CodeSnip UI → http://localhost:${port}`);
}
