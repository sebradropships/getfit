# Pushes this project to https://github.com/sebradropships/getfit
#
# Run it from inside the sebra-storefront folder:
#   Right-click the folder -> "Open in Terminal", then:
#   powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1
#
# Git will prompt you to sign in to GitHub the first time. That happens in
# your browser or Windows Credential Manager -- your credentials stay with
# you and are not stored in this project.

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/sebradropships/getfit.git"

Set-Location -Path $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "git is not installed. Get it from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

if (Test-Path ".env.local") {
    Write-Host "Found .env.local -- it is gitignored and will NOT be pushed." -ForegroundColor Yellow
}

if (-not (Test-Path ".git")) {
    Write-Host "Initialising repository..." -ForegroundColor Cyan
    git init | Out-Null
    git branch -M main
}

if (git remote | Select-String -Quiet '^origin$') {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

git add -A

# Fail loudly if a secret somehow got staged.
$staged = git diff --cached --name-only
if ($staged -contains ".env.local" -or $staged -contains ".env") {
    Write-Host "Refusing to continue: an env file is staged. Check .gitignore." -ForegroundColor Red
    exit 1
}

if (git diff --cached --quiet) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
} else {
    git commit -m "Headless Shopify storefront: Next.js App Router + Storefront API"
}

Write-Host "Pushing to $RepoUrl ..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "Done. Next: import the repo at https://vercel.com/new" -ForegroundColor Green
Write-Host "Then add these environment variables in Vercel:" -ForegroundColor Green
Write-Host "  SHOPIFY_STORE_DOMAIN            = vfuvr4-df.myshopify.com"
Write-Host "  SHOPIFY_STOREFRONT_ACCESS_TOKEN = <your Storefront API token>"
