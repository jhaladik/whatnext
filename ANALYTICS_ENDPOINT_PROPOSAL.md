# Analytics Endpoint Proposal for What Next

## Endpoint Structure

### Main Analytics Endpoint
`GET /api/analytics/dashboard`

Query Parameters:
- `period`: `today`, `week`, `month`, `quarter`, `year`, `custom`
- `from`: ISO date (for custom period)
- `to`: ISO date (for custom period)
- `granularity`: `hour`, `day`, `week`, `month`
- `apiKey`: Required for authentication

### Response Structure

```json
{
  "period": {
    "from": "2025-01-01T00:00:00Z",
    "to": "2025-01-13T23:59:59Z",
    "granularity": "day"
  },
  "overview": {
    "totalSessions": 1543,
    "completedSessions": 1289,
    "completionRate": 83.5,
    "avgSessionDuration": 32.5,
    "avgQuestionsPerSession": 4.8,
    "totalRecommendations": 3867,
    "uniqueUsers": 1423
  },
  "engagement": {
    "avgTimeSaved": 22.3,
    "totalTimeSaved": 31847,
    "recommendationClickRate": 67.2,
    "userSatisfactionScore": 4.3,
    "returnUserRate": 28.5,
    "viralityScore": 1.3
  },
  "revenue": {
    "totalDonations": 458.50,
    "donationCount": 42,
    "conversionRate": 3.26,
    "avgDonationAmount": 10.92,
    "donationsByAmount": {
      "3": 8,
      "5": 15,
      "10": 12,
      "25": 4,
      "custom": 3
    },
    "projectedMonthly": 1240.00
  },
  "questions": {
    "topPerformers": [
      {
        "id": "q1",
        "text": "I want something that makes me think",
        "avgInfoGain": 0.82,
        "usageCount": 1205,
        "successRate": 89.2
      }
    ],
    "worstPerformers": [],
    "avgInfoGainOverall": 0.71,
    "questionDistribution": {
      "cognitive": 35.2,
      "format": 28.1,
      "novelty": 18.3,
      "mood": 18.4
    }
  },
  "recommendations": {
    "byType": {
      "movies": 3421,
      "books": 234,
      "restaurants": 212
    },
    "topRecommended": [
      {
        "title": "Inception",
        "count": 89,
        "avgRating": 4.5,
        "clickRate": 78.2
      }
    ],
    "genreDistribution": {
      "thriller": 28.3,
      "drama": 24.1,
      "scifi": 18.7,
      "comedy": 15.2,
      "other": 13.7
    },
    "feedbackStats": {
      "positive": 72.3,
      "neutral": 18.2,
      "negative": 9.5
    }
  },
  "userBehavior": {
    "swipePatterns": {
      "left": 48.2,
      "right": 51.8
    },
    "avgResponseTime": 2.8,
    "dropOffPoints": {
      "question1": 5.2,
      "question2": 3.1,
      "question3": 2.8,
      "question4": 2.2,
      "question5": 1.9
    },
    "peakUsageHours": [
      {"hour": 20, "sessions": 234},
      {"hour": 21, "sessions": 198},
      {"hour": 19, "sessions": 187}
    ],
    "deviceDistribution": {
      "mobile": 68.2,
      "desktop": 28.3,
      "tablet": 3.5
    }
  },
  "performance": {
    "avgApiResponseTime": 234,
    "claudeApiSuccess": 98.2,
    "tmdbApiSuccess": 99.1,
    "cacheHitRate": 42.3,
    "errorRate": 0.8,
    "avgRecommendationGenerationTime": 1.2
  },
  "trends": {
    "sessionsOverTime": [
      {"date": "2025-01-01", "count": 120},
      {"date": "2025-01-02", "count": 145}
    ],
    "donationsOverTime": [
      {"date": "2025-01-01", "amount": 35.00, "count": 3}
    ],
    "satisfactionOverTime": [
      {"date": "2025-01-01", "score": 4.2}
    ],
    "growthRate": {
      "daily": 5.2,
      "weekly": 18.3,
      "monthly": 67.2
    }
  },
  "insights": {
    "alerts": [
      {
        "type": "positive",
        "message": "Donation conversion rate up 15% this week"
      },
      {
        "type": "warning", 
        "message": "Question q7 performing below threshold (60% success rate)"
      }
    ],
    "recommendations": [
      "Consider promoting evening usage - 65% higher conversion",
      "Mobile users donate 2x more - optimize mobile experience",
      "Thriller recommendations have highest satisfaction"
    ]
  }
}
```

## Additional Specialized Endpoints

### 1. Real-time Analytics
`GET /api/analytics/realtime`
```json
{
  "activeSessions": 23,
  "sessionsLastHour": 145,
  "currentLoad": "normal",
  "liveMetrics": {
    "questionsAnsweredLastMinute": 87,
    "recommendationsGeneratedLastMinute": 12
  }
}
```

### 2. Donation Analytics
`GET /api/analytics/donations`
```json
{
  "lifetime": {
    "total": 4580.50,
    "count": 423,
    "avgAmount": 10.83
  },
  "conversionFunnel": {
    "sawPrompt": 1000,
    "clickedDonate": 150,
    "completedDonation": 42
  },
  "topDonors": [], // Anonymized
  "bestConvertingPaths": []
}
```

### 3. Question Performance
`GET /api/analytics/questions`
```json
{
  "questions": [
    {
      "id": "q1",
      "performance": {
        "infoGain": 0.82,
        "dropOffRate": 2.1,
        "avgResponseTime": 2.3,
        "satisfactionCorrelation": 0.73
      },
      "recommendations": "Keep using - high performer"
    }
  ],
  "optimalSequences": [],
  "suggestedChanges": []
}
```

### 4. Content Analytics
`GET /api/analytics/content`
```json
{
  "recommendations": {
    "totalGenerated": 3867,
    "uniqueTitles": 892,
    "repeatRate": 23.1
  },
  "popularity": [],
  "genreTrends": [],
  "seasonalPatterns": []
}
```

### 5. Export Analytics
`GET /api/analytics/export`
Query params: `format=csv|json|excel`, `period`, `metrics[]`

Returns downloadable file with selected metrics.

## Implementation Details

### Authentication
```javascript
// Simple API key authentication
const ANALYTICS_API_KEY = env.ANALYTICS_API_KEY;

if (request.headers.get('X-API-Key') !== ANALYTICS_API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Caching Strategy
- Cache analytics for 5 minutes for performance
- Real-time endpoint: No caching
- Historical data: Cache for 1 hour
- Use KV storage with key: `analytics:${period}:${from}:${to}`

### Rate Limiting
- 100 requests per minute per API key
- 1000 requests per day per API key

### Security Considerations
1. No PII exposed (emails, IPs are hashed)
2. API key required for all endpoints
3. CORS restricted to admin domains
4. Rate limiting to prevent abuse
5. Query result limits (max 10000 rows)

### Performance Optimizations
1. Pre-aggregate common metrics hourly/daily
2. Use materialized views for complex queries
3. Implement query result pagination
4. Cache expensive calculations
5. Use database indices on timestamp, session_id

## SQL Queries for Key Metrics

### Total Sessions
```sql
SELECT COUNT(DISTINCT session_id) as total_sessions
FROM interactions
WHERE timestamp BETWEEN ? AND ?
  AND action = 'session_start';
```

### Completion Rate
```sql
WITH started AS (
  SELECT DISTINCT session_id 
  FROM interactions 
  WHERE action = 'session_start'
),
completed AS (
  SELECT DISTINCT session_id 
  FROM interactions 
  WHERE action = 'recommendations_generated'
)
SELECT 
  (COUNT(completed.session_id)::float / COUNT(started.session_id)) * 100 as completion_rate
FROM started
LEFT JOIN completed USING(session_id);
```

### Donation Conversion
```sql
WITH sessions_with_recs AS (
  SELECT DISTINCT session_id
  FROM interactions
  WHERE action = 'recommendations_generated'
),
donated_sessions AS (
  SELECT DISTINCT session_id
  FROM donations
  WHERE status = 'completed'
)
SELECT 
  (COUNT(donated_sessions.session_id)::float / COUNT(sessions_with_recs.session_id)) * 100 as conversion_rate
FROM sessions_with_recs
LEFT JOIN donated_sessions USING(session_id);
```

## Next Steps

1. Implement base analytics endpoint in worker
2. Add authentication middleware
3. Create analytics dashboard UI (separate admin panel)
4. Set up monitoring and alerting
5. Implement data retention policies
6. Add webhook notifications for key events
7. Create public stats page (limited metrics)

## Estimated Implementation Time
- Backend endpoints: 4-6 hours
- Caching & optimization: 2-3 hours
- Authentication & security: 1-2 hours
- Testing: 2-3 hours
- Total: ~10-14 hours