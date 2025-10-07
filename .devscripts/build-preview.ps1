# Quick build and preview
# Builds project and starts preview server

$ErrorActionPreference = "Stop"
$MainWorkspace = "D:\Anarkade\Deliaxe-Paint"

Write-Host "🏗️ Building and previewing project..." -ForegroundColor Green

Set-Location $MainWorkspace

# Ensure we're on main branch
git checkout main

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm ci --legacy-peer-deps
}

# Build project
Write-Host "📦 Building production version..." -ForegroundColor Yellow
npm run build

# Start preview server
Write-Host "🚀 Starting preview server..." -ForegroundColor Green
Write-Host "📍 URL: http://localhost:4173" -ForegroundColor Cyan

npm run preview