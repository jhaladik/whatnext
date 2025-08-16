# Setting Up API Secrets for WhatNext Pages Functions

## Required Secrets

You need to add these secrets in the Cloudflare Dashboard:

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com
   - Select "Pages" from the left sidebar
   - Click on "whatnext-frontend" project

2. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Click "Add variable" for Production environment
   - Add these secrets:

### Required API Keys:
```
OPENAI_API_KEY = your-openai-api-key
CLAUDE_API_KEY = your-claude-api-key  
TMDB_API_KEY = your-tmdb-api-key
```

### How to get these keys:
- **OPENAI_API_KEY**: From https://platform.openai.com/api-keys
- **CLAUDE_API_KEY**: From https://console.anthropic.com/settings/keys
- **TMDB_API_KEY**: From https://www.themoviedb.org/settings/api

3. **Save and Redeploy**
   - After adding all secrets, click "Save"
   - The next deployment will have access to these secrets

## Test the Setup

Once secrets are added, test the full flow:

1. Go to https://whatnext-frontend.pages.dev
2. Select a question flow
3. Answer all questions
4. You should see movie recommendations with:
   - Poster images (from TMDB)
   - Rich descriptions
   - Emotional moment summary
   - Surprise recommendations

## Troubleshooting

If recommendations don't load:
1. Check browser console for errors
2. Verify all secrets are added correctly
3. Check that the worker bindings are working:
   - D1 Database
   - KV Namespaces
   - Vectorize index

## Current Status

✅ Frontend deployed with Pages Functions
✅ All API endpoints migrated
✅ Session management working
✅ Navigation fixed
⏳ Waiting for API secrets to be added

Once secrets are added, the app will be fully functional!