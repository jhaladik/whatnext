# 🧪 Test Your WhatNext Frontend

## Quick Test in Browser Console

Open https://whatnext-frontend.pages.dev and run these tests in the browser console (F12):

### Test 1: Check API Client Initialization
```javascript
// You should see:
// [API] Initialized with baseURL: https://movie-recommendations-prod.jhaladik.workers.dev
```

### Test 2: When You Click a Flow Option
You should see in console:
```
=== Starting session ===
Flow type: standard
Time context: afternoon
Calling startSession...
[Store] Starting session with options: {questionFlow: "standard", context: {timeOfDay: "afternoon"}}
[Store] Calling API...
[API] Starting session with URL: https://movie-recommendations-prod.jhaladik.workers.dev/api/movies/start
[API] Options: {questionFlow: "standard", context: {timeOfDay: "afternoon"}}
[API] Response status: 200
[API] Response data: {sessionId: "...", domain: "movies", ...}
[Store] API Response: {sessionId: "...", domain: "movies", ...}
[Store] State updated successfully
Session started successfully!
Calling onFlowSelected to navigate...
```

### Test 3: Manual API Test
```javascript
// Test the API directly
fetch('https://movie-recommendations-prod.jhaladik.workers.dev/api/movies/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    domain: 'movies', 
    questionFlow: 'standard' 
  })
})
.then(r => r.json())
.then(data => {
  console.log('Session created:', data);
  // You should see a sessionId and first question
});
```

## Expected Behavior

### ✅ What Should Work Now:

1. **Home Page** (https://whatnext-frontend.pages.dev/)
   - Shows WhatNext title with gradient text
   - Time-aware greeting (morning/afternoon/evening)
   - 5 flow option cards with icons
   - Debug info shows in console

2. **Click Any Flow Option**
   - Loading indicator appears
   - Console shows API calls
   - Redirects to /questions
   - First question appears

3. **Question Page** (/questions)
   - Progress bar at top
   - Question text
   - Answer options (clickable)
   - Skip button at bottom

4. **After Answering All Questions**
   - Loading animation
   - Redirect to /recommendations
   - Moment summary popup
   - Movie grid with cards

## Troubleshooting

### If clicking doesn't work:
1. Check console for errors
2. Look for red error messages on page
3. Verify you see "[API] Initialized with baseURL: https://movie-recommendations-prod.jhaladik.workers.dev"

### If API calls fail:
- Check Network tab in DevTools
- Look for CORS errors
- Verify worker is running: https://movie-recommendations-prod.jhaladik.workers.dev/api/domains

### Clear everything and retry:
```javascript
localStorage.clear();
location.reload();
```

## Current Debug Features

- Console logging at every step
- Error messages displayed on screen
- Loading indicators
- Debug footer message

---

**The app is now deployed with the correct production worker URL and full debug logging!**