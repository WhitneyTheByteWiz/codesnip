<#
.SYNOPSIS
    Wizard to publish CodeSnip to npm.

.DESCRIPTION
    Walks you through npm authentication and publishing the codesnip-search package.
    Run in PowerShell:  powershell -File scripts/npm-publish-wizard.ps1
#>
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptup.ScriptRoot
Set-Location $ProjectRoot

function Say($msg) { Write-Host "▶ $msg" -ForegroundColor Cyan }
function Step($n, $total, $title) {
    Write-Host "`n── Stage $n/$total: $title ──`n" -ForegroundColor Yellow
}
function Ask($prompt) {
    return Read-Host "$prompt"
}
function AskSecret($prompt) {
    Read-Host "$prompt (hidden)" -AsSecureString | ConvertFrom-SecureString -AsPlainText
    # Note: above reads as secure, converts. For real hidden input in PS7 use Read-Host -AsSecureString.
    # Simpler: Read-Host without secure but user can paste token.
}
function Pause($msg) { Write-Host "`n$msg`nPress ENTER to continue..." -ForegroundColor Gray; Read-Host }

$TotalStages = 4
Write-Host "=== CodeSnip npm Publish Wizard ===`n" -ForegroundColor Green

# Stage 1: Check package.json
Step 1 $TotalStages "Verify package metadata"
Say "Package name : codesnip-search"
Say "Version      : $((Get-Content package.json | ConvertFrom-Json).version)"
$desc = (Get-Content package.json | ConvertFrom-Json).description
Say "Description  : $desc"
Pause "Review the above. The name 'codesnip-search' is available on npm."

# Stage 2: npm auth
Step 2 $TotalStages "npm Authentication"
Say "We need your npm token to publish."
Say "If you don't have one, create it now:"
Say "  1. Go to https://www.npmjs.com/settings/~/tokens"
Say "  2. Click 'Create New Token' → 'Automation'"
Say "  3. Copy the token"
$token = Read-Host "Paste your npm automation token (or 'skip' to do manual npm login)"
if ($token -ne 'skip') {
    $env:NPM_TOKEN = $token
    npm config set "//registry.npmjs.org/:_authToken=$token"
    Say "Verifying token..."
    try {
        $who = npm whoami 2>&1
        Say "Authenticated as: $who"
    } catch {
        Say "ERROR: invalid token. Aborting."
        exit 1
    }
} else {
    Say "Running 'npm login' interactively..."
    npm login
}
Pause "Auth done. Continuing."

# Stage 3: Build
Step 3 $TotalStages "Build & Test"
Say "Compiling TypeScript..."
npx tsc
if ($LASTEXITCODE -ne 0) { Say "TypeScript build failed."; exit 1 }

Say "Running tests..."
node --test
if ($LASTEXITCODE -ne 0) { Say "Tests failed. Fix before publishing."; exit 1 }

# Stage 4: Publish
Step 4 $TotalStages "Publish to npm"
Say "Publishing codesnip-search to npm..."
npm publish --access public
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Published! Install with:" -ForegroundColor Green
    Write-Host "   npm install -g codesnip-search"
    Write-Host "   npx codesnip-search`n"
} else {
    Say "Publish failed. Check errors above."
    exit 1
}
