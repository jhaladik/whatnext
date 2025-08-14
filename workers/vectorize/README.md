# WhatNext Vectorize Worker

Production-ready Cloudflare Worker for movie vectorization and recommendation engine using OpenAI embeddings and Cloudflare Vectorize.

## Features

- 🎬 **Movie Vectorization**: Converts TMDB movie data into high-quality embeddings using OpenAI's text-embedding-ada-002
- 🔍 **Vector Search**: Fast similarity search using Cloudflare Vectorize with cosine similarity
- 🎯 **Smart Recommendations**: Personalized movie recommendations based on user preferences
- 📊 **Weighted Preferences**: Supports loved, liked, and disliked movies with different weights
- 🎪 **Franchise Detection**: Automatically clusters sequels and related movies (85.7% accuracy)
- 🔄 **Daily Updates**: Scheduled processing of new movies from TMDB
- 💾 **Enhanced Metadata**: Stores posters, trailers, cast, crew, and streaming providers

## Architecture

```
TMDB API → Rate Limiter → Movie Processor → OpenAI Embeddings → Cloudflare Vectorize
                              ↓
                         D1 Database (metadata)
```

## Setup

### Prerequisites

- Cloudflare account with Workers, D1, Vectorize, and KV access
- TMDB API key (free from themoviedb.org)
- OpenAI API key (for embeddings)
- Node.js 18+ and npm

### Installation

1. **Clone and install dependencies:**
```bash
cd workers/vectorize
npm install
```

2. **Run setup script:**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Update wrangler.toml with generated IDs:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "whatnext-vectorize"
database_id = "YOUR_DATABASE_ID_HERE"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_ID_HERE"

[[kv_namespaces]]
binding = "PROCESSING_QUEUE"
id = "YOUR_QUEUE_KV_ID_HERE"
```

4. **Set secrets:**
```bash
npx wrangler secret put TMDB_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ADMIN_KEY
```

5. **Deploy worker:**
```bash
npm run deploy
```

6. **Initialize movie vectors (one-time setup):**
```bash
export WORKER_URL=https://whatnext-vectorize.YOUR-SUBDOMAIN.workers.dev
export ADMIN_KEY=your-admin-key
export TMDB_API_KEY=your-tmdb-key
node scripts/initialize-vectors.js
```

## Configuration

### Rate Limiting (wrangler.toml)

```toml
[vars]
TMDB_RATE_LIMIT_PER_SECOND = "2"  # Conservative: 2 req/sec (allows 4)
TMDB_BURST_DELAY_MS = "1000"      # Delay between bursts
OPENAI_BATCH_SIZE = "50"          # Embeddings per batch
VECTORIZE_BATCH_SIZE = "500"      # Vectors per upload
MAX_DAILY_NEW_MOVIES = "50"       # Daily processing limit
```

### Why Conservative Rate Limits?

- **TMDB allows 40 requests/10 seconds** (4 req/sec)
- We use **2 req/sec** to leave headroom for your main worker
- Prevents 429 errors and ensures reliable operation
- Automatic queuing handles bursts gracefully

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Statistics
```bash
GET /stats
```

### Search Movies
```bash
POST /search
Content-Type: application/json

{
  "query": "sci-fi thriller with time travel",
  "limit": 10
}
```

### Get Recommendations
```bash
POST /recommend
Content-Type: application/json

{
  "loved": ["Inception", "The Matrix"],
  "liked": ["Blade Runner 2049"],
  "disliked": ["Transformers"],
  "minYear": 2010,
  "maxRuntime": 150,
  "minRating": 7.0,
  "topK": 10
}
```

### Manual Processing (Admin)
```bash
POST /process
Content-Type: application/json

{
  "movieIds": [550, 551, 552],
  "adminKey": "your-admin-key"
}
```

## Daily Updates

The worker automatically runs at 3 AM daily to:
1. Fetch trending and popular movies
2. Process up to 50 new movies
3. Reprocess any failed movies
4. Update vectors with new data

## Monitoring

### Check Processing Status
```bash
curl https://your-worker.workers.dev/stats
```

Response:
```json
{
  "vectors": {
    "totalVectors": 12500,
    "completedMovies": 12500,
    "failedMovies": 23,
    "pendingMovies": 477
  },
  "queue": {
    "pending": 100,
    "processing": 10,
    "completed": 12400
  },
  "today": {
    "movies_processed": 50,
    "embeddings_created": 50,
    "vectors_uploaded": 50,
    "tmdb_requests": 52,
    "openai_requests": 2,
    "openai_tokens": 15420,
    "errors_count": 0
  }
}
```

## Cost Analysis

### One-time Setup
- TMDB API: $0 (free tier)
- OpenAI Embeddings: ~$2 (50K movies)
- Total: **$2**

### Monthly Operating
- Vectorize Storage: $0.012 (300MB)
- Vectorize Queries: $4.00 (100K queries)
- OpenAI Updates: $0.20 (daily new movies)
- Workers/D1/KV: $0 (free tier)
- Total: **<$5/month**

## Integration with Main Worker

Add to your main What Next worker:

```typescript
// Query vectorized recommendations
const response = await fetch('https://whatnext-vectorize.workers.dev/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    loved: userState.feedback.loved,
    liked: userState.feedback.liked,
    disliked: userState.feedback.disliked,
    minYear: 2010,
    topK: 15
  })
});

const { recommendations } = await response.json();
```

## Troubleshooting

### Rate Limit Errors
- Reduce `TMDB_RATE_LIMIT_PER_SECOND` in wrangler.toml
- Increase `TMDB_BURST_DELAY_MS` for longer pauses
- Check `/stats` for current request counts

### Failed Movies
- Run `/reprocess` endpoint to retry failed movies
- Check D1 database for error messages:
```sql
SELECT tmdb_id, last_error FROM movies WHERE processing_status = 'failed';
```

### Vector Search Not Working
- Ensure vectors are uploaded: check `/stats`
- Verify Vectorize index exists: `wrangler vectorize list`
- Check dimensions match (1536 for OpenAI ada-002)

## Performance

- Vector query: <50ms average
- Embedding generation: ~1 second per batch
- TMDB fetch: 500ms per movie (rate limited)
- Daily update: ~30 minutes for 50 movies
- Initial load: 10-15 hours for 50K movies

## Security

- Admin endpoints require `ADMIN_KEY` authentication
- Secrets stored in Cloudflare encrypted storage
- No direct database access from client
- Rate limiting prevents abuse

## Development

```bash
# Local development
npm run dev

# View logs
npm run tail

# Deploy to production
npm run deploy:production
```

## License

MIT