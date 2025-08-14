// src/index.js - Movie Recommendations Worker
import { Router } from 'itty-router';
import { VectorSearchService } from './services/vectorSearchService.js';
import { PreferenceToVectorConverter } from './services/preferenceToVectorConverter.js';
import { MovieEnrichmentService } from './services/movieEnrichmentService.js';
import { MovieQuestionService } from './services/movieQuestionService.js';
import { DomainService } from './services/domainService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { UserState } from './models/userState.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { 
  validateStartRequest, 
  validateAnswerRequest,
  validateRefineRequest,
  isValidUUID
} from './utils/validation.js';
import {
  AppError,
  NotFoundError,
  SessionExpiredError,
  ValidationError,
  asyncHandler,
  createHealthResponse,
  validateEnvironment
} from './utils/errorHandler.js';
import {
  corsHeaders,
  corsMiddleware,
  createLoggingMiddleware,
  timingMiddleware,
  wrapResponse
} from './utils/middleware.js';

// Initialize router
const router = Router();

// Initialize rate limiter
let rateLimiter;

// Apply global middlewares
router.all('*', (request, env) => {
  // Initialize rate limiter with env
  if (!rateLimiter) {
    rateLimiter = new RateLimiter(env, {
      maxRequests: env.RATE_LIMIT_PER_MINUTE || 60,
      windowSize: 60000
    });
  }
  
  // Handle CORS preflight
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  // Add timing
  timingMiddleware(request);
  
  // Add logging
  const logger = createLoggingMiddleware(env);
  logger(request);
});

// Health check endpoint
router.get('/', asyncHandler(async (request, env) => {
  return createHealthResponse(env, request.url.includes('?detailed'));
}));

// Get available domains (movies, tv-series, etc.)
router.get('/api/domains', asyncHandler(async (request, env) => {
  const domainService = new DomainService(env);
  const domains = await domainService.getAvailableDomains();
  
  const response = Response.json({
    domains,
    defaultDomain: 'movies'
  });
  
  return wrapResponse(request, response, env);
}));

// Start movie recommendation session
router.post('/api/movies/start', asyncHandler(async (request, env) => {
  // Rate limiting
  const identifier = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimit = await rateLimiter.checkLimit(identifier);
  
  if (!rateLimit.allowed) {
    throw new AppError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      retryAfter: rateLimit.retryAfter
    });
  }
  
  // Parse request body
  let data = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      data = await request.json();
    }
  } catch (e) {
    throw new ValidationError('Invalid JSON in request body', { error: e.message });
  }
  
  const { domain = 'movies', context = {} } = data;
  
  // Generate session ID
  const sessionId = crypto.randomUUID();
  
  // Initialize services
  const domainService = new DomainService(env);
  const questionService = new MovieQuestionService(env);
  
  // Get first question for domain
  const questions = await questionService.getQuestions(domain);
  const firstQuestion = questions[0];
  
  // Initialize session
  const userState = new UserState(sessionId);
  userState.domain = domain;
  userState.currentQuestionIndex = 0;
  userState.context = context;
  userState.totalQuestions = questions.length;
  
  // Store session
  await env.USER_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(userState),
    { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
  );
  
  const response = Response.json({
    sessionId,
    domain,
    question: firstQuestion,
    progress: { current: 1, total: questions.length }
  });
  
  return wrapResponse(request, response, env);
}));

// Submit answer and get next question or results
router.post('/api/movies/answer/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  
  // Validate session ID
  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format');
  }
  
  // Get session
  const sessionData = await env.USER_SESSIONS.get(`session:${sessionId}`);
  if (!sessionData) {
    throw new SessionExpiredError('Session not found or expired');
  }
  
  const userState = Object.assign(new UserState(sessionId), JSON.parse(sessionData));
  
  // Parse request body
  const { questionId, answer, responseTime } = await request.json();
  
  // Validate answer request
  const validation = validateAnswerRequest({ questionId, answer });
  if (!validation.valid) {
    throw new ValidationError('Invalid request data', validation.errors);
  }
  
  // Check if this question was already answered
  const existingAnswer = userState.getChoice(questionId);
  if (!existingAnswer) {
    // Store answer only if not already answered
    userState.addChoice(questionId, answer, { responseTime });
    console.log(`Added answer for ${questionId}: ${answer}`);
  } else {
    console.log(`Question ${questionId} already answered with: ${existingAnswer}`);
  }
  
  // Get questions
  const questionService = new MovieQuestionService(env);
  const questions = await questionService.getQuestions(userState.domain);
  
  // Calculate actual progress based on answered questions
  const answeredCount = userState.choices.length;
  userState.currentQuestionIndex = answeredCount;
  
  console.log(`Session ${sessionId}: Answered ${answeredCount}/${questions.length} questions`);
  console.log(`Current choices:`, userState.choices.map(c => `${c.questionId}:${c.choice}`).join(', '));
  
  // Check if we have more questions
  if (answeredCount < questions.length) {
    // Return next question
    const nextQuestion = questions[answeredCount]; // Use answeredCount as the index for next question
    
    // Update session
    await env.USER_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(userState),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    const response = Response.json({
      question: nextQuestion,
      progress: { 
        current: answeredCount + 1, 
        total: questions.length 
      }
    });
    
    return wrapResponse(request, response, env);
  } else {
    // Generate recommendations
    const recommendations = await generateMovieRecommendations(userState, env);
    
    // Update session with recommendations generated timestamp
    userState.recommendationsGeneratedAt = Date.now();
    await env.USER_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(userState),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    const response = Response.json({
      type: 'recommendations',
      recommendations,
      sessionId,
      canRefine: true
    });
    
    return wrapResponse(request, response, env);
  }
}));

// Generate movie recommendations
async function generateMovieRecommendations(userState, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  const analyticsService = new AnalyticsService(env);
  
  try {
    // Convert answers to search vector
    const answers = {};
    userState.choices.forEach(choice => {
      answers[choice.questionId] = choice.choice;
    });
    
    const searchVector = await vectorConverter.convertToSearchVector(
      answers, 
      userState.domain
    );
    
    // Store session embedding for analytics
    await analyticsService.storeSessionEmbedding(
      userState.sessionId,
      searchVector,
      answers,
      searchVector
    );
    
    // Track temporal preferences
    await analyticsService.trackTemporalPreferences(
      userState.sessionId,
      searchVector,
      {
        timezone: userState.context.timezone || 'UTC',
        device: userState.deviceType,
        userAgent: userState.userAgent
      }
    );
    
    // Apply smart filters based on answers
    const filters = buildSmartFilters(answers, userState.context);
    
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
    await trackVectorSearch(userState.sessionId, searchVector, finalRecommendations.length, env);
    
    // Track recommendation results
    await analyticsService.trackRecommendationResults(
      userState.sessionId,
      finalRecommendations
    );
    
    // Update session summary
    await analyticsService.updateSessionSummary(userState.sessionId);
    
    // Analyze question effectiveness periodically
    if (Math.random() < 0.1) { // 10% of sessions
      for (const questionId of Object.keys(answers)) {
        await analyticsService.analyzeQuestionEffectiveness(questionId, userState.domain);
      }
    }
    
    return finalRecommendations;
    
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    
    // Fallback to Claude API if available
    if (env.ENABLE_CLAUDE_FALLBACK) {
      return generateClaudeFallbackRecommendations(userState, env);
    }
    
    throw error;
  }
}

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

// Track vector search for analytics
async function trackVectorSearch(sessionId, searchVector, resultsCount, env) {
  if (!env.ENABLE_ANALYTICS) return;
  
  try {
    const analytics = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      search_vector: JSON.stringify(searchVector.slice(0, 10)), // Just store first 10 dims for analytics
      results_count: resultsCount,
      search_time_ms: Date.now(),
      created_at: Math.floor(Date.now() / 1000)
    };
    
    // Store in D1 database
    await env.DB.prepare(`
      INSERT INTO vector_searches (id, session_id, search_vector, results_count, search_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      analytics.id,
      analytics.session_id,
      analytics.search_vector,
      analytics.results_count,
      analytics.search_time_ms,
      analytics.created_at
    ).run();
  } catch (error) {
    console.error('Failed to track vector search:', error);
    // Don't throw - analytics failure shouldn't break the flow
  }
}

// Claude fallback for recommendations
async function generateClaudeFallbackRecommendations(userState, env) {
  console.log('Using Claude fallback for recommendations');
  
  // Build prompt from user choices
  const prompt = buildClaudePrompt(userState);
  
  try {
    const response = await fetch(env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse Claude's response into recommendations
    return parseClaudeRecommendations(content);
    
  } catch (error) {
    console.error('Claude fallback failed:', error);
    throw new AppError('Failed to generate recommendations', 'RECOMMENDATION_FAILED', 500);
  }
}

// Build Claude prompt from user state
function buildClaudePrompt(userState) {
  const choices = userState.getChoices();
  let prompt = `Based on these movie preferences, recommend 8 movies:\n\n`;
  
  choices.forEach(choice => {
    prompt += `- ${choice.questionId}: ${choice.choice}\n`;
  });
  
  prompt += `\nReturn a JSON array of exactly 8 movie recommendations with this structure:
  [
    {
      "title": "Movie Title",
      "year": 2024,
      "genres": ["Genre1", "Genre2"],
      "rating": 8.5,
      "overview": "Brief description",
      "reasoning": "Why this matches the preferences"
    }
  ]`;
  
  return prompt;
}

// Parse Claude's recommendations
function parseClaudeRecommendations(content) {
  try {
    // Extract JSON from Claude's response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to parse Claude recommendations:', error);
    // Return empty array as fallback
    return [];
  }
}

// Refine recommendations based on user feedback
router.post('/api/movies/refine/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  const { feedback, action } = await request.json();
  
  // Validate request
  const validation = validateRefineRequest({ feedback, action });
  if (!validation.valid) {
    throw new ValidationError('Invalid request data', validation.errors);
  }
  
  // Get session
  const sessionData = await env.USER_SESSIONS.get(`session:${sessionId}`);
  if (!sessionData) {
    throw new SessionExpiredError('Session not found or expired');
  }
  
  const userState = Object.assign(new UserState(sessionId), JSON.parse(sessionData));
  
  // Store feedback for learning
  await storeFeedback(sessionId, feedback, env);
  
  // Get original vector for comparison
  const vectorConverter = new PreferenceToVectorConverter(env);
  const originalAnswers = {};
  userState.choices.forEach(choice => {
    originalAnswers[choice.questionId] = choice.choice;
  });
  const originalVector = await vectorConverter.convertToSearchVector(
    originalAnswers,
    userState.domain
  );
  
  // Adjust search vector based on feedback
  const adjustedVector = await adjustVectorFromFeedback(
    userState, 
    feedback, 
    action, 
    env
  );
  
  // Track embedding refinement
  const analyticsService = new AnalyticsService(env);
  await analyticsService.trackEmbeddingRefinement(
    sessionId,
    originalVector,
    adjustedVector,
    action
  );
  
  // Generate new recommendations
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  
  const newResults = await vectorService.searchMovies(adjustedVector, {}, 10);
  const refinedRecommendations = await enrichmentService.enrichMovieResults(newResults);
  
  const response = Response.json({
    type: 'refined_recommendations',
    recommendations: refinedRecommendations,
    refinementType: action
  });
  
  return wrapResponse(request, response, env);
}));

// Store user feedback
async function storeFeedback(sessionId, feedback, env) {
  if (!env.ENABLE_ANALYTICS) return;
  
  try {
    for (const item of feedback) {
      await env.DB.prepare(`
        INSERT INTO user_preferences (session_id, movie_id, interaction_type, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        sessionId,
        item.movieId,
        item.reaction,
        Math.floor(Date.now() / 1000)
      ).run();
    }
  } catch (error) {
    console.error('Failed to store feedback:', error);
    // Don't throw - feedback storage failure shouldn't break the flow
  }
}

// Adjust vector based on feedback
async function adjustVectorFromFeedback(userState, feedback, action, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  
  // Get original answers
  const answers = {};
  userState.choices.forEach(choice => {
    answers[choice.questionId] = choice.choice;
  });
  
  const originalVector = await vectorConverter.convertToSearchVector(answers, userState.domain);
  
  // Simple feedback adjustment (can be made more sophisticated)
  const adjustmentWeight = 0.3;
  const adjustedVector = [...originalVector];
  
  // This is a simplified version - real implementation would be more nuanced
  // For now, just return the original vector with minor random adjustments
  if (action === 'more_like_this') {
    // Slightly adjust vector towards liked items
    for (let i = 0; i < adjustedVector.length; i++) {
      adjustedVector[i] += (Math.random() - 0.5) * adjustmentWeight * 0.5;
    }
  } else if (action === 'try_different') {
    // More significant adjustment away from current results
    for (let i = 0; i < adjustedVector.length; i++) {
      adjustedVector[i] += (Math.random() - 0.5) * adjustmentWeight;
    }
  }
  
  return adjustedVector;
}

// Track user interaction with recommendation
router.post('/api/movies/interaction/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  const { movieId, interactionType, metadata } = await request.json();
  
  // Validate session
  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format');
  }
  
  const analyticsService = new AnalyticsService(env);
  await analyticsService.trackInteraction(sessionId, movieId, interactionType, metadata);
  
  const response = Response.json({ 
    success: true,
    message: `Interaction ${interactionType} tracked for movie ${movieId}`
  });
  return wrapResponse(request, response, env);
}));

// Get movie details
router.get('/api/movies/:movieId', asyncHandler(async (request, env) => {
  const { movieId } = request.params;
  
  const enrichmentService = new MovieEnrichmentService(env);
  const movieDetails = await enrichmentService.getMovieDetails(movieId);
  
  const response = Response.json(movieDetails);
  return wrapResponse(request, response, env);
}));

// Analytics endpoints
router.get('/api/analytics/questions', asyncHandler(async (request, env) => {
  const { getQuestionPerformance } = await import('./routes/analytics.js');
  return getQuestionPerformance(request, env);
}));

router.get('/api/analytics/sessions', asyncHandler(async (request, env) => {
  const { getSessionMetrics } = await import('./routes/analytics.js');
  return getSessionMetrics(request, env);
}));

router.get('/api/analytics/clusters', asyncHandler(async (request, env) => {
  const { getClusterAnalysis } = await import('./routes/analytics.js');
  return getClusterAnalysis(request, env);
}));

router.get('/api/analytics/temporal', asyncHandler(async (request, env) => {
  const { getTemporalPatterns } = await import('./routes/analytics.js');
  return getTemporalPatterns(request, env);
}));

router.get('/api/analytics/recommendations', asyncHandler(async (request, env) => {
  const { getRecommendationEffectiveness } = await import('./routes/analytics.js');
  return getRecommendationEffectiveness(request, env);
}));

router.get('/api/analytics/drift', asyncHandler(async (request, env) => {
  const { getEmbeddingDrift } = await import('./routes/analytics.js');
  return getEmbeddingDrift(request, env);
}));

router.get('/api/analytics/insights', asyncHandler(async (request, env) => {
  const { getInsights } = await import('./routes/analytics.js');
  return getInsights(request, env);
}));

// 404 handler
router.all('*', () => {
  return new Response('Not Found', { status: 404, headers: corsHeaders });
});

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Validate environment
      const envValidation = validateEnvironment(env);
      if (!envValidation.valid) {
        return Response.json({
          error: 'Invalid environment configuration',
          details: envValidation.errors
        }, { status: 500 });
      }
      
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Unhandled error:', error);
      
      if (error instanceof AppError) {
        return Response.json({
          error: error.message,
          code: error.code,
          details: error.details
        }, { status: error.statusCode, headers: corsHeaders });
      }
      
      return Response.json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }, { status: 500, headers: corsHeaders });
    }
  }
};