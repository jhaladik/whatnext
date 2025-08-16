# Production Deployment Script for WhatNext Frontend
# This script builds and deploys the app to Cloudflare Pages production

Write-Host "Starting WhatNext Production Deployment..." -ForegroundColor Cyan

# Step 1: Build the project
Write-Host "`nStep 1: Building the project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Step 2: Deploy to Cloudflare Pages (main branch)
Write-Host "`nStep 2: Deploying to Cloudflare Pages..." -ForegroundColor Yellow
npx wrangler pages deploy out --project-name=whatnext-frontend --branch=main --commit-dirty=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
Write-Host "Your app is live at:" -ForegroundColor Cyan
Write-Host "  Production: https://whatnext-frontend.pages.dev" -ForegroundColor White
Write-Host "  Main branch: https://main.whatnext-frontend.pages.dev" -ForegroundColor White