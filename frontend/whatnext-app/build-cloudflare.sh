#!/bin/bash

# Build script for Cloudflare Pages deployment on Windows
# This script avoids the Windows-specific issues with @cloudflare/next-on-pages

echo "Building Next.js app for Cloudflare Pages..."

# Clean previous builds
rm -rf .next .vercel out

# Build Next.js
npm run build

# Use @cloudflare/next-on-pages with compatibility mode
npx @cloudflare/next-on-pages@1 --experimental-minify

echo "Build complete! Deploy with: npm run deploy"