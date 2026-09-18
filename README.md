# >_ CodeSnip

![Build](https://github.com/WhitneyTheByteWiz/codesnip/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/codesnip-search)
![License](https://img.shields.io/github/license/WhitneyTheByteWiz/codesnip)

**Find battle-tested code before you write it.**

CodeSnip is a local-first search engine for reusable code. It indexes real, starred GitHub projects and lets you search for solutions to the problem you're solving right now — *"rate limiter"*, *"jwt auth"*, *"retry with backoff"* — then jump straight to the source to adapt it.

Stop copy-pasting from stale blog posts. Start reusing proven code.

## Why

Every developer solves the same problems thousands of times. Somewhere out there is a well-starred repo that already solved yours. CodeSnip makes finding it a one-command job:

```bash
codesnip index -k "rate limiting" -l go -s 500
codesnip search "token bucket"
```

## Features

- **Zero-config local index** — your snippets live in `./codesnip/`, no database, no account
- **Quality-ranked results** — sorted by stars, forks, and recency, so stale code sinks
- **Blazing full-text search** — fuzzy matching + prefix search + field boosting (MiniSearch)
- **Web UI included** — `codesnip serve` for a dark-mode search interface
- **Two-letter commands** — `index`, `search`, `show`, `serve`. That's the whole API
- **GitHub token optional** — works anonymously; add `GITHUB_TOKEN` for higher rate limits

## Install

```bash
npm install -g codesnip-search
# or run without installing:
npx codesnip-search
# or clone and run:
git clone https://github.com/WhitneyTheByteWiz/codesnip.git && cd codesnip && npm i && npm test
```

## Quickstart

```bash
# 1. Build an index — top-starred Go repos about rate limiting
codesnip index -k "rate limiting" -l go -s 500 -n 100

# 2. Search it
codesnip search "token bucket"

# 3. Inspect the best hit
codesnip show gh-uber-go-ratelimit

# 4. Or browse in the browser
codesnip serve   # → http://localhost:4173
```

## How scoring works

```
score = stars × 0.3 + forks × 0.2
        × 1.5 (updated < 30 days)
        × 1.2 (updated < 90 days)
        × 0.8 (updated > 1 year)
```

Fresh, popular code wins. Abandoned repos fade.

## Roadmap

- [x] GitHub repository indexing
- [x] Fuzzy full-text search
- [x] Web UI
- [ ] Stack Overflow answer indexing
- [ ] Inline code extraction (index actual functions, not whole repos)
- [ ] `codesnip add <file>` — index your own private snippets
- [ ] Semantic search (local embeddings)

## Contributing

PRs welcome! Keep dependencies minimal, keep the CLI fast, keep the tests green.

```bash
git clone https://github.com/WhitneyTheByteWiz/codesnip.git
cd codesnip && npm install && npm test
```

## License

MIT © Whitney Jr Syulikwa

---

⭐ **Found it useful? Star the repo — it helps other developers find it too.**
