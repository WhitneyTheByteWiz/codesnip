import type { Snippet, SourceType } from "../models.js";
import { qualityScore, detectLanguage, extractTags } from "../models.js";

export interface FetchOptions {
  keywords: string[];
  languages?: string[];
  minStars?: number;
  maxResults?: number;
  token?: string;
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

interface GitHubRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  owner: { login: string; avatar_url: string; html_url: string };
  pushed_at: string;
  created_at: string;
}

/**
 * Indexes high-quality GitHub repositories as reusable snippets.
 * Uses the search/repositories endpoint — one API call returns up to 100
 * curated repos, keeping us well inside the 10 req/min unauthenticated limit.
 */
export class GitHubSource {
  constructor(private token?: string) {}

  async fetch(opts: FetchOptions): Promise<Snippet[]> {
    const parts: string[] = [...opts.keywords];
    if (opts.minStars) parts.push(`stars:>=${opts.minStars}`);
    if (opts.languages?.length) parts.push(`language:${opts.languages[0]}`);
    parts.push("pushed:>2024-01-01");

    const snippets: Snippet[] = [];
    const perPage = 100;
    const maxPages = Math.ceil((opts.maxResults ?? 100) / perPage);

    for (let page = 1; page <= maxPages; page++) {
      const url = new URL("https://api.github.com/search/repositories");
      url.searchParams.set("q", parts.join(" "));
      url.searchParams.set("sort", "stars");
      url.searchParams.set("order", "desc");
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));

      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "codesnip-search",
      };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      const res = await fetch(url, { headers });
      if (res.status === 403) break; // rate limited
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as GitHubSearchResponse;
      for (const repo of data.items) {
        snippets.push(this.repoToSnippet(repo));
      }
      if (data.items.length < perPage) break;
    }

    return snippets.slice(0, opts.maxResults ?? 100);
  }

  private repoToSnippet(repo: GitHubRepo): Snippet {
    const description = repo.description ?? "";
    const code = this.referenceImplementation(description, repo);
    const recencyDays = Math.floor(
      (Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000,
    );

    return {
      id: `gh-${repo.full_name.replace("/", "-")}`,
      title: repo.name,
      description,
      code,
      language: repo.language?.toLowerCase() ?? "text",
      tags: [
        ...(repo.topics ?? []).slice(0, 5),
        ...(repo.language ? [repo.language.toLowerCase()] : []),
      ],
      source: {
        type: "github" as SourceType,
        url: repo.html_url,
        repository: repo.full_name,
      },
      author: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
        profileUrl: repo.owner.html_url,
      },
      quality: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        recencyDays,
        score: qualityScore({
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          recencyDays,
        }),
      },
      updatedAt: repo.pushed_at,
      indexedAt: new Date().toISOString(),
    };
  }

  private referenceImplementation(description: string, repo: GitHubRepo): string {
    return [
      `# ${repo.full_name} — ⭐ ${repo.stargazers_count.toLocaleString()}`,
      `# ${description}`,
      `# Install:  git clone https://github.com/${repo.full_name}`,
      `# Explore:  https://github.com/${repo.full_name}/tree/HEAD/src`,
      `# License-check the repo before adapting into your own project.`,
    ].join("\n");
  }
}
