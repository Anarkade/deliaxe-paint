# Quick development server launcher
# Starts dev server in main workspace

$ErrorActionPreference = "Stop"

# Get workspace path from script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$MainWorkspace = Split-Path -Parent $ScriptDir

Write-Host "🛠️ Starting development server in: $MainWorkspace" -ForegroundColor Green

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