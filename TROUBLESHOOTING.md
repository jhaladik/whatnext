# 🔍 WhatNext Troubleshooting Guide

## Current Status
- **Frontend**: https://whatnext-frontend.pages.dev ✅
- **Worker**: https://movie-recommendations-prod.jhaladik.workers.dev ✅
- **API Endpoints**: Working ✅
- **manifest.json**: Fixed ✅

## Available Routes

### Working Pages:
1. **Home Page**: https://whatnext-frontend.pages.dev/
   - Should show welcome screen with 5 flow options
   - Time-aware greeting

2. **Questions Page**: https://whatnext-frontend.pages.dev/questions
   - Only works after starting a session from home page
   - Will redirect to home if no session

3. **Recommendations Page**: https://whatnext-frontend.pages.dev/recommendations
   - Only works after completing questions
   - Will redirect to home if no recommendations

## Common Issues & Solutions

### 1. "Cannot move from home page"
**Solution**: Click on one of the 5 question flow options:
- Standard (5 questions)
- Quick Pick (3 questions)
- Deep Dive (7 questions)
- Surprise Me (creative questions)
- Visual Mood (image selection)

### 2. "Page redirects back to home"
**Cause**: No active session
**Solution**: Always start from home page and select a flow

### 3. "No questions showing"
**Check**:
1. Open browser console (F12)
2. Look for errors
3. Check Network tab for API calls to worker

### 4. Browser Console Debugging

Open Developer Tools (F12) and check:

```javascript
// Check if API is reachable
fetch('https://movie-recommendations-prod.jhaladik.workers.dev/api/domains')
  .then(r => r.json())
  .then(console.log)

// Test starting a session
fetch('https://movie-recommendations-prod.jhaladik.workers.dev/api/movies/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    domain: 'movies', 
    questionFlow: 'standard' 
  })
})
  .then(r => r.json())
  .then(console.log)
```

### 5. Check LocalStorage

The app uses localStorage for session persistence. Check:

```javascript
// In browser console
localStorage.getItem('recommendation-storage')
```

Clear if needed:
```javascript
localStorage.clear()
```

## User Flow Testing

### Correct Flow:
1. Go to https://whatnext-frontend.pages.dev/
2. Wait for page to load completely
3. Click on "Standard" (or any flow option)
4. Should redirect to /questions
5. Answer questions
6. Get recommendations

### What Should Happen:
1. **Home Page Load**: 
   - Shows "WhatNext" title
   - Time-based greeting
   - 5 colorful flow option cards

2. **After Clicking Flow**:
   - API call to `/api/movies/start`
   - Receives session ID
   - Redirects to /questions
   - Shows first question

3. **During Questions**:
   - Progress bar at top
   - Question text
   - Answer options
   - Skip button at bottom

4. **After Last Question**:
   - Loading animation
   - Redirect to /recommendations
   - Moment summary popup
   - Movie grid

## API Test URLs

Test these directly in browser:
- https://movie-recommendations-prod.jhaladik.workers.dev/api/domains (should show JSON)

## Quick Fixes

### Force Refresh:
- Windows: Ctrl + F5
- Mac: Cmd + Shift + R

### Clear Cache:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Reset Session:
1. Open console
2. Run: `localStorage.clear()`
3. Refresh page

## Known Issues

1. **manifest.json 404**: Fixed in latest deployment
2. **Direct navigation**: Pages only work in sequence (home → questions → recommendations)
3. **Session timeout**: Sessions expire after 1 hour

## Check Worker Logs

```bash
# View worker logs
npx wrangler tail movie-recommendations-prod --env production
```

## If Nothing Works

1. Check browser console for errors
2. Check Network tab for failed requests
3. Try incognito/private mode
4. Try different browser
5. Check if worker is returning CORS headers

## Success Indicators

✅ Home page loads with 5 cards
✅ Clicking card starts session
✅ Questions appear one by one
✅ Progress bar fills up
✅ Recommendations show after last question
✅ Movie cards are interactive
✅ Quick adjustment buttons work

---

**Current Status**: System is deployed and API is working. Frontend navigation requires starting from home page and selecting a flow option.