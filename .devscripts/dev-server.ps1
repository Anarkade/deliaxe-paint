# Quick development server launcher
# Starts dev server in main workspace

$ErrorActionPreference = "Stop"
$MainWorkspace = "D:\Anarkade\Deliaxe-Paint"

Write-Host "🛠️ Starting development server..." -ForegroundColor Green

Set-Location $MainWorkspace

# Ensure we're on main branch
git checkout main

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm ci --legacy-peer-deps
}

# Start dev server
Write-Host "🚀 Launching Vite dev server..." -ForegroundColor Green
Write-Host "📍 URL: http://localhost:8080" -ForegroundColor Cyan

npm run dev