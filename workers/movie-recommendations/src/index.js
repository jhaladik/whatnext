// src/index.js - Movie Recommendations Worker with Enhanced UX
import { Router } from 'itty-router';
import { VectorSearchService } from './services/vectorSearchService.js';
import { PreferenceToVectorConverter } from './services/preferenceToVectorConverter.js';
import { MovieEnrichmentService } from './services/movieEnrichmentService.js';
import { MovieQuestionService } from './services/movieQuestionService.js';
import { DomainService } from './services/domainService.js';
import { AnalyticsService } from './services/analyticsService.js';

// New enhanced services
import { EmotionalMappingService } from './services/emotionalMappingService.js';
import { MomentCaptureService } from './services/momentCaptureService.js';
import { SurpriseEngine } from './services/surpriseEngine.js';
import { RefinementEngine } from './services/refinementEngine.js';
import { MomentValidationService } from './services/momentValidationService.js';

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

// Start movie recommendation session with enhanced moment capture
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
  
  const { 
    domain = 'movies', 
    context = {}, 
    questionFlow = 'standard' // Can be: standard, quick, deep, surprise, visual
  } = data;
  
  // Generate session ID
  const sessionId = crypto.randomUUID();
  
  // Initialize enhanced services
  const momentCapture = new MomentCaptureService(env);
  const domainService = new DomainService(env);
  
  // Generate adaptive question flow based on context
  const questionFlowData = await momentCapture.generateQuestionFlow(context, questionFlow);
  const firstQuestion = questionFlowData.questions[0];
  
  // Initialize session with enhanced context
  const userState = new UserState(sessionId);
  userState.domain = domain;
  userState.currentQuestionIndex = 0;
  userState.context = { ...context, ...questionFlowData.context };
  userState.totalQuestions = questionFlowData.questions.length;
  userState.questionFlow = questionFlow;
  userState.flowType = questionFlowData.flowType;
  
  // Store session with question flow
  await env.USER_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify({
      ...userState,
      questions: questionFlowData.questions
    }),
    { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
  );
  
  const response = Response.json({
    sessionId,
    domain,
    greeting: questionFlowData.greeting,
    question: firstQuestion,
    progress: { current: 1, total: questionFlowData.questions.length },
    flowType: questionFlowData.flowType,
    context: questionFlowData.context
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
    // Generate enhanced recommendations
    const recommendationResult = await generateMovieRecommendations(userState, env);
    
    // Update session with recommendations and profile
    userState.recommendationsGeneratedAt = Date.now();
    userState.lastRecommendations = recommendationResult.recommendations;
    userState.emotionalProfile = recommendationResult.emotionalProfile;
    userState.userProfile = {
      emotionalProfile: recommendationResult.emotionalProfile,
      answers: userState.choices
    };
    
    await env.USER_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(userState),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    const response = Response.json({
      type: 'recommendations',
      recommendations: recommendationResult.recommendations,
      moment: recommendationResult.moment,
      validation: recommendationResult.validation,
      sessionId,
      canRefine: true,
      quickAdjustments: [
        { id: 'lighter', label: 'Lighter', icon: '☀️' },
        { id: 'deeper', label: 'Deeper', icon: '🌊' },
        { id: 'weirder', label: 'Weirder', icon: '🎭' },
        { id: 'safer', label: 'Safer', icon: '🏠' }
      ]
    });
    
    return wrapResponse(request, response, env);
  }
}));

// Generate enhanced movie recommendations with emotional mapping and surprises
async function generateMovieRecommendations(userState, env) {
  const emotionalMapping = new EmotionalMappingService(env);
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  const surpriseEngine = new SurpriseEngine(env);
  const validationService = new MomentValidationService(env);
  const analyticsService = new AnalyticsService(env);
  
  try {
    // Convert answers to emotional profile first
    const answers = {};
    userState.choices.forEach(choice => {
      answers[choice.questionId] = choice.choice;
    });
    
    // Map moment to emotional vector
    const emotionalMapping = new EmotionalMappingService(env);
    const emotionalResult = await emotionalMapping.mapMomentToVector(answers, userState.context);
    
    // Get preference text instead of vector
    const preferenceText = await vectorConverter.getPreferenceText(
      answers, 
      userState.domain
    );
    
    // Apply smart filters with emotional adjustments
    const filters = {
      ...buildSmartFilters(answers, userState.context),
      ...emotionalResult.filters
    };
    
    // Search using preference text
    const vectorResults = await vectorService.searchMovies(
      preferenceText, 
      filters, 
      20 // Get top 20 for refinement
    );
    
    // Get embedding from vector service (if available)
    const searchEmbedding = vectorService.getLastQueryEmbedding();
    
    // Store session embedding for analytics if available
    if (searchEmbedding) {
      await analyticsService.storeSessionEmbedding(
        userState.sessionId,
        searchEmbedding,
        answers,
        searchEmbedding
      );
      
      // Track temporal preferences
      await analyticsService.trackTemporalPreferences(
        userState.sessionId,
        searchEmbedding,
        {
          timezone: userState.context.timezone || 'UTC',
          device: userState.deviceType,
          userAgent: userState.userAgent
        }
      );
    }
    
    // Enrich with TMDB data
    const enrichedMovies = await enrichmentService.enrichMovieResults(vectorResults);
    
    // Inject surprises based on emotional profile
    const userProfile = {
      emotionalProfile: emotionalResult.emotionalProfile,
      answers,
      confidence: emotionalResult.confidence
    };
    
    const recommendationsWithSurprises = await surpriseEngine.injectSurprise(
      enrichedMovies.slice(0, 10),
      userProfile,
      userState.context
    );
    
    // Validate moment capture
    const validation = await validationService.validateMoment(
      userState.sessionId,
      recommendationsWithSurprises,
      userProfile
    );
    
    // Generate moment summary
    const momentSummary = await validationService.generateMomentSummary(
      userState.sessionId,
      userProfile,
      recommendationsWithSurprises
    );
    
    // Track search for analytics (use embedding if available)
    if (searchEmbedding) {
      await trackVectorSearch(userState.sessionId, searchEmbedding, recommendationsWithSurprises.length, env);
    }
    
    // Track recommendation results
    await analyticsService.trackRecommendationResults(
      userState.sessionId,
      recommendationsWithSurprises
    );
    
    // Update session summary
    await analyticsService.updateSessionSummary(userState.sessionId);
    
    // Analyze question effectiveness periodically
    if (Math.random() < 0.1) { // 10% of sessions
      for (const questionId of Object.keys(answers)) {
        await analyticsService.analyzeQuestionEffectiveness(questionId, userState.domain);
      }
    }
    
    // Return enhanced recommendations with metadata
    return {
      recommendations: recommendationsWithSurprises,
      moment: momentSummary,
      validation,
      emotionalProfile: emotionalResult.emotionalProfile
    };
    
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    
    // Fallback to Claude API if available
    if (env.ENABLE_CLAUDE_FALLBACK) {
      return generateClaudeFallbackRecommendations(userState, env);
    }
    
    throw error;
  }
}

// Helper function to blend vectors
function blendVectors(vector1, vector2, weight = 0.3) {
  // If vector2 is an object with traits, convert to array
  if (typeof vector2 === 'object' && !Array.isArray(vector2)) {
    // This is a trait-based vector, apply as modifications
    return vector1; // For now, return original vector
  }
  
  // If both are arrays, blend them
  if (Array.isArray(vector1) && Array.isArray(vector2)) {
    return vector1.map((val, idx) => 
      val * (1 - weight) + (vector2[idx] || 0) * weight
    );
  }
  
  return vector1;
}

// Apply quick adjustment to recommendations
async function applyQuickAdjustment(userState, adjustment, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  const surpriseEngine = new SurpriseEngine(env);
  
  // Get original answers
  const answers = {};
  userState.choices.forEach(choice => {
    answers[choice.questionId] = choice.choice;
  });
  
  // Build adjusted preference text based on adjustment type
  let adjustedPreferenceText = await vectorConverter.getPreferenceText(
    answers,
    userState.domain
  );
  
  // Modify the preference text based on adjustment
  if (adjustment.description) {
    // Add adjustment context to the preference text
    adjustedPreferenceText += `, but ${adjustment.description.toLowerCase()}`;
  }
  
  // Apply filters
  const filters = {
    ...buildSmartFilters(answers, userState.context),
    ...adjustment.filters
  };
  
  // Search with adjusted preference text
  const vectorResults = await vectorService.searchMovies(
    adjustedPreferenceText,
    filters,
    12
  );
  
  // Enrich results
  const enrichedMovies = await enrichmentService.enrichMovieResults(vectorResults);
  
  // Add some surprises based on adjustment type
  const userProfile = {
    emotionalProfile: userState.emotionalProfile || {},
    answers,
    adjustment: adjustment.description
  };
  
  const finalRecommendations = await surpriseEngine.injectSurprise(
    enrichedMovies.slice(0, 8),
    userProfile,
    userState.context
  );
  
  return {
    recommendations: finalRecommendations,
    adjustmentApplied: adjustment.description
  };
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

// Refine recommendations with enhanced refinement engine
router.post('/api/movies/refine/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  const { feedback, action, quickAdjust } = await request.json();
  
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
  
  // Initialize refinement engine
  const refinementEngine = new RefinementEngine(env);
  refinementEngine.initSession(sessionId, userState.lastRecommendations || [], userState);
  
  // Store feedback for learning
  await storeFeedback(sessionId, feedback, env);
  
  let refinedResults;
  
  if (quickAdjust) {
    // Handle quick adjustments (lighter, deeper, weirder, safer)
    const adjustment = await refinementEngine.quickAdjust(quickAdjust);
    
    // Apply adjustment and get new recommendations
    refinedResults = await applyQuickAdjustment(userState, adjustment, env);
  } else {
    // Use full refinement engine
    const refinementResult = await refinementEngine.refineRecommendations(feedback, action);
    
    // Track embedding refinement
    const analyticsService = new AnalyticsService(env);
    const vectorConverter = new PreferenceToVectorConverter(env);
    
    const originalAnswers = {};
    userState.choices.forEach(choice => {
      originalAnswers[choice.questionId] = choice.choice;
    });
    
    const originalVector = await vectorConverter.convertToSearchVector(
      originalAnswers,
      userState.domain
    );
    
    await analyticsService.trackEmbeddingRefinement(
      sessionId,
      originalVector,
      refinementResult.adjustments,
      action
    );
    
    refinedResults = refinementResult;
  }
  
  // Validate refinement with validation service
  const validationService = new MomentValidationService(env);
  const refinementValidation = await validationService.collectImmediateFeedback(
    sessionId,
    'refinement_request',
    { action, feedback }
  );
  
  // Update session with refinement history
  userState.refinementHistory = userState.refinementHistory || [];
  userState.refinementHistory.push({
    timestamp: Date.now(),
    action,
    feedback: feedback.length
  });
  
  await env.USER_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(userState),
    { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
  );
  
  const response = Response.json({
    type: 'refined_recommendations',
    ...refinedResults,
    validation: refinementValidation
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

// Validate moment capture - get feedback on recommendations
router.post('/api/movies/validate/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  const { feedbackType, response: userResponse } = await request.json();
  
  // Validate session
  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format');
  }
  
  const validationService = new MomentValidationService(env);
  const feedback = await validationService.collectImmediateFeedback(
    sessionId,
    feedbackType,
    userResponse
  );
  
  const response = Response.json({
    success: true,
    feedback,
    message: feedback.message
  });
  
  return wrapResponse(request, response, env);
}));

// Get moment summary - visualization of captured moment
router.get('/api/movies/moment/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  
  // Get session data
  const sessionData = await env.USER_SESSIONS.get(`session:${sessionId}`);
  if (!sessionData) {
    throw new SessionExpiredError('Session not found or expired');
  }
  
  const userState = JSON.parse(sessionData);
  const validationService = new MomentValidationService(env);
  
  // Generate moment summary
  const momentSummary = await validationService.generateMomentSummary(
    sessionId,
    userState.userProfile || {},
    userState.lastRecommendations || []
  );
  
  const response = Response.json(momentSummary);
  return wrapResponse(request, response, env);
}));

// Quick mood adjustment endpoint
router.post('/api/movies/adjust/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  const { adjustmentType } = await request.json();
  // adjustmentType: 'lighter', 'deeper', 'weirder', 'safer', 'shorter', 'longer'
  
  // Validate session
  const sessionData = await env.USER_SESSIONS.get(`session:${sessionId}`);
  if (!sessionData) {
    throw new SessionExpiredError('Session not found or expired');
  }
  
  const userState = Object.assign(new UserState(sessionId), JSON.parse(sessionData));
  
  // Use refinement engine for quick adjustment
  const refinementEngine = new RefinementEngine(env);
  const adjustment = await refinementEngine.quickAdjust(adjustmentType);
  
  // Apply adjustment and get new recommendations
  const adjustedResults = await applyQuickAdjustment(userState, adjustment, env);
  
  const response = Response.json({
    type: 'adjusted_recommendations',
    adjustment: adjustmentType,
    ...adjustedResults
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