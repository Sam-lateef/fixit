# sync.ps1 — two-way sync this repo with its GitHub remote
# Usage:
#   .\sync.ps1            # commit local changes (timestamp msg), pull --rebase, push
#   .\sync.ps1 "message"  # same, but use your own commit message
#   .\sync.ps1 -PullOnly  # just pull latest from GitHub (e.g. after a phone/cloud session)

param(
  [string]$Message,
  [switch]$PullOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Sync on branch '$branch'" -ForegroundColor Cyan

if ($PullOnly) {
  git fetch origin
  git pull --rebase --autostash origin $branch
  Write-Host "Pulled latest from origin/$branch." -ForegroundColor Green
  return
}

# 1. Commit any local changes
$dirty = git status --porcelain
if ($dirty) {
  if (-not $Message) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "sync: local changes $stamp"
  }
  git add -A
  git commit -m $Message
  Write-Host "Committed: $Message" -ForegroundColor Green
} else {
  Write-Host "No local changes to commit." -ForegroundColor DarkGray
}

# 2. Pull remote (rebase local commits on top), then push
git fetch origin
git pull --rebase --autostash origin $branch
git push origin $branch
Write-Host "Synced with origin/$branch." -ForegroundColor Green
