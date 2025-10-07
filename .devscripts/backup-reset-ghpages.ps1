# Backup local gh-pages and reset it to origin/gh-pages
$ErrorActionPreference = 'Stop'
Write-Host "Starting backup+reset of local gh-pages"

# Ensure we're in repo root
$repoRoot = Resolve-Path .
Set-Location $repoRoot

# Fetch fresh refs
git fetch origin

# Determine backup branch name
$baseName = 'backup-gh-pages-local'
$backupName = $baseName
git show-ref --verify --quiet refs/heads/$backupName
if ($LASTEXITCODE -eq 0) {
  $ts = Get-Date -Format 'yyyyMMddHHmmss'
  $backupName = "$baseName-$ts"
}

# Create the backup branch pointing at current gh-pages (if gh-pages doesn't exist locally, this will fail)
if ((git rev-parse --verify gh-pages -q) -eq $null) {
  Write-Host "Local branch 'gh-pages' does not exist. Creating an empty local gh-pages from origin/gh-pages for safety."
  git fetch origin gh-pages
  git checkout -b gh-pages origin/gh-pages
}

git branch $backupName gh-pages
Write-Host "Created backup branch: $backupName"

# Checkout gh-pages and reset hard to origin/gh-pages
git checkout gh-pages
git reset --hard origin/gh-pages
Write-Host "Reset local 'gh-pages' to match 'origin/gh-pages'"

# Show brief status
git rev-parse --abbrev-ref HEAD | ForEach-Object { Write-Host "Now on branch: $_" }
Write-Host "Remote head for gh-pages:"; git rev-parse origin/gh-pages
Write-Host "Local head for gh-pages:"; git rev-parse gh-pages
Write-Host "Backup branch saved as: $backupName"
