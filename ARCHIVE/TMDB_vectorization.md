# TMDB 50K Movies Vectorization Specification
## Complete Implementation Guide for Cloudflare Integration

**Version:** 1.0  
**Date:** January 2025  
**Target:** 50,000 high-quality movies vectorized for recommendation engine

---

## 1. Overview

### 1.1 Objective
Vectorize 50,000 movies from TMDB to create a comprehensive movie recommendation database using Cloudflare Vectorize, with automated updates and integration with existing "What Next" recommendation engine.

### 1.2 Architecture Components
- **TMDB API**: Source data provider
- **Cloudflare Vectorize**: Vector storage and similarity search
- **Cloudflare D1**: Metadata storage and caching
- **Cloudflare Workers**: Processing and API endpoints
- **OpenAI Embeddings API**: Vector generation (recommended for cost)

### 1.3 Success Criteria
- 50,000 movies successfully vectorized
- <100ms query response time
- Daily automated updates
- Integration with existing feedback system
- Cost under $10/month for 10K queries

---

## 2. Data Architecture

### 2.1 TMDB Data Structure
```javascript
// Essential movie data to extract
const MovieSchema = {
  id: Number,                    // TMDB movie ID
  title: String,                 // Movie title
  original_title: String,        // Original language title
  overview: String,              // Plot summary (key for embeddings)
  release_date: String,          // YYYY-MM-DD format
  genres: Array,                 // [{id: 28, name: "Action"}]
  vote_average: Number,          // 0.0-10.0 rating
  vote_count: Number,            // Number of votes
  runtime: Number,               // Minutes
  original_language: String,     // ISO 639-1 code
  production_countries: Array,   // Country information
  keywords: Array,               // [{id: 123, name: "keyword"}]
  popularity: Number,            // TMDB popularity score
  adult: Boolean,                // Adult content flag
  video: Boolean                 // Direct-to-video flag
};
```

### 2.2 Filtered Dataset Criteria
```javascript
const FilterCriteria = {
  adult: false,                  // Exclude adult content
  video: false,                  // Exclude direct-to-video
  vote_count: ">= 100",         // Minimum vote threshold
  vote_average: ">= 5.0",       // Quality threshold
  release_date: ">= 1990-01-01", // Modern movies only
  runtime: ">= 60 && <= 240",   // 1-4 hours
  original_language: ["en", "es", "fr", "de", "it", "ja", "ko"], // Major languages
  popularity: ">= 1.0"          // Minimum popularity
};
```

### 2.3 Vector Schema
```javascript
// Cloudflare Vectorize configuration
const VectorConfig = {
  dimensions: 1536,              // OpenAI ada-002 embedding size
  metric: "cosine",              // Similarity metric
  metadata_schema: {
    title: "string",
    year: "number", 
    genres: "string[]",
    rating: "number",
    runtime: "number",
    language: "string",
    popularity: "number",
    tmdb_id: "number",
    last_updated: "string"
  }
};
```

---

## 3. Implementation Pipeline

### 3.1 Phase 1: Data Collection

#### 3.1.1 TMDB Daily Export Download
```javascript
// Download movie IDs export (updated daily)
const TMDB_EXPORT_URL = "http://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz";

async function downloadMovieIds(date = new Date()) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '_');
  const url = `http://files.tmdb.org/p/exports/movie_ids_${dateStr}.json.gz`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try previous day if current day not available
      const previousDay = new Date(date);
      previousDay.setDate(date.getDate() - 1);
      return downloadMovieIds(previousDay);
    }
    
    const buffer = await response.arrayBuffer();
    const decompressed = await decompressGzip(buffer);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to download movie IDs:', error);
    throw error;
  }
}
```

#### 3.1.2 Movie Filtering
```javascript
function filterMovies(movies, targetCount = 50000) {
  return movies
    .filter(movie => 
      !movie.adult && 
      !movie.video && 
      movie.popularity >= 1.0
    )
    .sort((a, b) => b.popularity - a.popularity) // Sort by popularity
    .slice(0, targetCount * 2) // Take 2x for API failure buffer
    .slice(0, targetCount);
}
```

#### 3.1.3 TMDB API Batch Processing
```javascript
const TMDB_API_CONFIG = {
  baseUrl: "https://api.themoviedb.org/3",
  rateLimit: {
    requestsPerWindow: 40,
    windowMs: 10000, // 10 seconds
    retryAfter: 10000
  },
  timeout: 5000,
  retries: 3
};

class TMDBBatchProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestQueue = [];
    this.processing = false;
  }

  async processMovieBatch(movieIds) {
    const results = [];
    const batchSize = TMDB_API_CONFIG.rateLimit.requestsPerWindow;
    
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movieIds.length/batchSize)}`);
      
      const promises = batch.map(movieId => this.fetchMovieDetails(movieId));
      const batchResults = await Promise.allSettled(promises);
      
      // Process results and handle failures
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);
      
      results.push(...successfulResults);
      
      // Rate limiting delay
      if (i + batchSize < movieIds.length) {
        await this.delay(TMDB_API_CONFIG.rateLimit.windowMs);
      }
      
      // Save progress every 1000 movies
      if (results.length % 1000 === 0) {
        await this.saveProgress(results);
      }
    }
    
    return results;
  }

  async fetchMovieDetails(movieId) {
    const url = `${TMDB_API_CONFIG.baseUrl}/movie/${movieId}`;
    const params = new URLSearchParams({
      api_key: this.apiKey,
      append_to_response: 'keywords,credits'
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        timeout: TMDB_API_CONFIG.timeout
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          await this.delay(TMDB_API_CONFIG.rateLimit.retryAfter);
          return this.fetchMovieDetails(movieId);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return this.validateAndCleanMovieData(data);
      
    } catch (error) {
      console.error(`Failed to fetch movie ${movieId}:`, error.message);
      return null;
    }
  }

  validateAndCleanMovieData(movie) {
    // Apply filtering criteria
    if (movie.adult || movie.video) return null;
    if (movie.vote_count < 100) return null;
    if (movie.vote_average < 5.0) return null;
    if (!movie.runtime || movie.runtime < 60 || movie.runtime > 240) return null;
    
    // Clean and structure data
    return {
      id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      overview: movie.overview || '',
      release_date: movie.release_date,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      genres: movie.genres || [],
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      runtime: movie.runtime,
      original_language: movie.original_language,
      production_countries: movie.production_countries || [],
      keywords: movie.keywords?.keywords || [],
      popularity: movie.popularity,
      processed_at: new Date().toISOString()
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.2 Phase 2: Vector Generation

#### 3.2.1 Embedding Text Creation
```javascript
function createEmbeddingText(movie) {
  const year = movie.year || 'Unknown';
  const genres = movie.genres.map(g => g.name).join(', ') || 'Unknown';
  const keywords = movie.keywords.slice(0, 10).map(k => k.name).join(', ');
  const countries = movie.production_countries.map(c => c.name).join(', ');
  
  return `
Title: ${movie.title}
Year: ${year}
Genres: ${genres}
Runtime: ${movie.runtime} minutes
Rating: ${movie.vote_average}/10 (${movie.vote_count} votes)
Language: ${movie.original_language}
Countries: ${countries}
Plot: ${movie.overview}
Keywords: ${keywords}
Popularity: ${movie.popularity}
  `.trim();
}
```

#### 3.2.2 OpenAI Embeddings Integration
```javascript
const OPENAI_CONFIG = {
  apiUrl: "https://api.openai.com/v1/embeddings",
  model: "text-embedding-ada-002",
  batchSize: 100, // OpenAI recommended batch size
  rateLimit: {
    requestsPerMinute: 3000,
    tokensPerMinute: 1000000
  }
};

class EmbeddingGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestCount = 0;
    this.tokenCount = 0;
    this.windowStart = Date.now();
  }

  async generateBatchEmbeddings(movies) {
    const embeddings = [];
    const batchSize = OPENAI_CONFIG.batchSize;
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      console.log(`Generating embeddings: batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movies.length/batchSize)}`);
      
      const batchEmbeddings = await this.processBatch(batch);
      embeddings.push(...batchEmbeddings);
      
      // Rate limiting check
      await this.checkRateLimit();
    }
    
    return embeddings;
  }

  async processBatch(movieBatch) {
    const texts = movieBatch.map(movie => createEmbeddingText(movie));
    
    try {
      const response = await fetch(OPENAI_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.model,
          input: texts
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Track usage
      this.tokenCount += data.usage.total_tokens;
      this.requestCount++;
      
      // Combine embeddings with movie metadata
      return movieBatch.map((movie, index) => ({
        id: `movie_${movie.id}`,
        values: data.data[index].embedding,
        metadata: {
          tmdb_id: movie.id,
          title: movie.title,
          year: movie.year,
          genres: movie.genres.map(g => g.name),
          rating: movie.vote_average,
          runtime: movie.runtime,
          language: movie.original_language,
          popularity: movie.popularity,
          last_updated: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  async checkRateLimit() {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute
    
    if (now - this.windowStart > windowDuration) {
      // Reset counters for new window
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = now;
      return;
    }
    
    // Check if we're approaching limits
    if (this.requestCount >= OPENAI_CONFIG.rateLimit.requestsPerMinute * 0.9 ||
        this.tokenCount >= OPENAI_CONFIG.rateLimit.tokensPerMinute * 0.9) {
      
      const waitTime = windowDuration - (now - this.windowStart);
      console.log(`Rate limit approached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset counters
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = Date.now();
    }
  }
}
```

### 3.3 Phase 3: Vectorize Upload

#### 3.3.1 Cloudflare Vectorize Configuration
```javascript
// wrangler.toml configuration
const VECTORIZE_CONFIG = {
  name: "movie-recommendations",
  dimensions: 1536,
  metric: "cosine",
  metadata_config: {
    indexed: ["year", "rating", "language", "popularity"],
    filterable: ["genres", "year", "rating", "language"]
  }
};
```

#### 3.3.2 Batch Upload Implementation
```javascript
class VectorizeUploader {
  constructor(env) {
    this.vectorize = env.MOVIE_VECTORIZE;
    this.batchSize = 1000; // Vectorize batch limit
  }

  async uploadEmbeddings(embeddings) {
    const totalBatches = Math.ceil(embeddings.length / this.batchSize);
    let uploaded = 0;
    
    for (let i = 0; i < embeddings.length; i += this.batchSize) {
      const batch = embeddings.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      
      console.log(`Uploading batch ${batchNum}/${totalBatches} (${batch.length} vectors)`);
      
      try {
        await this.vectorize.upsert(batch);
        uploaded += batch.length;
        
        console.log(`Successfully uploaded ${uploaded}/${embeddings.length} vectors`);
        
        // Small delay between batches to avoid overwhelming the service
        if (i + this.batchSize < embeddings.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to upload batch ${batchNum}:`, error);
        
        // Retry with smaller batch size
        if (batch.length > 100) {
          console.log('Retrying with smaller batch size');
          await this.uploadSmallerBatches(batch);
          uploaded += batch.length;
        } else {
          throw error;
        }
      }
    }
    
    return uploaded;
  }

  async uploadSmallerBatches(failedBatch) {
    const smallerBatchSize = 100;
    
    for (let i = 0; i < failedBatch.length; i += smallerBatchSize) {
      const smallBatch = failedBatch.slice(i, i + smallerBatchSize);
      await this.vectorize.upsert(smallBatch);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

---

## 4. Integration with Existing System

### 4.1 Modified Recommendation Service
```javascript
// Enhanced recommendation service using vectors
class VectorizedRecommendationService {
  constructor(env) {
    this.env = env;
    this.vectorize = env.MOVIE_VECTORIZE;
    this.claudeService = new ClaudeService(env);
  }

  async getFinalRecommendations(userState) {
    try {
      // 1. Build user preference vector from feedback
      const userVector = await this.buildUserPreferenceVector(userState);
      
      // 2. Query Vectorize for similar movies
      const candidates = await this.getVectorCandidates(userVector, userState);
      
      // 3. Use Claude for final selection and reasoning
      const recommendations = await this.claudeSelectFromCandidates(candidates, userState);
      
      return {
        recommendations,
        source: 'vectorized',
        candidates_considered: candidates.length,
        user_vector_confidence: userVector.confidence
      };
      
    } catch (error) {
      console.error('Vectorized recommendation failed:', error);
      // Fallback to original Claude-only method
      return await this.getFallbackRecommendations(userState);
    }
  }

  async buildUserPreferenceVector(userState) {
    const feedback = userState.feedback || {};
    const vectors = [];
    const weights = [];
    
    // Process loved movies (positive weight)
    for (const title of feedback.loved || []) {
      const movieVector = await this.findMovieVector(title);
      if (movieVector) {
        vectors.push(movieVector.values);
        weights.push(1.0);
      }
    }
    
    // Process liked movies (moderate positive weight)
    for (const title of feedback.liked || []) {
      const movieVector = await this.findMovieVector(title);
      if (movieVector) {
        vectors.push(movieVector.values);
        weights.push(0.6);
      }
    }
    
    // Process disliked movies (negative weight)
    for (const title of feedback.disliked || []) {
      const movieVector = await this.findMovieVector(title);
      if (movieVector) {
        vectors.push(movieVector.values);
        weights.push(-0.8);
      }
    }
    
    if (vectors.length === 0) {
      // No feedback available, use genre preferences from questions
      return this.buildGenreBasedVector(userState);
    }
    
    // Compute weighted average vector
    return this.computeWeightedAverage(vectors, weights);
  }

  async findMovieVector(title) {
    try {
      const results = await this.vectorize.query({
        vector: await this.generateTitleEmbedding(title),
        topK: 1,
        returnMetadata: true
      });
      
      return results.matches[0] || null;
    } catch (error) {
      console.error(`Failed to find vector for "${title}":`, error);
      return null;
    }
  }

  async getVectorCandidates(userVector, userState) {
    const constraints = this.buildConstraints(userState);
    
    const results = await this.vectorize.query({
      vector: userVector.values,
      topK: 15, // Get more candidates for Claude to choose from
      returnMetadata: true,
      filter: constraints
    });
    
    return results.matches.map(match => ({
      title: match.metadata.title,
      year: match.metadata.year,
      genres: match.metadata.genres,
      rating: match.metadata.rating,
      runtime: match.metadata.runtime,
      similarity: match.score,
      tmdb_id: match.metadata.tmdb_id
    }));
  }

  buildConstraints(userState) {
    const choices = userState.getChoices();
    const constraints = {};
    
    // Apply question-based constraints
    choices.forEach(choice => {
      switch (choice.questionId) {
        case 'movie_era_modern':
          if (choice.choice === 'recent') {
            constraints.year = { $gte: 2020 };
          }
          break;
        case 'movie_commitment_light':
          if (choice.choice === 'quick') {
            constraints.runtime = { $lte: 120 };
          }
          break;
        // Add more constraint mappings
      }
    });
    
    return constraints;
  }

  async claudeSelectFromCandidates(candidates, userState) {
    const prompt = `
Based on user preferences and movie history, select exactly 3 movies from these candidates:

USER FEEDBACK:
${this.formatUserFeedback(userState.feedback)}

USER QUESTION RESPONSES:
${this.formatUserChoices(userState.getChoices())}

CANDIDATE MOVIES (sorted by similarity):
${candidates.map((movie, i) => 
  `${i+1}. ${movie.title} (${movie.year})
     Genres: ${movie.genres.join(', ')}
     Rating: ${movie.rating}/10
     Runtime: ${movie.runtime} min
     Similarity: ${movie.similarity.toFixed(3)}`
).join('\n')}

Select 3 movies that best match the user's preferences. Provide reasoning for each choice.

Response format:
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2023,
      "reason": "Explanation of why this matches user preferences",
      "tmdb_id": 12345
    }
  ],
  "reasoning": "Overall strategy for these selections"
}
`;

    const response = await this.claudeService.complete(prompt);
    return JSON.parse(response);
  }
}
```

### 4.2 Daily Update Worker
```javascript
// Scheduled worker for daily movie updates
export default {
  async scheduled(controller, env, ctx) {
    if (controller.cron === '0 2 * * *') { // Daily at 2 AM
      ctx.waitUntil(performDailyMovieUpdate(env));
    }
  }
};

async function performDailyMovieUpdate(env) {
  try {
    console.log('Starting daily movie update');
    
    // 1. Download latest movie IDs
    const newMovieIds = await downloadMovieIds();
    
    // 2. Check which movies are new
    const existingMovies = await getExistingMovieIds(env);
    const newMovies = newMovieIds.filter(movie => 
      !existingMovies.includes(movie.id) && 
      movie.popularity >= 5.0 // Only add popular new movies
    );
    
    if (newMovies.length === 0) {
      console.log('No new movies to add');
      return;
    }
    
    console.log(`Found ${newMovies.length} new movies to process`);
    
    // 3. Process new movies (limit to 100 per day to control costs)
    const moviesProcessed = Math.min(newMovies.length, 100);
    const processor = new TMDBBatchProcessor(env.TMDB_API_KEY);
    const movieDetails = await processor.processMovieBatch(
      newMovies.slice(0, moviesProcessed).map(m => m.id)
    );
    
    // 4. Generate embeddings
    const embedder = new EmbeddingGenerator(env.OPENAI_API_KEY);
    const embeddings = await embedder.generateBatchEmbeddings(movieDetails);
    
    // 5. Upload to Vectorize
    const uploader = new VectorizeUploader(env);
    const uploaded = await uploader.uploadEmbeddings(embeddings);
    
    console.log(`Daily update complete: ${uploaded} new movies added`);
    
    // 6. Log metrics
    await logUpdateMetrics(env, {
      date: new Date().toISOString(),
      movies_found: newMovies.length,
      movies_processed: movieDetails.length,
      vectors_uploaded: uploaded,
      processing_duration: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Daily movie update failed:', error);
    await logError(env, error);
  }
}
```

---

## 5. Cost Analysis

### 5.1 One-time Setup Costs
```javascript
const SetupCosts = {
  tmdb_api: 0,                    // Free tier sufficient
  openai_embeddings: 2.00,        // 50K movies × $0.10/1M tokens
  cloudflare_workers: 0,          // Free tier sufficient
  development_time: "40-60 hours", // Implementation time
  total_monetary: "$2.00"
};
```

### 5.2 Monthly Operating Costs
```javascript
const MonthlyCosts = {
  vectorize_storage: 0.012,       // 300MB × $0.04/GB
  vectorize_queries: 4.00,        // 100K queries × $0.04/1M
  tmdb_api: 0,                    // Stay within free limits
  openai_daily_updates: 0.20,     // ~100 new movies/day
  cloudflare_workers: 0,          // Free tier sufficient
  total: "$4.23/month"
};
```

### 5.3 Query Performance Targets
```javascript
const PerformanceTargets = {
  vector_query_time: "< 50ms",
  claude_selection_time: "< 500ms", 
  total_recommendation_time: "< 1000ms",
  cache_hit_rate: "> 80%",
  vector_accuracy: "> 85%",
  user_satisfaction: "> 4.2/5"
};
```

---

## 6. Deployment Instructions

### 6.1 Environment Setup
```bash
# 1. Create Vectorize index
wrangler vectorize create movie-recommendations --dimensions=1536 --metric=cosine

# 2. Update wrangler.toml
[[vectorize]]
binding = "MOVIE_VECTORIZE"
index_name = "movie-recommendations"

# 3. Set environment variables
wrangler secret put TMDB_API_KEY
wrangler secret put OPENAI_API_KEY

# 4. Deploy worker
wrangler publish
```

### 6.2 Initial Data Load
```bash
# Run the initial vectorization process
node scripts/vectorize-movies.js --count=50000 --env=production
```

### 6.3 Monitoring Setup
```javascript
// Add to worker for monitoring
const Metrics = {
  vector_query_count: 0,
  vector_query_time: [],
  recommendation_success_rate: 0,
  cache_hit_rate: 0,
  daily_update_status: 'success'
};

// Report metrics to Cloudflare Analytics
await env.ANALYTICS.writeDataPoint({
  blobs: [`vector_query_${Date.now()}`],
  doubles: [queryTime, similarityScore],
  indexes: [`user_${sessionId}`]
});
```

---

## 7. Testing & Validation

### 7.1 Data Quality Tests
```javascript
// Validate movie data quality
const QualityTests = {
  embedding_dimensions: embeddings => embeddings.every(e => e.values.length === 1536),
  metadata_completeness: movies => movies.every(m => m.title && m.year && m.genres.length > 0),
  similarity_accuracy: async () => {
    // Test that "Knives Out" and "Glass Onion" have high similarity
    const knivesOut = await findMovieVector("Knives Out");
    const glassOnion = await findMovieVector("Glass Onion");
    const similarity = cosineSimilarity(knivesOut.values, glassOnion.values);
    return similarity > 0.8;
  }
};
```

### 7.2 Performance Tests
```javascript
// Load testing for vector queries
async function performanceTest() {
  const testQueries = 1000;
  const startTime = Date.now();
  
  const promises = Array(testQueries).fill().map(async () => {
    const randomVector = generateRandomVector(1536);
    return await env.MOVIE_VECTORIZE.query({
      vector: randomVector,
      topK: 10
    });
  });
  
  await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / testQueries;
  
  console.log(`Average query time: ${avgTime}ms`);
  return avgTime < 100; // Should be under 100ms
}
```

---

## 8. Maintenance & Monitoring

### 8.1 Health Checks
```javascript
// Daily health check worker
async function healthCheck(env) {
  const checks = {
    vectorize_responsive: await testVectorizeQuery(env),
    tmdb_api_accessible: await testTMDBAPI(env),
    embedding_service_available: await testOpenAIEmbeddings(env),
    data_freshness: await checkDataFreshness(env)
  };
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  if (!allHealthy) {
    await sendAlert(env, checks);
  }
  
  return checks;
}
```

### 8.2 Data Cleanup
```javascript
// Monthly cleanup of old/unused vectors
async function monthlyCleanup(env) {
  // Remove movies with very low popularity that nobody queries
  const unusedMovies = await findUnusedMovies(env);
  
  if (unusedMovies.length > 1000) {
    console.log(`Removing ${unusedMovies.length} unused movies`);
    await env.MOVIE_VECTORIZE.deleteByIds(unusedMovies.map(m => m.id));
  }
  
  // Update popularity scores based on query frequency
  await updatePopularityScores(env);
}
```

---

## 9. Success Metrics & KPIs

### 9.1 Technical Metrics
- **Vector Database Size**: 50,000 movies maintained
- **Query Performance**: <100ms average response time
- **Data Freshness**: <24 hours for new releases
- **Uptime**: >99.9% availability
- **Error Rate**: <0.1% failed requests

### 9.2 Business Metrics
- **Recommendation Accuracy**: >85% user satisfaction
- **Discovery Rate**: 60% recommendations are movies user hasn't seen
- **Engagement**: 40% click-through rate on recommendations
- **Retention**: 25% users return for more recommendations

### 9.3 Cost Efficiency
- **Total Monthly Cost**: <$10 for 10K queries
- **Cost per Recommendation**: <$0.001
- **ROI**: Positive user feedback and engagement

---

This specification provides a complete blueprint for implementing 50K movie vectorization with Cloudflare infrastructure, ensuring scalable, cost-effective, and high-performance movie recommendations.