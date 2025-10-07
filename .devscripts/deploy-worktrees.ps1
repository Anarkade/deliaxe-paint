# Deploy script for worktree-based workflow
# Builds in main workspace and deploys to gh-pages workspace

param(
    [string]$Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = "Stop"

# Paths
$MainWorkspace = "D:\Anarkade\Deliaxe-Paint"
$GhPagesWorkspace = "D:\Anarkade\deliaxe-paint-gh-pages"

Write-Host "🚀 Starting automated deploy between worktrees..." -ForegroundColor Green

# Step 1: Build in main workspace
Write-Host "📦 Building in main workspace..." -ForegroundColor Yellow
Set-Location $MainWorkspace

# Ensure we're on main branch
git checkout main
git pull origin main

# Install dependencies and build
npm ci --legacy-peer-deps
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "❌ Build failed - dist/ folder not found"
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Step 2: Deploy to gh-pages workspace  
Write-Host "🔄 Deploying to gh-pages workspace..." -ForegroundColor Yellow
Set-Location $GhPagesWorkspace

# Ensure we're on gh-pages branch
git checkout gh-pages
git pull origin gh-pages

# Clear existing files (except .git and important files)
$FilesToKeep = @(".git", "CNAME", ".nojekyll", ".gitignore")
Get-ChildItem -Force | Where-Object { 
    $_.Name -notin $FilesToKeep 
} | Remove-Item -Recurse -Force

Write-Host "🗑️ Cleared old files from gh-pages workspace" -ForegroundColor Blue

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

Write-Host "📁 Copied dist/ files to gh-pages workspace" -ForegroundColor Blue

# Step 3: Commit and push
Write-Host "💾 Committing changes..." -ForegroundColor Yellow

git add -A

# Check if there are changes to commit
$Changes = git status --porcelain
if ($Changes) {
    git commit -m $Message
    git push origin gh-pages
    
    Write-Host "✅ Deployed successfully to GitHub Pages!" -ForegroundColor Green
    Write-Host "🌐 Site will be available at: https://deliaxe-paint.anarka.de" -ForegroundColor Cyan
} else {
    Write-Host "ℹ️ No changes to deploy" -ForegroundColor Blue
}

# Return to main workspace
Set-Location $MainWorkspace

Write-Host "🏁 Deploy completed! You're back in main workspace." -ForegroundColor Green