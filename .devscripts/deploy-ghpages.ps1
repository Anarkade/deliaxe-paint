# Safe deploy script: copy dist -> temp, init clean repo, push to origin/gh-pages
$ErrorActionPreference = 'Stop'

# Ensure we're running from repo root
$repoRoot = Resolve-Path .
Write-Host "Repo root: $repoRoot"

$orig = git config --get remote.origin.url
if (-not $orig) { Write-Error "No remote 'origin' configured"; exit 1 }
Write-Host "Origin: $orig"

$dist = Join-Path $repoRoot 'dist'
if (-not (Test-Path $dist)) { Write-Error "dist/ not found at $dist"; exit 1 }

$ts = Get-Date -Format 'yyyyMMddHHmmss'
$temp = Join-Path $env:TEMP ("ghpages-deploy-$ts")
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null
Write-Host "Copying dist to: $temp"
Copy-Item -Path (Join-Path $dist '*') -Destination $temp -Recurse -Force
# If there's a CNAME file in the repo root, include it in the published root so GitHub Pages keeps the custom domain
$cnamePath = Join-Path $repoRoot 'CNAME'
if (Test-Path $cnamePath) {
    Copy-Item -Path $cnamePath -Destination $temp -Force
    Write-Host "Included CNAME in deploy: $(Get-Content $cnamePath -Raw)"
}

Push-Location $temp
try {
    git init -q
    git checkout -b gh-pages
    git config user.name 'gh-pages-deploy'
    git config user.email 'deploy@local'
    git add -A
    git commit -m 'chore: publish dist to gh-pages (clean deploy)'

    # Ensure no remote collision
    if ((git remote) -contains 'origin') { git remote remove origin }
    git remote add origin $orig
    git push --force origin HEAD:gh-pages
    Write-Host "Successfully pushed dist to origin/gh-pages"
} finally {
    Pop-Location
}

# List remote gh-pages top-level files for verification
Write-Host "Remote gh-pages tree (top 200 entries):"
git ls-tree -r --name-only origin/gh-pages | Select-Object -First 200 | ForEach-Object { Write-Host $_ }
