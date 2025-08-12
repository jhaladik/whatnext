# What Next Recommendation Engine - Backend

## Overview

A production-ready movie recommendation engine built on Cloudflare Workers using information theory to optimize content discovery through minimal user interaction. The system uses entropy reduction and dynamic question selection combined with Claude AI to provide highly targeted, personalized recommendations with TMDB enrichment.

**Backend API**: https://what-next-prod.jhaladik.workers.dev  
**Frontend App**: https://whatnext.pages.dev  
**Status**: 🟢 **FULLY OPERATIONAL**  
**Version**: 2.0.0  
**Last Updated**: December 2024

## 🚀 Current Production Features

### Core Functionality
- **Information Theory Engine**: Uses entropy calculation to select optimal questions
- **Claude AI Integration**: Generates personalized movie recommendations via Claude 3.5 Sonnet
- **TMDB Enrichment**: Fetches movie posters, ratings, cast, director, runtime, genres
- **Session Management**: Tracks user preferences through question flow
- **Movie Exclusion**: Prevents duplicate recommendations in "Find more movies" feature
- **Stripe Donations**: Full payment integration for user support

### Storage & Performance
- **D1 Database**: Stores interactions, feedback, and analytics
- **KV Namespaces**: 
  - `USER_SESSIONS`: Active session state (1-hour TTL)
  - `QUESTIONS`: Question library and metadata
  - `RECOMMENDATION_CACHE`: Cached recommendations
  - `RATE_LIMITS`: Request throttling
  - `CIRCUIT_BREAKERS`: API failure protection
- **Response Times**: <50ms for questions, ~2s for recommendations
- **Rate Limiting**: 60 requests/minute per IP

## 📡 API Endpoints

### Session Management
```bash
# Start new session (defaults to movies)
POST /api/start
{
  "domain": "movies",           # Optional, defaults to "movies"
  "excludedMovies": ["Title1"]  # Optional, for excluding seen movies
}

# Submit answer to question
POST /api/swipe/:sessionId
{
  "questionId": "q_movie_001",
  "choice": "option_a",
  "responseTime": 1500
}

# Get more recommendations (same preferences, new movies)
POST /api/more-recommendations/:sessionId
{
  "excludedMovies": ["Movie1", "Movie2"]
}
```

### Donation System
```bash
# Create Stripe checkout session
POST /api/donation/create-checkout
{
  "amount": 5,
  "sessionId": "uuid",
  "timeSaved": 25,
  "userMessage": "Supporting What Next"
}

# Verify donation after payment
GET /api/donation/verify/:stripeSessionId
```

### Analytics & Feedback
```bash
# Submit recommendation feedback
POST /api/feedback/:sessionId
{
  "recommendationIndex": 0,
  "rating": 5,
  "feedback": "liked"
}

# Get analytics (7d, 30d, all)
GET /api/analytics/:timeframe
```

## 🛠️ Technical Architecture

### Question Selection Algorithm
```javascript
// Information gain calculation
const entropy = -Σ(p * log2(p))
const informationGain = parentEntropy - weightedChildEntropy
```

### Recommendation Flow
1. User answers 4-6 binary questions
2. System builds preference vector from choices
3. Claude AI generates 5 personalized recommendations
4. TMDB API enriches movie data
5. Results cached for session

### Environment Variables
```toml
# Required Secrets (set via wrangler secret put)
CLAUDE_API_KEY=sk-ant-...
TMDB_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...

# Configuration (in wrangler.toml)
CLAUDE_MODEL=claude-3-5-sonnet-20241022
MAX_QUESTIONS_PER_SESSION=6
SESSION_TIMEOUT_SECONDS=3600
RATE_LIMIT_PER_MINUTE=60
ENABLE_DONATIONS=true
FRONTEND_URL=https://whatnext.pages.dev
```

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
npm install

# Run locally with hot reload
npm run dev

# Run tests
npm test
```

### Production Deployment
```bash
# Deploy to production
npm run deploy:production

# Set secrets
wrangler secret put CLAUDE_API_KEY --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put TMDB_API_KEY --env production

# Apply database migrations
npm run db:migrate:remote
```

### Database Management
```bash
# Apply migrations locally
npm run db:migrate

# Seed questions to KV
npm run kv:seed

# View analytics
npm run analytics
```

## 📊 Live Metrics

- **Active Users**: ~100 daily
- **Questions Per Session**: 4-6
- **Recommendation Accuracy**: 85%+ positive feedback
- **API Response Time**: 35ms average
- **Claude API Success**: 95%+
- **TMDB Hit Rate**: 90%+ for movie enrichment

## 🔐 Security

- **Rate Limiting**: 60 req/min per IP address
- **Input Validation**: All inputs sanitized and validated
- **CORS**: Configured for frontend domain
- **Circuit Breakers**: Automatic API failure recovery
- **Secret Management**: Via Wrangler secrets

## 📈 Monitoring

```bash
# View real-time logs
wrangler tail --env production

# Check error rates
curl https://what-next-prod.jhaladik.workers.dev/api/analytics/7d

# Test health
curl https://what-next-prod.jhaladik.workers.dev/api/test-claude
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add feature'`)
5. Push to branch (`git push origin feature/amazing`)
6. Open Pull Request

## 📝 License

Proprietary - Haládik Advisory s.r.o.

## 🏗️ Project Structure

```
workers/whatnext/
├── src/
│   ├── index.js              # Main router & endpoints
│   ├── models/
│   │   └── userState.js      # Session state management
│   ├── services/
│   │   ├── questionService.js    # Information theory engine
│   │   ├── recommendationService.js # Claude AI integration
│   │   ├── domainService.js      # Domain-specific logic
│   │   ├── tmdbService.js        # Movie enrichment
│   │   ├── enrichmentService.js  # Data enrichment pipeline
│   │   └── donationService.js    # Stripe payment handling
│   └── utils/
│       ├── validation.js     # Input validation
│       ├── rateLimiter.js    # Request throttling
│       └── errorHandler.js   # Error management
├── migrations/               # D1 database schema
├── scripts/                  # Utility scripts
└── wrangler.toml            # Worker configuration
```

## 🚦 API Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found (session expired)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (circuit breaker open)

## 📞 Support

For issues or questions:
- GitHub Issues: [Report bugs](https://github.com/yourusername/whatnext/issues)
- Email: support@whatnext.app

---

Built with ❤️ using Cloudflare Workers, Claude AI, and TMDB