# Deploying WhatNext to Cloudflare Pages (Windows)

## Known Issue
The `@cloudflare/next-on-pages` tool has compatibility issues on Windows. Here are two working solutions:

## Solution 1: Use WSL (Windows Subsystem for Linux) - Recommended

1. **Install WSL** if not already installed:
   ```powershell
   wsl --install
   ```

2. **Open WSL terminal** and navigate to your project:
   ```bash
   cd /mnt/c/Users/jhala/OneDrive/APPS/WHATNEXT/frontend/whatnext-app
   ```

3. **Build for Cloudflare**:
   ```bash
   npm run build:cloudflare
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

## Solution 2: Direct Cloudflare Dashboard Upload

1. **Build Next.js locally**:
   ```powershell
   cd C:\Users\jhala\OneDrive\APPS\WHATNEXT\frontend\whatnext-app
   npm run build
   ```

2. **Try the Cloudflare build** (may fail on Windows):
   ```powershell
   npx @cloudflare/next-on-pages@1
   ```
   
   If it fails, continue to step 3.

3. **Manual Upload via Dashboard**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to Workers & Pages → whatnext-frontend
   - Click "Create new deployment"
   - Upload the `.vercel/output/static` folder (if it exists)
   - OR upload the `.next` folder as a fallback

## Solution 3: GitHub Actions (Automated)

1. **Push to GitHub**:
   ```powershell
   git add .
   git commit -m "Deploy to Cloudflare Pages"
   git push
   ```

2. **Set up GitHub Actions** workflow:
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to Cloudflare Pages
   
   on:
     push:
       branches: [main, master]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node
           uses: actions/setup-node@v3
           with:
             node-version: '20'
             
         - name: Install dependencies
           run: |
             cd frontend/whatnext-app
             npm ci
             
         - name: Build
           run: |
             cd frontend/whatnext-app
             npm run build:cloudflare
             
         - name: Deploy to Cloudflare Pages
           uses: cloudflare/pages-action@v1
           with:
             apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
             projectName: whatnext-frontend
             directory: frontend/whatnext-app/.vercel/output/static
   ```

3. **Add GitHub Secrets**:
   - `CLOUDFLARE_API_TOKEN`: Get from Cloudflare Dashboard → My Profile → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Current Configuration

Your app is configured for:
- **SSR Mode**: Server-side rendering with edge runtime
- **Middleware**: Session handling and CORS
- **Pages Functions**: API routes in `/functions` directory
- **Bindings**: D1, KV, Vectorize all configured in `wrangler.toml`

## Verify Deployment

After deployment, check:
1. Main page: https://whatnext-frontend.pages.dev
2. Questions flow: https://whatnext-frontend.pages.dev/questions
3. API health: https://whatnext-frontend.pages.dev/api/debug/check-bindings

## Troubleshooting

### Build Fails on Windows
- Use WSL or GitHub Actions
- The error `spawn npx ENOENT` is a known Windows issue

### API Routes Not Working
- Ensure all secrets are set in Cloudflare Dashboard:
  - OPENAI_API_KEY
  - CLAUDE_API_KEY
  - TMDB_API_KEY
- Check bindings in wrangler.toml match your Cloudflare resources

### Session Issues
- The middleware.ts file handles sessions
- Check browser DevTools for sessionId in localStorage

## Quick Deploy Command (WSL)
```bash
# One-liner for WSL
cd /mnt/c/Users/jhala/OneDrive/APPS/WHATNEXT/frontend/whatnext-app && npm run build:cloudflare && npm run deploy
```