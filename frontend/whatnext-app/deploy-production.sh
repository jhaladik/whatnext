#!/bin/bash
# Production Deployment Script for WhatNext Frontend
# This script builds and deploys the app to Cloudflare Pages production

echo -e "\033[36mStarting WhatNext Production Deployment...\033[0m"

# Step 1: Build the project
echo -e "\n\033[33mStep 1: Building the project...\033[0m"
npm run build

if [ $? -ne 0 ]; then
    echo -e "\033[31mBuild failed! Exiting...\033[0m"
    exit 1
fi

echo -e "\033[32mBuild successful!\033[0m"

# Step 2: Deploy to Cloudflare Pages (main branch)
echo -e "\n\033[33mStep 2: Deploying to Cloudflare Pages...\033[0m"
npx wrangler pages deploy out --project-name=whatnext-frontend --branch=main --commit-dirty=true

if [ $? -ne 0 ]; then
    echo -e "\033[31mDeployment failed!\033[0m"
    exit 1
fi

echo -e "\n\033[32m✅ Deployment successful!\033[0m"
echo -e "\033[36mYour app is live at:\033[0m"
echo -e "  Production: https://whatnext-frontend.pages.dev"
echo -e "  Main branch: https://main.whatnext-frontend.pages.dev"