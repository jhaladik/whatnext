# Implementation: Store Actual Recommendations

## Problem
We're generating movie/series/documentary titles via Claude and sending them to TMDB, but we're NOT storing them for analytics. This means we can't analyze:
- What movies/series we're actually recommending
- Which titles are most frequently recommended
- TMDB enrichment success rates
- Correlation between recommendations and user feedback

## Solution
Add recommendation storage at the point where Claude generates them and after TMDB enrichment.

## Code Changes Required

### 1. Update recommendationService.js - Store Claude's recommendations

```javascript
// In getClaudeRecommendations method, after line 138:
async getClaudeRecommendations(userState) {
  // ... existing code ...
  
  // After enrichment (line 138)
  console.log('After TMDB enrichment:', recommendations.map(r => r.title));
  
  // NEW: Store recommendations in database
  await this.storeRecommendations(userState.sessionId, domain, recommendations);
  
  return {
    recommendations,
    reasoning: parsedContent.reasoning || parsedContent.explanation,
    // ... rest of return
  };
}

// NEW METHOD: Add to RecommendationService class
async storeRecommendations(sessionId, domain, recommendations) {
  try {
    // Store each recommendation
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      
      await this.env.DB.prepare(`
        INSERT INTO recommendations (
          session_id, domain, title, year, type, genre, 
          reason, where_to_watch, runtime, rating, position,
          source, tmdb_id, tmdb_found, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        domain,
        rec.title,
        rec.year || null,
        rec.type || domain === 'series' ? 'series' : domain === 'documentaries' ? 'documentary' : 'movie',
        rec.genre || null,
        rec.reason || rec.matchReason || null,
        rec.where_to_watch || rec.source || null,
        rec.runtime || null,
        rec.rating || rec.certification || null,
        i + 1, // position in list
        rec.source || 'claude',
        rec.tmdb_id || null,
        !!rec.poster_url, // If we have a poster, TMDB worked
        Date.now(),
        JSON.stringify({
          vote_average: rec.vote_average,
          vote_count: rec.vote_count,
          has_trailer: !!rec.trailer_url,
          cast_count: rec.cast ? rec.cast.length : 0
        })
      ).run();
    }
    
    console.log(`Stored ${recommendations.length} recommendations for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to store recommendations:', error);
    // Don't throw - this shouldn't break the recommendation flow
  }
}
```

### 2. Update index.js - Track feedback outcomes

```javascript
// In the feedback storage section (around line 408):
if (feedback.loved && feedback.loved.length > 0) {
  for (const title of feedback.loved) {
    // Existing code to store in recommendation_feedback
    await env.DB.prepare(/* existing query */).bind(/* ... */).run();
    
    // NEW: Also track in recommendation_outcomes
    await env.DB.prepare(`
      INSERT OR IGNORE INTO recommendation_outcomes 
      (session_id, title, feedback_type, timestamp)
      VALUES (?, ?, 'loved', ?)
    `).bind(sessionId, title, Date.now()).run();
  }
}
// Similar for 'liked' and 'disliked'
```

### 3. Add Analytics Queries

```javascript
// New analytics functions to add to analytics endpoint

async function getRecommendationStats(db, startTime, endTime) {
  // Most recommended titles
  const topTitles = await db.prepare(`
    SELECT 
      domain,
      title,
      COUNT(*) as times_recommended,
      AVG(CASE WHEN tmdb_found THEN 1 ELSE 0 END) as tmdb_success_rate
    FROM recommendations
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY domain, title
    ORDER BY times_recommended DESC
    LIMIT 20
  `).bind(startTime, endTime).all();
  
  // Recommendation quality metrics
  const quality = await db.prepare(`
    SELECT 
      r.domain,
      COUNT(DISTINCT r.session_id) as total_sessions,
      COUNT(DISTINCT r.title) as unique_titles,
      COUNT(ro.feedback_type) as feedback_count,
      SUM(CASE WHEN ro.feedback_type = 'loved' THEN 1 ELSE 0 END) as loved_count,
      SUM(CASE WHEN ro.feedback_type = 'liked' THEN 1 ELSE 0 END) as liked_count,
      SUM(CASE WHEN ro.feedback_type = 'disliked' THEN 1 ELSE 0 END) as disliked_count
    FROM recommendations r
    LEFT JOIN recommendation_outcomes ro ON r.session_id = ro.session_id AND r.title = ro.title
    WHERE r.timestamp BETWEEN ? AND ?
    GROUP BY r.domain
  `).bind(startTime, endTime).all();
  
  // Platform distribution
  const platforms = await db.prepare(`
    SELECT 
      where_to_watch,
      COUNT(*) as count
    FROM recommendations
    WHERE timestamp BETWEEN ? AND ?
      AND where_to_watch IS NOT NULL
    GROUP BY where_to_watch
    ORDER BY count DESC
  `).bind(startTime, endTime).all();
  
  return {
    topTitles: topTitles.results,
    qualityMetrics: quality.results,
    platforms: platforms.results,
    diversityScore: calculateDiversityScore(topTitles.results)
  };
}

function calculateDiversityScore(titles) {
  // Higher score = more diverse recommendations
  if (!titles || titles.length === 0) return 0;
  
  const totalRecs = titles.reduce((sum, t) => sum + t.times_recommended, 0);
  const uniqueTitles = titles.length;
  
  // Score based on how evenly distributed recommendations are
  return (uniqueTitles / Math.max(totalRecs, 1)) * 100;
}
```

## Benefits of This Implementation

1. **Track what we're actually recommending**
   - See which movies/series/docs are most frequently recommended
   - Identify if we're stuck in recommendation loops

2. **Measure TMDB enrichment success**
   - Track how often TMDB finds our titles
   - Identify titles that consistently fail enrichment

3. **Correlate recommendations with feedback**
   - See which recommended titles get loved/liked/disliked
   - Track engagement rate per title

4. **Platform analysis**
   - See which streaming platforms we're recommending most
   - Identify gaps in platform coverage

5. **Diversity metrics**
   - Ensure we're not recommending the same 10 movies to everyone
   - Track recommendation variety over time

## Analytics We Can Now Generate

```json
{
  "recommendation_analytics": {
    "most_recommended": {
      "movies": [
        {"title": "The Menu", "count": 234, "loved_rate": 0.45},
        {"title": "Glass Onion", "count": 198, "loved_rate": 0.52}
      ],
      "series": [
        {"title": "The Bear", "count": 156, "loved_rate": 0.61},
        {"title": "Dahmer", "count": 143, "loved_rate": 0.38}
      ]
    },
    "tmdb_metrics": {
      "success_rate": 0.89,
      "failed_titles": ["Some Obscure Title", "Misspelled Movie Name"],
      "avg_enrichment_time": 234
    },
    "diversity_score": 67.3,
    "platform_distribution": {
      "Netflix": 0.34,
      "Amazon Prime": 0.28,
      "HBO Max": 0.18,
      "Disney+": 0.12,
      "Other": 0.08
    },
    "feedback_correlation": {
      "titles_with_feedback": 0.31,
      "loved_titles": ["Specific titles people claim to love"],
      "disliked_patterns": ["Common traits of disliked content"]
    }
  }
}
```

## Important Note
This still doesn't tell us if users ACTUALLY WATCHED the content, but at least we know:
- What we're recommending
- How diverse our recommendations are
- Which titles correlate with positive feedback
- Whether our enrichment pipeline is working