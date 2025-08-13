# Improved Analytics Endpoint Proposal for What Next

Based on the actual database schema and existing implementation.

## Current State
- Existing endpoint: `GET /api/analytics/:timeframe` (requires ANALYTICS_SECRET)
- Provides basic stats: sessions, completion rate, question performance, feedback
- Limited to 4 timeframes: 24h, 7d, 30d, 90d

## Proposed Enhanced Analytics Endpoint

### Main Dashboard Endpoint
`GET /api/analytics/dashboard`

Query Parameters:
- `timeframe`: `24h`, `7d`, `30d`, `90d`, `custom`
- `from`: ISO date (for custom period)
- `to`: ISO date (for custom period)
- `granularity`: `hour`, `day`, `week`

Authorization: Bearer token with ANALYTICS_SECRET

### Enhanced Response Structure

```json
{
  "period": {
    "timeframe": "7d",
    "start": "2025-01-06T00:00:00Z",
    "end": "2025-01-13T23:59:59Z",
    "granularity": "day"
  },
  
  "overview": {
    "totalSessions": 1543,
    "uniqueSessions": 1289,
    "completedSessions": 987,
    "completionRate": 64.0,
    "avgQuestionsPerSession": 4.8,
    "totalInteractions": 7412,
    "peakHour": "20:00",
    "peakDay": "Saturday"
  },
  
  "questions": {
    "totalAnswered": 7384,
    "uniqueQuestionsUsed": 12,
    "avgResponseTime": 2.3,
    "topPerformers": [
      {
        "id": "cognitive_engagement",
        "text": "Do you want something that challenges your mind...",
        "usageCount": 1543,
        "avgInfoGain": 0.92,
        "avgSatisfaction": 4.5,
        "successRate": 0.87
      }
    ],
    "categoryBreakdown": {
      "cognitive": 35.2,
      "format": 22.1,
      "learning": 18.7,
      "time": 12.3,
      "engagement": 11.7
    }
  },
  
  "recommendations": {
    "totalGenerated": 987,
    "totalFeedbackReceived": 423,
    "avgRating": 4.2,
    "clickThroughRate": 67.3,
    "avgWatchTime": 1840,
    "topRecommendations": [
      {
        "type": "movie",
        "source": "tmdb",
        "title": "Inception",
        "timesRecommended": 23,
        "avgRating": 4.7,
        "clickRate": 82.6
      }
    ],
    "sourceBreakdown": {
      "claude": 45.2,
      "tmdb": 54.8
    }
  },
  
  "donations": {
    "totalAmount": 458.50,
    "transactionCount": 42,
    "conversionRate": 4.26,
    "avgDonation": 10.92,
    "byAmount": {
      "3": 8,
      "5": 15,
      "10": 12,
      "25": 4,
      "custom": 3
    },
    "byStatus": {
      "completed": 42,
      "pending": 3,
      "failed": 2,
      "expired": 1
    },
    "revenueGrowth": {
      "daily": 12.3,
      "weekly": 45.2
    }
  },
  
  "userBehavior": {
    "deviceTypes": {
      "mobile": 68.2,
      "desktop": 28.3,
      "tablet": 3.5
    },
    "choicePatterns": {
      "left": 48.2,
      "right": 51.8
    },
    "dropoffAnalysis": {
      "afterQuestion1": 5.2,
      "afterQuestion2": 3.1,
      "afterQuestion3": 2.8,
      "afterQuestion4": 2.2,
      "afterQuestion5": 1.9
    },
    "sessionDuration": {
      "avg": 32.5,
      "median": 28.3,
      "p95": 45.2
    }
  },
  
  "performance": {
    "avgResponseTime": 234,
    "errorRate": 0.8,
    "cacheHitRate": 42.3,
    "kvOperations": {
      "reads": 15234,
      "writes": 7823,
      "deletes": 423
    },
    "d1Operations": {
      "queries": 8234,
      "avgLatency": 12.3
    }
  },
  
  "trends": {
    "sessionsOverTime": [
      {"date": "2025-01-06", "count": 220, "completed": 142},
      {"date": "2025-01-07", "count": 235, "completed": 151}
    ],
    "donationsOverTime": [
      {"date": "2025-01-06", "amount": 65.00, "count": 6},
      {"date": "2025-01-07", "amount": 45.00, "count": 4}
    ],
    "growthMetrics": {
      "sessionsGrowth": 15.2,
      "revenueGrowth": 22.3,
      "completionRateChange": 2.1
    }
  }
}
```

## Implementation Code

```javascript
// Enhanced analytics function
async function getEnhancedAnalytics(env, timeframe, from, to) {
  const { startTime, endTime } = parseTimeframe(timeframe, from, to);
  
  // Parallel queries for performance
  const [
    sessionStats,
    questionStats,
    donationStats,
    feedbackStats,
    deviceStats,
    trends
  ] = await Promise.all([
    getSessionStats(env.DB, startTime, endTime),
    getQuestionStats(env.DB, startTime, endTime),
    getDonationStats(env.DB, startTime, endTime),
    getFeedbackStats(env.DB, startTime, endTime),
    getDeviceStats(env.DB, startTime, endTime),
    getTrends(env.DB, startTime, endTime, timeframe)
  ]);
  
  return {
    period: {
      timeframe,
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString()
    },
    overview: sessionStats,
    questions: questionStats,
    donations: donationStats,
    recommendations: feedbackStats,
    userBehavior: deviceStats,
    trends: trends
  };
}

async function getSessionStats(db, startTime, endTime) {
  const stats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT session_id) as total_sessions,
      COUNT(CASE WHEN action = 'session_start' THEN 1 END) as sessions_started,
      COUNT(CASE WHEN action = 'recommendations_generated' THEN 1 END) as sessions_completed,
      COUNT(*) as total_interactions
    FROM interactions 
    WHERE timestamp BETWEEN ? AND ?
  `).bind(startTime, endTime).first();
  
  const questionsPerSession = await db.prepare(`
    SELECT AVG(question_count) as avg_questions
    FROM (
      SELECT session_id, COUNT(*) as question_count
      FROM interactions
      WHERE action = 'question_answered'
        AND timestamp BETWEEN ? AND ?
      GROUP BY session_id
    )
  `).bind(startTime, endTime).first();
  
  return {
    totalSessions: stats.total_sessions || 0,
    completedSessions: stats.sessions_completed || 0,
    completionRate: stats.sessions_started > 0 
      ? ((stats.sessions_completed / stats.sessions_started) * 100).toFixed(1)
      : 0,
    avgQuestionsPerSession: questionsPerSession.avg_questions || 0,
    totalInteractions: stats.total_interactions || 0
  };
}

async function getDonationStats(db, startTime, endTime) {
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount
    FROM donations
    WHERE timestamp BETWEEN ? AND ?
  `).bind(startTime, endTime).first();
  
  const byAmount = await db.prepare(`
    SELECT 
      amount,
      COUNT(*) as count
    FROM donations
    WHERE status = 'completed'
      AND timestamp BETWEEN ? AND ?
    GROUP BY amount
    ORDER BY amount
  `).bind(startTime, endTime).all();
  
  const sessionCount = await db.prepare(`
    SELECT COUNT(DISTINCT session_id) as with_recs
    FROM interactions
    WHERE action = 'recommendations_generated'
      AND timestamp BETWEEN ? AND ?
  `).bind(startTime, endTime).first();
  
  return {
    totalAmount: stats.completed_amount || 0,
    transactionCount: stats.completed_count || 0,
    conversionRate: sessionCount.with_recs > 0
      ? ((stats.completed_count / sessionCount.with_recs) * 100).toFixed(2)
      : 0,
    avgDonation: stats.avg_amount || 0,
    byAmount: byAmount.results.reduce((acc, row) => {
      acc[row.amount] = row.count;
      return acc;
    }, {})
  };
}

async function getQuestionStats(db, startTime, endTime) {
  const topQuestions = await db.prepare(`
    SELECT 
      q.id,
      q.question_text as text,
      q.category,
      qp.usage_count,
      qp.avg_info_gain,
      qp.avg_satisfaction,
      qp.success_rate
    FROM questions q
    LEFT JOIN question_performance qp ON q.id = qp.question_id
    WHERE qp.last_updated BETWEEN ? AND ?
    ORDER BY qp.usage_count DESC
    LIMIT 5
  `).bind(startTime, endTime).all();
  
  const categoryStats = await db.prepare(`
    SELECT 
      q.category,
      COUNT(i.id) as usage_count
    FROM interactions i
    JOIN questions q ON i.question_id = q.id
    WHERE i.action = 'question_answered'
      AND i.timestamp BETWEEN ? AND ?
    GROUP BY q.category
  `).bind(startTime, endTime).all();
  
  const totalCategories = categoryStats.results.reduce((sum, cat) => sum + cat.usage_count, 0);
  
  return {
    topPerformers: topQuestions.results || [],
    categoryBreakdown: categoryStats.results.reduce((acc, cat) => {
      acc[cat.category] = ((cat.usage_count / totalCategories) * 100).toFixed(1);
      return acc;
    }, {})
  };
}

async function getTrends(db, startTime, endTime, timeframe) {
  const granularity = timeframe === '24h' ? 'hour' : 'day';
  const dateFormat = granularity === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
  
  const sessionTrends = await db.prepare(`
    SELECT 
      strftime('${dateFormat}', timestamp/1000, 'unixepoch') as period,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(CASE WHEN action = 'recommendations_generated' THEN 1 END) as completed
    FROM interactions
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY period
    ORDER BY period
  `).bind(startTime, endTime).all();
  
  const donationTrends = await db.prepare(`
    SELECT 
      strftime('${dateFormat}', timestamp/1000, 'unixepoch') as period,
      COUNT(*) as count,
      SUM(amount) as amount
    FROM donations
    WHERE status = 'completed'
      AND timestamp BETWEEN ? AND ?
    GROUP BY period
    ORDER BY period
  `).bind(startTime, endTime).all();
  
  return {
    sessionsOverTime: sessionTrends.results.map(row => ({
      date: row.period,
      count: row.sessions,
      completed: row.completed
    })),
    donationsOverTime: donationTrends.results.map(row => ({
      date: row.period,
      amount: row.amount,
      count: row.count
    }))
  };
}
```

## Additional Specialized Endpoints

### 1. Real-time Stats
`GET /api/analytics/realtime`
```javascript
async function getRealtimeStats(env) {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  const active = await env.DB.prepare(`
    SELECT COUNT(DISTINCT session_id) as active
    FROM interactions
    WHERE timestamp > ?
  `).bind(fiveMinutesAgo).first();
  
  return {
    activeSessions: active.active || 0,
    timestamp: new Date().toISOString()
  };
}
```

### 2. Export Endpoint
`GET /api/analytics/export?format=csv&timeframe=30d`

### 3. Question Optimization
`GET /api/analytics/questions/optimize`
Returns suggestions for question improvements based on performance data.

## Security & Performance

1. **Authentication**: Keep existing Bearer token with ANALYTICS_SECRET
2. **Caching**: Cache results in KV for 5 minutes with key `analytics:${timeframe}:${timestamp}`
3. **Rate Limiting**: 100 requests/minute per IP
4. **Query Optimization**: Use database indexes, limit result sets
5. **Parallel Queries**: Execute independent queries concurrently

## Next Steps

1. Implement enhanced analytics endpoint (~3 hours)
2. Add caching layer (~1 hour)
3. Create export functionality (~2 hours)
4. Add real-time stats (~1 hour)
5. Testing and optimization (~2 hours)

Total: ~9 hours