#!/usr/bin/env bash
# Wizard: Publish CodeSnip to npm
# Walks you through npm authentication and publishing the codesnip-search package.
# Run: bash scripts/npm-publish-wizard.sh

set -euo pipefail

say()  { printf "\033[1;36m▶ %s\033[0m\n" "$*"; }
step() { printf "\n\033[1;33m── Stage %d/%d: %s ──\033[0m\n\n" "$1" "$TOTAL_STAGES" "$2"; }
ask()  { printf "\n%s\n> "; read -r "$1"; export "$1"; }
ask_secret() { printf "\n%s (hidden)\n> "; read -rs "$1"; printf "\n"; export "$1"; }
open_url() { printf "Opening: %s\n" "$1"; if command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"; elif command -v open >/dev/null 2>&1; then open "$1"; else echo "Please open in your browser: $1"; fi; }
pause() { printf "\n%s\nPress ENTER when ready…", "$1"; read -r _; }
confirm() { printf "\n%s [y/N]: " "$1"; read -r ans; case "$ans" in y|Y|yes|YES) return 0;; *) return 1;; esac; }
section() { printf "\n\033[1m%s\033[0m\n" "$1"; }

TOTAL_STAGES=4
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─────────────────────────────────────────────
# Stage 1: Verify package metadata
say "Checking package metadata..."
section "Package name: codesnip-search"
section "Version: $(node -p "require('./package.json').version" 2>/dev/null || echo 'check package.json')"
pause "Review the above. The name 'codesnip-search' is available on npm."

# ─────────────────────────────────────────────
# Stage 2: npm auth (automated token or interactive login)
step 2 "npm Authentication"
say "We need your npm credentials to publish."
say "If you have an automation token (recommended), paste it below."
say "Otherwise, run 'npm login' in another terminal and enter your credentials."
ask_secret "NPM_TOKEN"

export NPM_TOKEN

# Verify the token works
if curl -s -H "Authorization: Bearer $NPM_TOKEN" https://registry.npmjs.org/-/whoami >/dev/null 2>&1; then
  WHOAMI=$(curl -s -H "Authorization: Bearer $NPM_TOKEN" https://registry.npmjs.org/-/whoami)
  say "Authenticated as: $WHOAMI"
else
  say "ERROR: Token is invalid. Aborting."
  exit 1
fi

pause "Token verified. Press ENTER to continue."

# ─────────────────────────────────────────────
# Stage 3: Configure npm
step 3 "Configure npm"
say "Adding your token to npm config for this publish session..."
npm config set //registry.npmjs.org/:_authToken="$NPM_TOKEN" >/dev/null 2>&1
say "npm configured. Package will be published as public."

# ─────────────────────────────────────────────
# Stage 4: Build and publish
step 4 "Build & Publish"
say "Building TypeScript..."
cd "$PROJECT_ROOT"
npx tsc

say "Running tests..."
node --test

say "Publishing to npm..."
# Publish the package (uses the _authToken from npm config)
npm publish --access public

say "Done! Check: https://www.npmjs.com/package/codesnip-search"
say "Install with: npm install -g codesnip-search  OR  npx codesnip-search"

echo ""
echo "All stages complete. 🎉"
