# Movie Recommendations Worker

A vector-first movie recommendation engine built on Cloudflare Workers that uses 5 strategic questions to generate personalized movie recommendations.

## Features

- **5 Strategic Questions**: Reduces question count from 6-8 to just 5 highly targeted questions
- **Vector Search**: Direct integration with vectorized movie database (4,725+ movies)
- **TMDB Enrichment**: Rich movie metadata including posters, cast, streaming platforms
- **Smart Fallbacks**: Claude API fallback for edge cases
- **Multi-Domain Support**: Extensible to TV series, documentaries, kids content
- **Caching**: Intelligent caching at multiple levels for performance

## Architecture

```
Frontend → Movie Rec Worker → Vectorize Worker → Vector DB
                ↓                    ↓
             TMDB API         OpenAI Embeddings
                ↓
          Claude API (fallback)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Create KV namespaces:
```bash
wrangler kv:namespace create "MOVIE_QUESTIONS"
wrangler kv:namespace create "USER_SESSIONS"
wrangler kv:namespace create "MOVIE_CACHE"
wrangler kv:namespace create "VECTOR_CACHE"
wrangler kv:namespace create "PREFERENCE_VECTORS"
```

Create D1 database:
```bash
wrangler d1 create movie-recommendations-db
```

Set secrets:
```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put TMDB_API_KEY
wrangler secret put CLAUDE_API_KEY  # Optional fallback
```

### 3. Run Migrations
```bash
npm run db:migrate        # Local
npm run db:migrate:remote  # Production
```

### 4. Development
```bash
npm run dev
```

### 5. Deploy
```bash
npm run deploy:production
```

## API Endpoints

### Start Session
```http
POST /api/movies/start
Content-Type: application/json

{
  "domain": "movies",
  "context": {
    "timeOfDay": "evening",
    "device": "tv"
  }
}
```

### Answer Question
```http
POST /api/movies/answer/:sessionId
Content-Type: application/json

{
  "questionId": "cognitive_load",
  "answer": "challenge",
  "responseTime": 2500
}
```

### Refine Recommendations
```http
POST /api/movies/refine/:sessionId
Content-Type: application/json

{
  "feedback": [
    {"movieId": "movie123", "reaction": "like"},
    {"movieId": "movie456", "reaction": "dislike"}
  ],
  "action": "more_like_this"
}
```

### Get Movie Details
```http
GET /api/movies/:movieId
```

## The 5 Strategic Questions

### 1. Cognitive Load (50/50 split)
**"What kind of mental engagement do you want?"**
- Mind-bending & thought-provoking 🧠
- Easy entertainment & fun 🍿

### 2. Emotional Tone (25/25/25/25 split)
**"How do you want to feel while watching?"**
- Gripped & on edge 😰
- Happy & inspired 😊
- Thoughtful & reflective 🤔
- Transported to another world 🌟

### 3. Personal Context
**"What resonates with where you are in life right now?"**
- Figuring things out 🧭
- Building something meaningful 🏗️
- Looking back & understanding 🪞
- Need a break from reality 🏝️

### 4. Attention Level
**"How much mental energy do you have right now?"**
- Ready for complete immersion 🎯
- Engaged but not overthinking 👀
- Something I can partly multitask with 📱

### 5. Discovery Mode
**"Are you feeling adventurous with your choice?"**
- Show me something unexpected 🎲
- Something I know I'll probably like ✅

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VECTORIZE_WORKER_URL` | URL to vectorize worker | Required |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Optional |
| `TMDB_API_KEY` | TMDB API key for enrichment | Recommended |
| `CLAUDE_API_KEY` | Claude API key for fallback | Optional |
| `MAX_QUESTIONS_PER_SESSION` | Max questions per session | 5 |
| `SESSION_TIMEOUT_SECONDS` | Session timeout in seconds | 3600 |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per IP | 60 |
| `ENABLE_CLAUDE_FALLBACK` | Enable Claude fallback | false |

## Performance Targets

- Vector search response: < 500ms
- End-to-end recommendation: < 3 seconds
- TMDB enrichment: < 300ms per movie
- Cache hit rate: > 80%
- Session completion: > 80%

## Development

### Project Structure
```
movie-recommendations/
├── src/
│   ├── index.js                 # Main worker entry
│   ├── services/
│   │   ├── vectorSearchService.js
│   │   ├── preferenceToVectorConverter.js
│   │   ├── movieEnrichmentService.js
│   │   ├── movieQuestionService.js
│   │   └── domainService.js
│   ├── models/
│   │   └── userState.js
│   └── utils/
│       ├── validation.js
│       ├── errorHandler.js
│       ├── middleware.js
│       └── rateLimiter.js
├── migrations/
│   ├── 0001_initial_setup.sql
│   └── 0002_insert_movie_questions.sql
├── scripts/
│   └── test-api-flow.js
└── wrangler.toml
```

### Testing
```bash
npm test                  # Run tests
npm run test:vector      # Test vector search
npm run test:enrich      # Test TMDB enrichment
```

## Monitoring

Track these key metrics:
- Vector search performance
- TMDB API success rates
- Cache hit rates
- User completion rates
- Recommendation relevance scores

## Future Enhancements

- [ ] TV Series support with episode tracking
- [ ] Documentary categorization
- [ ] Kids content with age ratings
- [ ] User preference learning
- [ ] Social recommendations
- [ ] Seasonal/contextual adjustments

## Troubleshooting

### No Recommendations Generated
1. Check vector worker is running
2. Verify OpenAI API key is set
3. Check Claude fallback is enabled

### Slow Performance
1. Check cache configuration
2. Verify KV namespaces are working
3. Monitor TMDB API response times

### Missing Enrichment Data
1. Verify TMDB API key
2. Check rate limits
3. Review cache expiration

## License

MIT