export type SourceType = "github" | "stackoverflow" | "gist";

export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  source: {
    type: SourceType;
    url: string;
    repository?: string;
    filePath?: string;
    lineStart?: number;
    lineEnd?: number;
  };
  author: {
    login: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  quality: {
    stars: number;
    forks: number;
    views?: number;
    recencyDays: number;
    score: number;
  };
  updatedAt: string;
  indexedAt: string;
}

export interface SearchQuery {
  query: string;
  languages?: string[];
  tags?: string[];
  sources?: SourceType[];
  limit?: number;
}

export interface SearchResult {
  snippets: (Snippet & { score: number })[];
  total: number;
  queryTimeMs: number;
}

export interface SearchHit {
  id: string;
  score: number;
}

export function qualityScore(q: { stars: number; forks: number; recencyDays: number }): number {
  let score = q.stars * 0.3 + q.forks * 0.2;
  if (q.recencyDays < 30) score *= 1.5;
  else if (q.recencyDays < 90) score *= 1.2;
  else if (q.recencyDays > 365) score *= 0.8;
  return Math.round(score * 100) / 100;
}

const LANG_BY_EXT: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".mjs": "javascript", ".cjs": "javascript", ".py": "python", ".go": "go",
  ".rs": "rust", ".java": "java", ".kt": "kotlin", ".c": "c", ".h": "c",
  ".cpp": "cpp", ".hpp": "cpp", ".cc": "cpp", ".cs": "csharp", ".rb": "ruby",
  ".php": "php", ".swift": "swift", ".sh": "bash", ".sql": "sql",
  ".html": "html", ".css": "css", ".scss": "scss", ".json": "json",
  ".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".md": "markdown",
  ".lua": "lua", ".dart": "dart", ".scala": "scala", ".ex": "elixir",
};

export function detectLanguage(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return LANG_BY_EXT[ext] ?? "text";
}

const TAG_PATTERNS: [string, RegExp][] = [
  ["async", /async|await|Promise|Future/i],
  ["http", /http|fetch|axios|request|response/i],
  ["db", /sql|query|database|orm|migration/i],
  ["auth", /auth|login|oauth|jwt|token|session/i],
  ["test", /test|spec|mock|assert/i],
  ["cli", /process\.argv|argv|commander|clap/i],
  ["config", /config|settings|env\b|environment/i],
  ["error-handling", /try|catch|except|rescue|error handling/i],
  ["parsing", /parse|regex|tokenizer|split/i],
  ["concurrency", /goroutine|thread|mutex|channel|worker/i],
];

export function extractTags(code: string, language: string): string[] {
  const tags = TAG_PATTERNS.filter(([, re]) => re.test(code)).map(([tag]) => tag);
  if (language !== "text") tags.push(language);
  return [...new Set(tags)];
}
