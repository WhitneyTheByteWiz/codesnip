import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import type { SnippetStore } from "../storage/store.js";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export async function startServer(_store: SnippetStore | null, port: number): Promise<void> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const safePath = url.pathname.replace(/^\//, "");

    let filePath = "index.html";
    if (safePath) {
      const stat = await tryStat(resolve(PUBLIC_DIR, safePath));
      if (stat?.isFile()) filePath = safePath;
    }

    try {
      const content = await readFile(resolve(PUBLIC_DIR, filePath));
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });

  await new Promise<void>((ok) => server.listen(port, ok));
  console.log(`CodeSnip UI → http://localhost:${port}`);
}

async function tryStat(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}
