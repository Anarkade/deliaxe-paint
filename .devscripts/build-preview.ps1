# Quick build and preview
# Builds project and starts preview server

$ErrorActionPreference = "Stop"

# Get workspace path from script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$MainWorkspace = Split-Path -Parent $ScriptDir

Write-Host "🏗️ Building and previewing project in: $MainWorkspace" -ForegroundColor Green

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