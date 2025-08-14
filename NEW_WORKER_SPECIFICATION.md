# Vectorized Movie Recommendation Worker
## Complete Technical Specification

**Worker Name**: `movie-recommendations-worker`  
**Domain**: Movies & TV Series (expandable to documentaries, kids content)  
**Architecture**: Vector-first with intelligent fallbacks  
**Database**: Direct integration with vectorized movie database (4,725 movies)

---

## 🎯 Core Objectives

1. **Reduce question count**: 5 strategic questions vs current 6-8
2. **Eliminate Claude API dependency**: Direct vector search for recommendations
3. **Maintain personalization**: Enhanced personal context questions
4. **Vector-ready**: Full preparation for embedding-based search
5. **Domain extensible**: Architecture supports TV, documentaries, kids content

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Movie Rec      │    │   Vectorize     │
│   (Frontend)    │◄──►│   Worker        │◄──►│   Worker        │
└─────────────────┘    │  (New)          │    │  (Existing)     │
                       └─────────────────┘    └─────────────────┘
                               │                       │
                               ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Cloudflare     │    │    OpenAI       │
                       │  D1 + KV        │    │  Embeddings     │
                       └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Router**: itty-router v4.0.25
- **Database**: Cloudflare D1 (SQLite) + KV Storage
- **Vector Search**: External vectorize worker integration
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Fallback**: Claude API for edge cases only

---

## 📊 What to Migrate from Existing Worker

### ✅ Keep & Adapt (30% of codebase)
```javascript
// Core infrastructure (src/index.js)
- Basic router setup with itty-router
- CORS and security headers
- Error handling patterns
- Rate limiting infrastructure

// Session management (src/models/userState.js) 
- Session UUID generation
- KV-based session storage (1-hour TTL)
- Basic user state tracking
- Session analytics

// Database structure (schema/migrations/)
- D1 database connection patterns
- Migration system
- Basic table structures (adapted for movies)

// Utilities (src/utils/)
- Input validation
- Error handling
- Cache management
- Analytics tracking
```

### 🔄 Heavily Modify (40% of codebase)
```javascript
// Question system (src/services/questionService.js)
- Reduce from 15 to 5 strategic questions
- Domain-specific question loading
- Personal context questions
- Vector-weight calculation per question

// Prompt building (src/services/promptBuilder.js) 
- Convert to preference text builder
- Domain-specific interpretation
- Vector search query construction
- Fallback Claude prompt generation

// User state model (src/models/userState.js)
- Add domain selection
- Movie-specific preference tracking
- Vector conversion methods
- Personal context storage
```

### 🆕 Build New (30% of codebase)
```javascript
// Vector services (src/services/)
- VectorSearchService: Interface to vectorize worker
- PreferenceToVectorConverter: Question answers → search vector
- MovieEnrichmentService: TMDB integration
- DomainService: Multi-domain support

// New endpoints (src/routes/)
- Domain selection API
- Vector search API
- Movie enrichment API
- Refinement feedback API

// Movie-specific features
- TMDB integration
- Streaming platform detection
- Movie metadata caching
- Personal preference learning
```

---

## 🗂️ Database Schema

### Enhanced Tables
```sql
-- Extend existing questions table
ALTER TABLE questions ADD COLUMN domain TEXT DEFAULT 'movies';
ALTER TABLE questions ADD COLUMN vector_weights TEXT; -- JSON: question answer weights
ALTER TABLE questions ADD COLUMN personal_context BOOLEAN DEFAULT FALSE;

-- New domain configuration
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question_set TEXT,
  vector_service_url TEXT,
  enrichment_config TEXT, -- JSON config for TMDB, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Movie metadata cache
CREATE TABLE movie_cache (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  poster_url TEXT,
  streaming_platforms TEXT, -- JSON array
  genres TEXT, -- JSON array
  release_year INTEGER,
  rating REAL,
  runtime INTEGER,
  vector_embedding TEXT, -- JSON array [1536 dims] - future use
  metadata TEXT, -- Full TMDB response JSON
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- User preference learning (NEW)
CREATE TABLE user_preferences (
  session_id TEXT,
  movie_id TEXT,
  interaction_type TEXT, -- 'liked', 'disliked', 'saved', 'watched'
  context TEXT, -- JSON: what led to this recommendation
  feedback_score REAL, -- 1-5 rating if provided
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, movie_id, interaction_type)
);

-- Vector search performance tracking
CREATE TABLE vector_searches (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  search_vector TEXT, -- JSON array
  results_count INTEGER,
  search_time_ms INTEGER,
  user_satisfaction REAL, -- Feedback if provided
  created_at INTEGER DEFAULT (unixepoch())
);
```

### KV Namespaces (Enhanced)
```javascript
// Reuse existing + new ones
const KV_NAMESPACES = {
  MOVIE_QUESTIONS: 'movie_questions_kv',        // 5 strategic questions
  USER_SESSIONS: 'user_sessions_kv',            // Session state (reuse)
  MOVIE_CACHE: 'movie_metadata_kv',             // TMDB data cache
  VECTOR_CACHE: 'vector_search_cache_kv',       // Search result cache
  PREFERENCE_VECTORS: 'preference_vectors_kv'    // User preference vectors
};
```

---

## 🎯 The 5 Strategic Questions

### Question Flow Design
```javascript
const MOVIE_QUESTIONS = {
  // Question 1: Cognitive Load (50/50 split)
  cognitive_load: {
    id: 'cognitive_load',
    text: 'What kind of mental engagement do you want?',
    description: 'This helps us understand if you want something challenging or relaxing',
    options: [
      { 
        id: 'challenge', 
        text: 'Mind-bending & thought-provoking', 
        emoji: '🧠',
        examples: 'Like Inception, Interstellar, Black Mirror'
      },
      { 
        id: 'easy', 
        text: 'Easy entertainment & fun', 
        emoji: '🍿',
        examples: 'Like Marvel movies, romantic comedies, action films'
      }
    ],
    vectorWeights: {
      challenge: { complexity: 0.8, intellectual: 0.9, mainstream: 0.2 },
      easy: { complexity: 0.2, intellectual: 0.1, mainstream: 0.8 }
    }
  },

  // Question 2: Emotional Tone (25/25/25/25 split)
  emotional_tone: {
    id: 'emotional_tone',
    text: 'How do you want to feel while watching?',
    description: 'The emotional journey matters as much as the story',
    options: [
      { 
        id: 'intense', 
        text: 'Gripped & on edge', 
        emoji: '😰',
        examples: 'Thrillers, psychological dramas, intense action'
      },
      { 
        id: 'uplifting', 
        text: 'Happy & inspired', 
        emoji: '😊',
        examples: 'Feel-good movies, comedies, uplifting stories'
      },
      { 
        id: 'contemplative', 
        text: 'Thoughtful & reflective', 
        emoji: '🤔',
        examples: 'Character studies, philosophical films, quiet dramas'
      },
      { 
        id: 'escapist', 
        text: 'Transported to another world', 
        emoji: '🌟',
        examples: 'Fantasy, sci-fi adventures, epic stories'
      }
    ],
    vectorWeights: {
      intense: { darkness: 0.8, suspense: 0.9, comfort: 0.1 },
      uplifting: { darkness: 0.1, humor: 0.8, comfort: 0.9 },
      contemplative: { depth: 0.9, pacing_slow: 0.7, artistic: 0.8 },
      escapist: { fantasy: 0.8, spectacle: 0.9, world_building: 0.8 }
    }
  },

  // Question 3: Personal Context (Personal & adaptive)
  personal_context: {
    id: 'personal_context',
    text: 'What resonates with where you are in life right now?',
    description: 'Movies hit differently depending on our current situation',
    options: [
      { 
        id: 'exploring', 
        text: 'Figuring things out', 
        emoji: '🧭',
        examples: 'Coming-of-age, self-discovery, finding purpose'
      },
      { 
        id: 'building', 
        text: 'Building something meaningful', 
        emoji: '🏗️',
        examples: 'Ambition, career challenges, relationships'
      },
      { 
        id: 'reflecting', 
        text: 'Looking back & understanding', 
        emoji: '🪞',
        examples: 'Life lessons, wisdom, understanding the past'
      },
      { 
        id: 'escaping', 
        text: 'Need a break from reality', 
        emoji: '🏝️',
        examples: 'Pure fantasy, adventure, total escapism'
      }
    ],
    vectorWeights: {
      exploring: { coming_of_age: 0.9, self_discovery: 0.8, youth: 0.7 },
      building: { ambition: 0.8, professional: 0.7, relationships: 0.6 },
      reflecting: { wisdom: 0.9, nostalgia: 0.7, life_lessons: 0.8 },
      escaping: { fantasy: 0.9, adventure: 0.8, spectacle: 0.7 }
    }
  },

  // Question 4: Attention Level (Energy/focus available)
  attention_level: {
    id: 'attention_level',
    text: 'How much mental energy do you have right now?',
    description: 'Some movies deserve full attention, others are perfect for relaxed viewing',
    options: [
      { 
        id: 'full_focus', 
        text: 'Ready for complete immersion', 
        emoji: '🎯',
        examples: 'Dense plots, subtitles, complex narratives'
      },
      { 
        id: 'moderate', 
        text: 'Engaged but not overthinking', 
        emoji: '👀',
        examples: 'Clear story, some complexity, easy to follow'
      },
      { 
        id: 'background', 
        text: 'Something I can partly multitask with', 
        emoji: '📱',
        examples: 'Familiar genres, predictable structure, comfort viewing'
      }
    ],
    vectorWeights: {
      full_focus: { complexity: 0.9, subtitles: 0.8, art_house: 0.7 },
      moderate: { complexity: 0.5, mainstream: 0.6, accessible: 0.8 },
      background: { complexity: 0.2, comfort: 0.9, familiar: 0.8 }
    }
  },

  // Question 5: Discovery Mode (Exploration vs safety)
  discovery_mode: {
    id: 'discovery_mode',
    text: 'Are you feeling adventurous with your choice?',
    description: 'Sometimes we want surprises, sometimes we want reliable satisfaction',
    options: [
      { 
        id: 'surprise', 
        text: 'Show me something unexpected', 
        emoji: '🎲',
        examples: 'Hidden gems, foreign films, unusual genres'
      },
      { 
        id: 'reliable', 
        text: 'Something I know I\'ll probably like', 
        emoji: '✅',
        examples: 'Popular choices, familiar genres, safe bets'
      }
    ],
    vectorWeights: {
      surprise: { popularity: 0.2, foreign: 0.7, unconventional: 0.8 },
      reliable: { popularity: 0.8, mainstream: 0.9, highly_rated: 0.8 }
    }
  }
};
```

---

## 🔧 Core Services Architecture

### 1. Vector Search Service
```javascript
// src/services/vectorSearchService.js
class VectorSearchService {
  constructor(env) {
    this.vectorizeWorkerUrl = env.VECTORIZE_WORKER_URL;
    this.fallbackEnabled = env.ENABLE_CLAUDE_FALLBACK || false;
  }

  async searchMovies(preferenceVector, filters = {}, limit = 50) {
    try {
      const searchRequest = {
        vector: preferenceVector,
        namespace: 'movies',
        filters: this.buildVectorFilters(filters),
        limit,
        includeMetadata: true
      };

      const response = await fetch(`${this.vectorizeWorkerUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });

      if (!response.ok) {
        throw new Error(`Vector search failed: ${response.status}`);
      }

      const results = await response.json();
      return this.processVectorResults(results);
      
    } catch (error) {
      console.error('Vector search error:', error);
      
      if (this.fallbackEnabled) {
        return this.fallbackToClaudeSearch(filters);
      }
      
      throw error;
    }
  }

  buildVectorFilters(userFilters) {
    const filters = {};
    
    // Convert user preferences to vector search filters
    if (userFilters.releaseYearRange) {
      filters.release_year = {
        gte: userFilters.releaseYearRange[0],
        lte: userFilters.releaseYearRange[1]
      };
    }
    
    if (userFilters.minRating) {
      filters.rating = { gte: userFilters.minRating };
    }
    
    if (userFilters.maxRuntime) {
      filters.runtime = { lte: userFilters.maxRuntime };
    }
    
    if (userFilters.excludeGenres?.length) {
      filters.genres = { not_in: userFilters.excludeGenres };
    }
    
    return filters;
  }

  processVectorResults(rawResults) {
    return rawResults.matches.map(match => ({
      movieId: match.id,
      title: match.metadata.title,
      similarity: match.score,
      year: match.metadata.release_year,
      genres: match.metadata.genres,
      rating: match.metadata.rating,
      poster: match.metadata.poster_url,
      confidence: this.calculateConfidence(match.score)
    }));
  }

  calculateConfidence(similarity) {
    // Convert similarity score to confidence percentage
    return Math.min(similarity * 100, 95);
  }
}
```

### 2. Preference to Vector Converter
```javascript
// src/services/preferenceToVectorConverter.js
class PreferenceToVectorConverter {
  constructor(env) {
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.embeddingModel = 'text-embedding-3-small';
    this.vectorCache = env.KV_PREFERENCE_VECTORS;
  }

  async convertToSearchVector(questionAnswers, domain = 'movies') {
    try {
      // Build preference description text
      const preferenceText = this.buildPreferenceText(questionAnswers, domain);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(questionAnswers, domain);
      const cachedVector = await this.vectorCache.get(cacheKey);
      
      if (cachedVector) {
        return JSON.parse(cachedVector);
      }
      
      // Generate new embedding
      const vector = await this.getOpenAIEmbedding(preferenceText);
      
      // Cache for 24 hours
      await this.vectorCache.put(cacheKey, JSON.stringify(vector), { 
        expirationTtl: 86400 
      });
      
      return vector;
      
    } catch (error) {
      console.error('Vector conversion error:', error);
      // Fallback to weighted vector combination
      return this.fallbackWeightedVector(questionAnswers);
    }
  }

  buildPreferenceText(answers, domain) {
    const domainPrefix = domain === 'movies' ? 'A movie' : 'A TV show';
    let description = `${domainPrefix} that is `;
    const traits = [];

    // Cognitive load interpretation
    if (answers.cognitive_load === 'challenge') {
      traits.push('intellectually challenging and thought-provoking');
    } else {
      traits.push('entertaining and easily accessible');
    }

    // Emotional tone interpretation
    const emotionalTraits = {
      intense: 'dark, intense, and gripping',
      uplifting: 'uplifting, feel-good, and optimistic',
      contemplative: 'thoughtful, reflective, and philosophical', 
      escapist: 'fantastical, escapist, and immersive'
    };
    traits.push(emotionalTraits[answers.emotional_tone]);

    // Personal context interpretation
    const contextTraits = {
      exploring: 'about self-discovery and finding one\'s path',
      building: 'about ambition and meaningful achievement',
      reflecting: 'wise and reflective about life experiences',
      escaping: 'escapist and removed from everyday reality'
    };
    traits.push(contextTraits[answers.personal_context]);

    // Attention level interpretation
    if (answers.attention_level === 'full_focus') {
      traits.push('complex and deserving of complete attention');
    } else if (answers.attention_level === 'moderate') {
      traits.push('engaging but not overly demanding');
    } else {
      traits.push('comfortable and easy to follow');
    }

    // Discovery mode interpretation
    if (answers.discovery_mode === 'surprise') {
      traits.push('surprising, unconventional, and unexpected');
    } else {
      traits.push('reliable, satisfying, and well-regarded');
    }

    return description + traits.join(', ');
  }

  async getOpenAIEmbedding(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  fallbackWeightedVector(answers) {
    // Simplified weighted vector for emergencies
    const baseVector = new Array(1536).fill(0);
    
    // Apply simple weights based on answers
    // This is a basic fallback - the real power is in the embeddings
    const weights = this.calculateSimpleWeights(answers);
    
    for (let i = 0; i < weights.length && i < 1536; i++) {
      baseVector[i] = weights[i % weights.length];
    }
    
    return this.normalizeVector(baseVector);
  }

  generateCacheKey(answers, domain) {
    const sortedAnswers = Object.keys(answers).sort().map(key => 
      `${key}:${answers[key]}`
    ).join('|');
    return `pref_vector:${domain}:${sortedAnswers}`;
  }
}
```

### 3. Movie Enrichment Service
```javascript
// src/services/movieEnrichmentService.js
class MovieEnrichmentService {
  constructor(env) {
    this.tmdbApiKey = env.TMDB_API_KEY;
    this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
    this.movieCache = env.KV_MOVIE_CACHE;
  }

  async enrichMovieResults(movieResults) {
    const enrichedResults = [];
    
    for (const movie of movieResults) {
      try {
        const enrichedMovie = await this.enrichSingleMovie(movie);
        if (enrichedMovie) {
          enrichedResults.push(enrichedMovie);
        }
      } catch (error) {
        console.error(`Failed to enrich movie ${movie.title}:`, error);
        // Include basic movie info even if enrichment fails
        enrichedResults.push(this.createBasicMovieInfo(movie));
      }
    }
    
    return enrichedResults;
  }

  async enrichSingleMovie(movie) {
    // Check cache first
    const cacheKey = `movie:${movie.movieId}`;
    const cachedMovie = await this.movieCache.get(cacheKey);
    
    if (cachedMovie) {
      const parsed = JSON.parse(cachedMovie);
      return this.mergeWithVectorResult(parsed, movie);
    }

    // Search TMDB for the movie
    const tmdbData = await this.searchTMDB(movie.title, movie.year);
    
    if (!tmdbData) {
      return this.createBasicMovieInfo(movie);
    }

    // Get additional details
    const [movieDetails, streamingProviders] = await Promise.all([
      this.getTMDBMovieDetails(tmdbData.id),
      this.getStreamingProviders(tmdbData.id)
    ]);

    const enrichedMovie = {
      ...movie,
      tmdbId: tmdbData.id,
      title: movieDetails.title,
      poster: `${this.imageBaseUrl}${movieDetails.poster_path}`,
      backdrop: `${this.imageBaseUrl}${movieDetails.backdrop_path}`,
      overview: movieDetails.overview,
      releaseDate: movieDetails.release_date,
      runtime: movieDetails.runtime,
      genres: movieDetails.genres.map(g => g.name),
      director: await this.getDirector(tmdbData.id),
      cast: movieDetails.credits?.cast?.slice(0, 5).map(actor => actor.name) || [],
      streamingOn: streamingProviders,
      tmdbRating: movieDetails.vote_average,
      voteCount: movieDetails.vote_count
    };

    // Cache for 24 hours
    await this.movieCache.put(cacheKey, JSON.stringify(enrichedMovie), {
      expirationTtl: 86400
    });

    return enrichedMovie;
  }

  async searchTMDB(title, year) {
    const searchUrl = `${this.tmdbBaseUrl}/search/movie`;
    const params = new URLSearchParams({
      api_key: this.tmdbApiKey,
      query: title,
      year: year || ''
    });

    const response = await fetch(`${searchUrl}?${params}`);
    const data = await response.json();
    
    return data.results?.[0] || null;
  }

  async getStreamingProviders(tmdbId) {
    try {
      const response = await fetch(
        `${this.tmdbBaseUrl}/movie/${tmdbId}/watch/providers?api_key=${this.tmdbApiKey}`
      );
      const data = await response.json();
      
      // Focus on US providers
      const usProviders = data.results?.US?.flatrate || [];
      return usProviders.map(provider => ({
        name: provider.provider_name,
        logo: `${this.imageBaseUrl}${provider.logo_path}`
      }));
    } catch (error) {
      console.error('Failed to get streaming providers:', error);
      return [];
    }
  }
}
```

### 4. Domain Service
```javascript
// src/services/domainService.js
class DomainService {
  constructor(env) {
    this.db = env.DB;
    this.questionsKV = env.KV_MOVIE_QUESTIONS;
  }

  async getDomainQuestions(domain = 'movies') {
    const cacheKey = `questions:${domain}`;
    const cached = await this.questionsKV.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database or default questions
    const questions = await this.loadQuestionsFromDB(domain);
    
    // Cache for 1 hour
    await this.questionsKV.put(cacheKey, JSON.stringify(questions), {
      expirationTtl: 3600
    });
    
    return questions;
  }

  async loadQuestionsFromDB(domain) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM questions 
        WHERE domain = ? OR domain = 'universal'
        ORDER BY order_index
      `);
      
      const results = await stmt.bind(domain).all();
      
      if (results.results?.length) {
        return results.results.map(this.formatQuestion);
      }
      
      // Fallback to hardcoded questions
      return this.getDefaultQuestions(domain);
      
    } catch (error) {
      console.error('Failed to load questions from DB:', error);
      return this.getDefaultQuestions(domain);
    }
  }

  getDefaultQuestions(domain) {
    // Return the 5 strategic questions defined above
    return Object.values(MOVIE_QUESTIONS);
  }

  async setUserDomain(sessionId, domain) {
    // Store domain choice in session
    const sessionKey = `session:${sessionId}`;
    const existingSession = await this.getSession(sessionId);
    
    const updatedSession = {
      ...existingSession,
      domain,
      domainSelectedAt: Date.now()
    };
    
    await this.storeSession(sessionId, updatedSession);
    return updatedSession;
  }
}
```

---

## 🌐 API Endpoints

### Core Movie Recommendation Flow
```javascript
// src/routes/movieRoutes.js

// 1. Start movie recommendation session
router.post('/api/movies/start', async (request, env) => {
  const { domain = 'movies', context = {} } = await request.json();
  
  const sessionId = generateUUID();
  const domainService = new DomainService(env);
  
  // Get first question for domain
  const questions = await domainService.getDomainQuestions(domain);
  const firstQuestion = questions[0];
  
  // Initialize session
  const session = {
    sessionId,
    domain,
    currentQuestionIndex: 0,
    answers: {},
    context,
    createdAt: Date.now()
  };
  
  await storeSession(sessionId, session);
  
  return jsonResponse({
    sessionId,
    domain,
    question: firstQuestion,
    progress: { current: 1, total: questions.length }
  });
});

// 2. Submit answer and get next question or results
router.post('/api/movies/answer/:sessionId', async (request, env) => {
  const { sessionId } = request.params;
  const { questionId, answer, responseTime } = await request.json();
  
  const session = await getSession(sessionId);
  if (!session) {
    return jsonResponse({ error: 'Session not found' }, { status: 404 });
  }
  
  // Store answer
  session.answers[questionId] = answer;
  session.currentQuestionIndex++;
  
  const domainService = new DomainService(env);
  const questions = await domainService.getDomainQuestions(session.domain);
  
  // Check if we have more questions
  if (session.currentQuestionIndex < questions.length) {
    // Return next question
    const nextQuestion = questions[session.currentQuestionIndex];
    
    await storeSession(sessionId, session);
    
    return jsonResponse({
      question: nextQuestion,
      progress: { 
        current: session.currentQuestionIndex + 1, 
        total: questions.length 
      }
    });
  } else {
    // Generate recommendations
    const recommendations = await generateMovieRecommendations(session, env);
    
    session.recommendationsGeneratedAt = Date.now();
    await storeSession(sessionId, session);
    
    return jsonResponse({
      type: 'recommendations',
      recommendations,
      sessionId,
      canRefine: true
    });
  }
});

// 3. Generate movie recommendations
async function generateMovieRecommendations(session, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  
  try {
    // Convert answers to search vector
    const searchVector = await vectorConverter.convertToSearchVector(
      session.answers, 
      session.domain
    );
    
    // Apply smart filters based on answers
    const filters = buildSmartFilters(session.answers, session.context);
    
    // Search vector database
    const vectorResults = await vectorService.searchMovies(
      searchVector, 
      filters, 
      20 // Get top 20 for refinement
    );
    
    // Enrich with TMDB data
    const enrichedMovies = await enrichmentService.enrichMovieResults(vectorResults);
    
    // Select final recommendations (top 8-10)
    const finalRecommendations = enrichedMovies.slice(0, 8);
    
    // Track search for analytics
    await trackVectorSearch(session.sessionId, searchVector, finalRecommendations.length, env);
    
    return finalRecommendations;
    
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    
    // Fallback to Claude API if available
    if (env.ENABLE_CLAUDE_FALLBACK) {
      return generateClaudeFallbackRecommendations(session, env);
    }
    
    throw error;
  }
}

// 4. Refine recommendations based on user feedback
router.post('/api/movies/refine/:sessionId', async (request, env) => {
  const { sessionId } = request.params;
  const { feedback, action } = await request.json();
  // feedback: array of {movieId, reaction: 'like'|'dislike'|'neutral'}
  // action: 'more_like_this' | 'try_different' | 'adjust_mood'
  
  const session = await getSession(sessionId);
  if (!session) {
    return jsonResponse({ error: 'Session not found' }, { status: 404 });
  }
  
  // Store feedback for learning
  await storeFeedback(sessionId, feedback, env);
  
  // Adjust search vector based on feedback
  const adjustedVector = await adjustVectorFromFeedback(
    session, 
    feedback, 
    action, 
    env
  );
  
  // Generate new recommendations
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  
  const newResults = await vectorService.searchMovies(adjustedVector, {}, 10);
  const refinedRecommendations = await enrichmentService.enrichMovieResults(newResults);
  
  return jsonResponse({
    type: 'refined_recommendations',
    recommendations: refinedRecommendations,
    refinementType: action
  });
});

// 5. Get movie details
router.get('/api/movies/:movieId', async (request, env) => {
  const { movieId } = request.params;
  
  const enrichmentService = new MovieEnrichmentService(env);
  const movieDetails = await enrichmentService.getMovieDetails(movieId);
  
  return jsonResponse(movieDetails);
});
```

### Utility Functions
```javascript
// Smart filtering based on question answers
function buildSmartFilters(answers, context) {
  const filters = {};
  
  // Time-based filtering
  if (answers.attention_level === 'background') {
    filters.maxRuntime = 120; // Under 2 hours for background viewing
  } else if (answers.attention_level === 'full_focus') {
    filters.minRating = 7.0; // Higher quality for focused viewing
  }
  
  // Discovery mode filtering
  if (answers.discovery_mode === 'reliable') {
    filters.minRating = 6.5;
    filters.minVoteCount = 100; // Well-established movies
  } else {
    filters.maxPopularity = 50; // Hidden gems for surprise mode
  }
  
  // Personal context filtering
  if (answers.personal_context === 'escaping') {
    filters.excludeGenres = ['documentary', 'biography']; // Pure fiction
  }
  
  // Context-based adjustments
  if (context.timeOfDay === 'late_night') {
    filters.maxRuntime = 150; // Not too long for late viewing
  }
  
  return filters;
}

// Vector adjustment based on user feedback
async function adjustVectorFromFeedback(session, feedback, action, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  const originalVector = await vectorConverter.convertToSearchVector(session.answers);
  
  // Simple feedback adjustment (can be made more sophisticated)
  const adjustmentWeight = 0.3;
  const adjustedVector = [...originalVector];
  
  // This is a simplified version - real implementation would be more nuanced
  for (const item of feedback) {
    if (item.reaction === 'like') {
      // Boost similarity to liked movies
      // (This requires getting the movie's vector and adjusting toward it)
    } else if (item.reaction === 'dislike') {
      // Reduce similarity to disliked movies
    }
  }
  
  return adjustedVector;
}
```

---

## 🔄 Migration & Deployment Strategy

### Phase 1: Infrastructure Setup (Week 1)
```bash
# 1. Create new worker
wrangler init movie-recommendations-worker

# 2. Set up environment variables
wrangler secret put OPENAI_API_KEY
wrangler secret put TMDB_API_KEY  
wrangler secret put VECTORIZE_WORKER_URL

# 3. Create new KV namespaces
wrangler kv:namespace create "MOVIE_QUESTIONS"
wrangler kv:namespace create "MOVIE_CACHE"
wrangler kv:namespace create "VECTOR_CACHE"
wrangler kv:namespace create "PREFERENCE_VECTORS"

# 4. Set up database
wrangler d1 create movie-recommendations-db
wrangler d1 migrations apply movie-recommendations-db --local
wrangler d1 migrations apply movie-recommendations-db --remote
```

### Phase 2: Core Implementation (Week 2)
1. Implement vector search service
2. Build preference to vector converter
3. Create 5 strategic questions
4. Add basic movie enrichment
5. Test end-to-end flow

### Phase 3: Enhancement (Week 3)
1. Add TMDB integration
2. Implement refinement system
3. Add caching and performance optimization
4. Create analytics and tracking

### Phase 4: Production (Week 4)
1. Load testing and optimization
2. Error handling and fallback systems
3. Monitoring and alerting
4. Gradual traffic migration

---

## 📊 Performance & Monitoring

### Key Metrics
```javascript
// Analytics to track
const ANALYTICS_EVENTS = {
  QUESTION_ANSWERED: 'question_answered',
  RECOMMENDATIONS_GENERATED: 'recommendations_generated', 
  MOVIE_CLICKED: 'movie_clicked',
  REFINEMENT_REQUESTED: 'refinement_requested',
  VECTOR_SEARCH_PERFORMED: 'vector_search_performed',
  TMDB_ENRICHMENT_FAILED: 'tmdb_enrichment_failed'
};

// Performance targets
const PERFORMANCE_TARGETS = {
  VECTOR_SEARCH_TIME: 500, // ms
  RECOMMENDATION_GENERATION_TIME: 2000, // ms
  TMDB_ENRICHMENT_TIME: 300, // ms per movie
  CACHE_HIT_RATE: 0.8, // 80%
  USER_SATISFACTION_SCORE: 4.0 // out of 5
};
```

### Monitoring Dashboard
- Vector search performance
- TMDB API success rates
- Cache hit rates
- User completion rates
- Recommendation relevance scores
- Error rates and types

---

## 🔮 Future Enhancements

### Vector Learning System
```javascript
// Future: Learn better question → vector mappings
class VectorLearningSystem {
  async learnFromFeedback(userFeedback, questionAnswers, recommendationResults) {
    // Use feedback to improve question → vector conversion
    // This could be implemented as a simple neural network
    // trained on user satisfaction data
  }
  
  async optimizeQuestionOrder(userEngagementData) {
    // Learn which question sequences work best
    // Use A/B testing data to optimize information gain
  }
}
```

### Multi-Domain Support
- TV Series (different time commitment questions)
- Documentaries (learning-focused questions)
- Kids content (age-appropriate questions)
- Books, podcasts, articles

### Advanced Personalization
- Remember user across sessions (optional)
- Learn individual preference patterns
- Seasonal/contextual recommendations
- Social recommendations (group viewing)

---

## ✅ Success Criteria

### Technical Success
- ✅ Vector search response time < 500ms
- ✅ End-to-end recommendation time < 3 seconds
- ✅ TMDB enrichment success rate > 90%
- ✅ Cache hit rate > 80%
- ✅ 99.9% uptime

### User Experience Success
- ✅ 5 questions → relevant recommendations
- ✅ <30 second total interaction time
- ✅ User satisfaction score > 4.0/5
- ✅ Session completion rate > 80%
- ✅ Refinement improves satisfaction

### Business Success
- ✅ 90% reduction in Claude API costs
- ✅ 50% faster recommendation generation
- ✅ Scalable to 10k+ sessions/day
- ✅ Ready for multi-domain expansion
- ✅ Vector infrastructure future-proof

---

**This specification provides a complete roadmap for building the vectorized movie recommendation worker while maintaining the best aspects of your existing information theory approach and preparing for an even more intelligent, embedding-based future.**