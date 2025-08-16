# 🚀 Deploy to Cloudflare Pages

## Prerequisites
- Cloudflare account
- GitHub account (optional but recommended)
- Your worker deployed at a public URL

## Method 1: Direct Upload (Quick Deploy)

1. **Build the project locally**:
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Pages**:
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Workers & Pages"
   - Click "Create application" → "Pages" → "Upload assets"

3. **Upload the `out` folder**:
   - Project name: `whatnext-frontend`
   - Upload the entire `out` directory
   - Click "Deploy site"

4. **Set environment variable**:
   - Go to Settings → Environment variables
   - Add: `NEXT_PUBLIC_WORKER_URL` = `https://movie-recommendations.YOUR-SUBDOMAIN.workers.dev`

## Method 2: GitHub Integration (Recommended)

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Pages
   - Click "Create application" → "Pages" → "Connect to Git"
   - Select your GitHub repository

3. **Configure build settings**:
   - Framework preset: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `out`
   - Root directory: `frontend/whatnext-app`

4. **Set environment variables**:
   - Add `NEXT_PUBLIC_WORKER_URL` with your worker URL

5. **Deploy**:
   - Click "Save and Deploy"
   - Wait for build to complete

## Method 3: Using Wrangler CLI

1. **Install Wrangler** (if not already):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Deploy to Pages**:
   ```bash
   cd frontend/whatnext-app
   npm run build
   npx wrangler pages deploy out --project-name=whatnext-frontend
   ```

4. **Set environment variable**:
   ```bash
   npx wrangler pages secret put NEXT_PUBLIC_WORKER_URL --project-name=whatnext-frontend
   # Enter your worker URL when prompted
   ```

## Post-Deployment

### Your app will be available at:
- `https://whatnext-frontend.pages.dev`
- Or your custom domain if configured

### Custom Domain (Optional)
1. Go to your Pages project → Custom domains
2. Add your domain
3. Follow DNS configuration instructions

### Environment Variables
Make sure to update `NEXT_PUBLIC_WORKER_URL` to your production worker URL:
- Development: `http://localhost:8787`
- Production: `https://movie-recommendations.YOUR-SUBDOMAIN.workers.dev`

## Troubleshooting

### CORS Issues
If you get CORS errors, make sure your worker has proper CORS headers:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### 404 Errors on Routes
The static export handles client-side routing. If you get 404s:
- Make sure all pages are in the `out` directory
- Check that `next.config.ts` has `output: 'export'`

### API Connection Issues
- Verify `NEXT_PUBLIC_WORKER_URL` is set correctly
- Check that your worker is deployed and accessible
- Test the worker endpoints directly

## Success! 🎉
Your WhatNext frontend is now live on Cloudflare Pages!
- Fast global CDN delivery
- Automatic SSL/HTTPS
- Built-in analytics
- Seamless updates with git push