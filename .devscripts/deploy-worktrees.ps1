# Deploy script for worktree-based workflow
# Builds in main workspace and deploys to gh-pages workspace

param(
    [string]$Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = "Stop"

# Get current script location and derive workspace paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$MainWorkspace = Split-Path -Parent $ScriptDir
$GhPagesWorkspace = Join-Path (Split-Path -Parent $MainWorkspace) "deliaxe-paint-gh-pages"

Write-Host "Starting automated deploy between worktrees..." -ForegroundColor Green

# Step 1: Build in main workspace
Write-Host "Building in main workspace: $MainWorkspace" -ForegroundColor Yellow
Set-Location $MainWorkspace

# Ensure we're on main branch
$CurrentBranch = & git branch --show-current 2>$null
if ($LASTEXITCODE -eq 0 -and $CurrentBranch -ne "main") {
    Write-Host "Switching to main branch..." -ForegroundColor Yellow
    & git checkout main
} else {
    Write-Host "Already on main branch" -ForegroundColor Yellow
}

& git pull origin main

# Install dependencies and build
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Blue
    npm ci --legacy-peer-deps
}

npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed - dist/ folder not found"
    exit 1
}

Write-Host "Build completed successfully" -ForegroundColor Green

# Step 2: Deploy to gh-pages workspace  
Write-Host "Deploying to gh-pages workspace: $GhPagesWorkspace" -ForegroundColor Yellow

# Check if gh-pages workspace exists
if (-not (Test-Path $GhPagesWorkspace)) {
    Write-Error "gh-pages workspace not found at: $GhPagesWorkspace"
    Write-Host "Run: git worktree add `"$GhPagesWorkspace`" gh-pages" -ForegroundColor Yellow
    exit 1
}

Set-Location $GhPagesWorkspace

# Ensure we're on gh-pages branch
$CurrentBranch = & git branch --show-current 2>$null
if ($LASTEXITCODE -eq 0 -and $CurrentBranch -ne "gh-pages") {
    Write-Host "Switching to gh-pages branch..." -ForegroundColor Yellow
    & git checkout gh-pages
} else {
    Write-Host "Already on gh-pages branch" -ForegroundColor Yellow
}

& git pull origin gh-pages

# Clear existing files (except .git and important files)
$FilesToKeep = @(".git", "CNAME", ".nojekyll", ".gitignore", "README.md")
Get-ChildItem -Force | Where-Object { 
    $_.Name -notin $FilesToKeep -and $_.Name -notlike ".*"
} | ForEach-Object {
    Write-Host "Removing: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleared old files from gh-pages workspace" -ForegroundColor Blue

# Copy new build files
Copy-Item -Path "$MainWorkspace\dist\*" -Destination "." -Recurse -Force

# Ensure CNAME exists for custom domain
if (-not (Test-Path "CNAME")) {
    "deliaxe-paint.anarka.de" | Out-File -FilePath "CNAME" -Encoding ascii -NoNewline
}

# Ensure .nojekyll exists for GitHub Pages
if (-not (Test-Path ".nojekyll")) {
    New-Item -ItemType File -Name ".nojekyll" | Out-Null
}

Write-Host "Copied dist/ files to gh-pages workspace" -ForegroundColor Blue

# Step 3: Commit and push
Write-Host "Committing changes..." -ForegroundColor Yellow

& git add -A

# Check if there are changes to commit
$Changes = & git status --porcelain
if ($Changes) {
    & git commit -m $Message
    & git push origin gh-pages
    
    Write-Host "Deployed successfully to GitHub Pages!" -ForegroundColor Green
    Write-Host "Site will be available at: https://deliaxe-paint.anarka.de" -ForegroundColor Cyan
} else {
    Write-Host "No changes to deploy" -ForegroundColor Blue
}

# Step 4: Return to main workspace
Set-Location $MainWorkspace

Write-Host "Deploy completed! You're back in main workspace." -ForegroundColor Green
Write-Host "Main workspace: $MainWorkspace" -ForegroundColor Blue
Write-Host "Gh-pages workspace: $GhPagesWorkspace" -ForegroundColor Blue