# What Next - Implementation Plan
## Backend & Frontend Development Roadmap

**Date:** August 12, 2025  
**Status:** Backend Core Complete, Ready for Domain Extensions  
**Next Phase:** Movie-Specific Features & Frontend Development

---

## 📊 Current Status

### ✅ What's Complete (Backend)

#### Core Infrastructure
- **Cloudflare Worker API** deployed at https://what-next-prod.jhaladik.workers.dev
- **Information Theory Engine** with entropy-based question selection
- **Claude AI Integration** (Claude 3.5 Sonnet) for intelligent recommendations
- **D1 Database** with 15 questions across cognitive paths
- **5 KV Namespaces** for caching and session management
- **Circuit Breaker & Rate Limiting** for resilience
- **Fallback System** when AI unavailable

#### Current Capabilities
- Binary question flow (4-6 questions)
- Two cognitive paths (challenge vs. entertainment)
- Session management (1-hour expiry)
- Generic content recommendations
- Sub-50ms API response times

#### Test Scripts Available
- `test-full-claude.js` - Complete flow testing
- `test-both-paths.js` - Cognitive path validation  
- `debug-questions.js` - Database debugging
- `seed-production.js` - Database seeding

---

## 🎯 Next Phase: Backend Movie Upgrade

### 1. Domain System Architecture
```javascript
// New structure to support multiple content types
const DOMAINS = {
  movies: {
    id: 'movies',
    name: 'Movies & Shows',
    questionSet: 'movie_questions',
    enrichmentService: 'TMDBService',
    promptTemplate: 'movie_prompt',
    vectorSpace: 'movie_embeddings' // Future
  },
  books: {
    id: 'books', 
    name: 'Books',
    questionSet: 'book_questions',
    enrichmentService: 'GoodreadsService',
    promptTemplate: 'book_prompt',
    vectorSpace: 'book_embeddings' // Future
  },
  restaurants: {
    id: 'restaurants',
    name: 'Restaurants',
    questionSet: 'restaurant_questions',
    enrichmentService: 'YelpService',
    promptTemplate: 'restaurant_prompt',
    vectorSpace: 'restaurant_embeddings' // Future
  }
}
```

### 2. Required Backend Changes

#### A. Database Schema Updates
```sql
-- Add domain support to questions table
ALTER TABLE questions ADD COLUMN domain TEXT DEFAULT 'general';
ALTER TABLE questions ADD COLUMN vector_embedding TEXT; -- For future

-- New table for domain configuration
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question_set TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  config TEXT -- JSON configuration
);

-- Content metadata cache
CREATE TABLE content_cache (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  external_id TEXT, -- TMDB ID, ISBN, etc.
  metadata TEXT, -- JSON with enriched data
  vector_embedding TEXT, -- Future: 1536-dim vector
  created_at INTEGER,
  expires_at INTEGER
);
```

#### B. New Services to Create

##### 1. Domain Service (`src/services/domainService.js`)
```javascript
class DomainService {
  constructor(env) {
    this.env = env;
  }
  
  async selectDomain(sessionId, domain) {
    // Store domain choice in session
    // Load domain-specific questions
    // Return first domain-specific question
  }
  
  async getDomainQuestions(domain) {
    // Fetch questions for specific domain
    // Include domain-specific metadata
  }
  
  async getDomainPrompt(domain, userState) {
    // Return domain-specific Claude prompt
  }
}
```

##### 2. Content Enrichment Service (`src/services/enrichmentService.js`)
```javascript
class EnrichmentService {
  constructor(env) {
    this.tmdb = new TMDBService(env);
    this.goodreads = new GoodreadsService(env);
    // Add more as needed
  }
  
  async enrichRecommendations(domain, recommendations) {
    switch(domain) {
      case 'movies':
        return this.tmdb.enrichMovies(recommendations);
      case 'books':
        return this.goodreads.enrichBooks(recommendations);
      default:
        return recommendations;
    }
  }
}
```

##### 3. TMDB Service (`src/services/tmdbService.js`)
```javascript
class TMDBService {
  constructor(env) {
    this.apiKey = env.TMDB_API_KEY;
    this.baseUrl = 'https://api.themoviedb.org/3';
  }
  
  async enrichMovies(movies) {
    // Search for each movie
    // Add poster, trailer, streaming info
    // Cache in KV for 24 hours
    return enrichedMovies;
  }
  
  async searchMovie(title, year) {
    // Search TMDB
    // Return movie metadata
  }
  
  async getStreamingProviders(tmdbId) {
    // Get where to watch info
  }
}
```

#### C. Movie-Specific Questions
```javascript
const MOVIE_QUESTIONS = {
  'movie_mood': {
    text: 'What mood are you in?',
    options: [
      { id: 'uplifting', text: 'Feel-good vibes', emoji: '😊' },
      { id: 'intense', text: 'Edge of my seat', emoji: '😰' }
    ]
  },
  'movie_era': {
    text: 'When should it be from?',
    options: [
      { id: 'modern', text: 'Last 5 years', emoji: '🆕' },
      { id: 'classic', text: 'Timeless classics', emoji: '🎭' }
    ]
  },
  'movie_reality': {
    text: 'How grounded in reality?',
    options: [
      { id: 'realistic', text: 'Could happen IRL', emoji: '🌍' },
      { id: 'fantastical', text: 'Pure imagination', emoji: '🦄' }
    ]
  },
  'movie_commitment': {
    text: 'How much time do you have?',
    options: [
      { id: 'quick', text: 'Under 2 hours', emoji: '⚡' },
      { id: 'epic', text: "I'm invested", emoji: '🍿' }
    ]
  }
}
```

#### D. Updated API Endpoints
```javascript
// New endpoint to select domain
router.post('/api/domain', async (request, env) => {
  const { sessionId, domain } = await request.json();
  // Set domain for session
  // Return first domain-specific question
});

// Modified start endpoint
router.post('/api/start', async (request, env) => {
  const { domain = 'general' } = await request.json();
  // Start session with optional domain
});

// New enrichment endpoint (optional)
router.get('/api/enrich/:domain/:contentId', async (request, env) => {
  // Get enriched content data
  // Used by frontend for quick lookups
});
```

### 3. Vector Embedding Preparation

#### Structure for Future Migration
```javascript
// Prepare for vector storage
class VectorPrepService {
  generateQuestionVector(question) {
    // Placeholder for question embedding
    // Will use OpenAI/Cohere embeddings API later
    return new Array(1536).fill(0); // Placeholder
  }
  
  generateUserVector(userState) {
    // Create user preference vector
    // Based on choices made
    return new Array(1536).fill(0); // Placeholder
  }
  
  generateContentVector(content) {
    // Create content embedding
    // From description, genre, etc.
    return new Array(1536).fill(0); // Placeholder
  }
}
```

#### Database Ready for Vectors
- `vector_embedding` columns added to tables
- Can store JSON arrays for now
- Easy migration to Pinecone/Weaviate later

---

## 🎨 Frontend Implementation Plan

### Phase 1: Core Components (Week 1)

#### 1. Project Setup
```bash
# Create React app with Vite
npm create vite@latest what-next-frontend -- --template react
cd what-next-frontend
npm install framer-motion react-router-dom @stripe/stripe-js
```

#### 2. Essential Components
- `SwipeCard.jsx` - Core swipe interaction
- `QuestionFlow.jsx` - Manages question sequence
- `RecommendationCard.jsx` - Display results
- `DomainSelector.jsx` - Choose content type

#### 3. API Integration
```javascript
// services/apiClient.js
class WhatNextAPI {
  async startSession(domain = 'movies') {
    // Start with selected domain
  }
  
  async submitChoice(questionId, choice) {
    // Send swipe choice
  }
  
  async enrichContent(domain, contentId) {
    // Get poster, metadata
  }
}
```

### Phase 2: Polish & Features (Week 2)

#### 1. Animations
- Smooth swipe physics
- Card transitions
- Progress indicators
- Loading states

#### 2. Donation System
- Stripe Elements integration
- Payment flow
- Success celebrations

#### 3. PWA Features
- Service worker
- Offline support
- Install prompts

### Phase 3: Launch & Iterate (Week 3+)

#### 1. Analytics
- User journey tracking
- Conversion metrics
- A/B testing

#### 2. Social Features
- Share recommendations
- Save favorites
- Return user recognition

---

## 🚀 Development Sequence

### Week 1: Backend Domain Support
1. ✅ Day 1-2: Implement domain system
2. ✅ Day 3-4: Add TMDB integration
3. ✅ Day 5: Movie-specific questions
4. ✅ Weekend: Testing & debugging

### Week 2: Frontend MVP
1. ✅ Day 1-2: Core swipe interface
2. ✅ Day 3-4: API integration
3. ✅ Day 5: Results display
4. ✅ Weekend: Polish & responsive design

### Week 3: Features & Launch
1. ✅ Day 1-2: Donation system
2. ✅ Day 3: Analytics & monitoring
3. ✅ Day 4: Performance optimization
4. ✅ Day 5: Launch preparation
5. ✅ Weekend: Go live!

---

## 📦 Deployment Strategy

### Backend Updates
```bash
# Add new environment variables
npx wrangler secret put TMDB_API_KEY

# Update wrangler.toml
[vars]
ENABLE_DOMAINS = true
DEFAULT_DOMAIN = "movies"

# Deploy updates
npm run deploy:production
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist
```

---

## 🎯 Success Metrics

### Technical Goals
- ✅ Multi-domain support working
- ✅ TMDB integration < 500ms
- ✅ Vector structure ready
- ✅ Frontend < 3s load time

### User Goals (Week 1)
- 100+ sessions/day
- 60% completion rate
- 4+ star ratings
- 5% donation conversion

### Growth Goals (Month 1)
- 1000+ sessions/day
- Multiple domains active
- $500+ in donations
- Viral sharing working

---

## 🔑 Key Decisions Made

1. **Platform First**: Build for multiple content types from start
2. **Vector Ready**: Structure supports future embeddings
3. **Domain Specific**: Each content type gets custom questions
4. **Progressive Enhancement**: Start simple, add features iteratively
5. **Cache Heavy**: Use KV for speed, D1 for analytics

---

## 📝 Next Steps

1. **Backend**: Implement domain system and TMDB integration
2. **Frontend**: Start with SwipeCard component
3. **Testing**: Ensure movie flow works end-to-end
4. **Launch**: Deploy MVP and iterate based on feedback

---

This plan provides a clear path from our current generic recommendation engine to a flexible, domain-aware platform that can handle movies today and anything else tomorrow, with vector embeddings ready when needed.

**Ready to build? Start with backend domain support, then move to frontend!** 🚀