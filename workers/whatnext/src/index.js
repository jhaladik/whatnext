// src/index.js - Main Cloudflare Worker
import { Router } from 'itty-router';
import { QuestionService } from './services/questionService.js';
import { PromptBuilder } from './services/promptBuilder.js';
import { RecommendationService } from './services/recommendationService.js';
import { UserState } from './models/userState.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { 
  validateStartRequest, 
  validateSwipeRequest, 
  validateFeedbackRequest,
  validateTimeframe,
  isValidUUID
} from './utils/validation.js';
import {
  AppError,
  NotFoundError,
  SessionExpiredError,
  ValidationError,
  asyncHandler,
  validateEnvironment,
  createHealthResponse
} from './utils/errorHandler.js';
import {
  corsHeaders,
  securityHeaders,
  corsMiddleware,
  applySecurityHeaders,
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

// Debug endpoint for Claude API
router.get('/api/debug', asyncHandler(async (request, env) => {
  const response = Response.json({
    claudeKeySet: !!env.CLAUDE_API_KEY,
    claudeKeyLength: env.CLAUDE_API_KEY ? env.CLAUDE_API_KEY.length : 0,
    claudeKeyPrefix: env.CLAUDE_API_KEY ? env.CLAUDE_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    claudeEndpoint: env.CLAUDE_API_ENDPOINT,
    claudeModel: env.CLAUDE_MODEL,
    envVars: Object.keys(env).filter(k => !k.includes('KEY') && !k.includes('SECRET')),
    timestamp: new Date().toISOString()
  });
  
  return wrapResponse(request, response, env);
}));

// Test Claude API directly
router.get('/api/test-claude', asyncHandler(async (request, env) => {
  try {
    const testRequest = {
      model: env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say "API working" if you receive this.'
      }]
    };
    
    const response = await fetch(env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(testRequest)
    });
    
    const responseText = await response.text();
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      response: responseText.substring(0, 500),
      success: response.ok
    };
    
    return Response.json(result);
  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}));

// Start new recommendation session
router.post('/api/start', asyncHandler(async (request, env) => {
  // Rate limiting
  const identifier = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimit = await rateLimiter.checkLimit(identifier);
  
  if (!rateLimit.allowed) {
    throw new AppError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      retryAfter: rateLimit.retryAfter
    });
  }
  
  // Parse and validate request body
  let data = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      data = await request.json();
    }
  } catch (e) {
    throw new ValidationError('Invalid JSON in request body', { error: e.message });
  }
  
  const validation = validateStartRequest(data);
  if (!validation.valid) {
    throw new ValidationError('Invalid request data', validation.errors);
  }
  
  request.mark('validation');
  
  // Create new session
  const sessionId = crypto.randomUUID();
  const userState = new UserState(sessionId);
  
  // Set context from request
  if (data.context) {
    Object.entries(data.context).forEach(([key, value]) => {
      userState.setContext(key, value);
    });
  }
  
  // Set device info
  userState.userAgent = request.headers.get('user-agent');
  userState.deviceType = detectDeviceType(userState.userAgent);
  
  // Store initial state
  await env.USER_SESSIONS.put(sessionId, JSON.stringify(userState.toJSON()), {
    expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600
  });
  
  request.mark('session_created');
  
  // Get the perfect first question
  const questionService = new QuestionService(env);
  const firstQuestion = await questionService.getPerfectQuestion();
  
  request.mark('question_selected');
  
  // Log session start
  await logInteraction(env, {
    sessionId,
    action: 'session_start',
    timestamp: Date.now(),
    userAgent: request.headers.get('user-agent'),
    ip_hash: hashIP(identifier)
  });
  
  const response = Response.json({
    sessionId,
    question: firstQuestion,
    progress: 0
  });
  
  return wrapResponse(request, response, env);
}));

// Process user swipe/choice
router.post('/api/swipe/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  
  // Validate session ID format
  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format');
  }
  
  // Rate limiting per session
  const rateLimit = await rateLimiter.checkLimit(`session:${sessionId}`);
  if (!rateLimit.allowed) {
    throw new AppError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      retryAfter: rateLimit.retryAfter
    });
  }
  
  // Parse and validate request body
  const data = await request.json();
  const validation = validateSwipeRequest(data);
  if (!validation.valid) {
    throw new ValidationError('Invalid request data', validation.errors);
  }
  
  request.mark('validation');
  
  // Get current user state
  const userStateData = await env.USER_SESSIONS.get(sessionId);
  if (!userStateData) {
    throw new NotFoundError('Session not found or expired', { sessionId });
  }
  
  const userState = UserState.fromJSON(JSON.parse(userStateData));
  
  // Update user state with choice
  userState.addChoice(data.questionId, data.choice, {
    swipeDirection: data.swipeDirection,
    responseTime: data.responseTime,
    ...data.metadata
  });
  
  request.mark('state_updated');
  
  // Get next question or final recommendations
  const questionService = new QuestionService(env);
  const nextStep = await questionService.getNextStep(userState);
  
  request.mark('next_step_determined');
  
  if (nextStep.type === 'question') {
    // More questions needed
    await env.USER_SESSIONS.put(sessionId, JSON.stringify(userState.toJSON()), {
      expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600
    });
    
    // Log the interaction
    await logInteraction(env, {
      sessionId,
      action: 'question_answered',
      question_id: data.questionId,
      choice: data.choice,
      timestamp: Date.now(),
      metadata: JSON.stringify({
        responseTime: data.responseTime,
        swipeDirection: data.swipeDirection
      })
    });
    
    const response = Response.json({
      type: 'question',
      question: nextStep.question,
      progress: userState.getProgress()
    });
    
    return wrapResponse(request, response, env);
    
  } else {
    // Ready for final recommendations
    const recommendationService = new RecommendationService(env);
    const recommendations = await recommendationService.getFinalRecommendations(userState);
    
    request.mark('recommendations_generated');
    
    // Log completion
    await logInteraction(env, {
      sessionId,
      action: 'recommendations_generated',
      timestamp: Date.now(),
      metadata: JSON.stringify({
        recommendationCount: recommendations.recommendations?.length || 0,
        source: recommendations.source || 'claude_api'
      })
    });
    
    // Clean up session after logging
    await env.USER_SESSIONS.delete(sessionId);
    
    // Add donation prompt if enabled
    if (env.ENABLE_DONATIONS) {
      recommendations.donationPrompt = generateDonationPrompt(recommendations);
    }
    
    const response = Response.json({
      type: 'recommendations',
      ...recommendations,
      progress: 100
    });
    
    return wrapResponse(request, response, env);
  }
}));

// Submit feedback
router.post('/api/feedback/:sessionId', asyncHandler(async (request, env) => {
  const { sessionId } = request.params;
  
  // Validate session ID
  if (!isValidUUID(sessionId)) {
    throw new ValidationError('Invalid session ID format');
  }
  
  // Parse and validate request body
  const data = await request.json();
  const validation = validateFeedbackRequest(data);
  if (!validation.valid) {
    throw new ValidationError('Invalid feedback data', validation.errors);
  }
  
  request.mark('validation');
  
  // Store recommendation feedback
  if (data.recommendationIndex !== undefined || data.rating) {
    await env.DB.prepare(
      `INSERT INTO recommendation_feedback 
       (session_id, recommendation_type, user_rating, was_clicked, watch_time_seconds, timestamp, feedback_text) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      data.type || 'unknown',
      data.rating || null,
      data.feedback === 'clicked',
      data.actualTimeSpent ? Math.round(data.actualTimeSpent / 1000) : null,
      Date.now(),
      data.comments || null
    ).run();
  }
  
  // Update question performance
  if (data.questionId && (data.actualInfoGain !== undefined || data.userSatisfaction !== undefined)) {
    await updateQuestionPerformance(
      env,
      data.questionId,
      data.actualInfoGain,
      data.userSatisfaction
    );
  }
  
  request.mark('feedback_stored');
  
  // Generate response with donation prompt if applicable
  const response = {
    success: true,
    message: 'Feedback recorded successfully'
  };
  
  if (env.ENABLE_DONATIONS && data.rating >= 4) {
    response.donationPrompt = {
      show: true,
      message: 'Glad you found this helpful! Consider supporting our work.',
      suggestedAmount: 2.00
    };
  }
  
  return wrapResponse(request, Response.json(response), env);
}));

// Get analytics data (authenticated endpoint)
router.get('/api/analytics/:timeframe', asyncHandler(async (request, env) => {
  // Check authorization
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${env.ANALYTICS_SECRET}`;
  
  if (!authHeader || authHeader !== expectedToken) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  
  const { timeframe } = request.params;
  
  // Validate timeframe
  const timeframeValidation = validateTimeframe(timeframe);
  if (!timeframeValidation.valid) {
    throw new ValidationError(timeframeValidation.error);
  }
  
  request.mark('validation');
  
  // Get analytics data
  const analytics = await getDetailedAnalytics(env, timeframe);
  
  request.mark('analytics_retrieved');
  
  const response = Response.json(analytics);
  return wrapResponse(request, response, env);
}));

// Helper functions
async function logInteraction(env, data) {
  try {
    await env.DB.prepare(
      `INSERT INTO interactions 
       (session_id, action, question_id, choice, timestamp, metadata, user_agent, ip_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.session_id || data.sessionId,
      data.action,
      data.question_id || null,
      data.choice || null,
      data.timestamp,
      data.metadata || null,
      data.user_agent || data.userAgent || null,
      data.ip_hash || null
    ).run();
  } catch (error) {
    console.error('Failed to log interaction:', error);
  }
}

async function updateQuestionPerformance(env, questionId, actualInfoGain, userSatisfaction) {
  try {
    // Get current performance data
    const current = await env.DB.prepare(
      'SELECT * FROM question_performance WHERE question_id = ?'
    ).bind(questionId).first();
    
    if (current) {
      // Update existing record with weighted average
      const newUsageCount = current.usage_count + 1;
      const newAvgInfoGain = actualInfoGain !== undefined
        ? ((current.avg_info_gain * current.usage_count) + actualInfoGain) / newUsageCount
        : current.avg_info_gain;
      const newAvgSatisfaction = userSatisfaction !== undefined
        ? ((current.avg_satisfaction * current.usage_count) + userSatisfaction) / newUsageCount
        : current.avg_satisfaction;
      
      await env.DB.prepare(
        `UPDATE question_performance 
         SET avg_info_gain = ?, usage_count = ?, avg_satisfaction = ?, last_updated = ? 
         WHERE question_id = ?`
      ).bind(newAvgInfoGain, newUsageCount, newAvgSatisfaction, Date.now(), questionId).run();
    } else {
      // Create new record
      await env.DB.prepare(
        `INSERT INTO question_performance 
         (question_id, avg_info_gain, usage_count, avg_satisfaction, last_updated) 
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        questionId,
        actualInfoGain || 0.5,
        1,
        userSatisfaction || 0.5,
        Date.now()
      ).run();
    }
    
    // Invalidate cache
    await env.QUESTIONS?.delete(`question_performance_${questionId}`);
    
  } catch (error) {
    console.error('Failed to update question performance:', error);
  }
}

async function getDetailedAnalytics(env, timeframe) {
  const timeMap = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  
  const since = Date.now() - (timeMap[timeframe] || timeMap['24h']);
  
  // Get session stats
  const sessionStats = await env.DB.prepare(
    `SELECT 
      COUNT(DISTINCT session_id) as total_sessions,
      COUNT(CASE WHEN action = 'session_start' THEN 1 END) as sessions_started,
      COUNT(CASE WHEN action = 'recommendations_generated' THEN 1 END) as sessions_completed,
      AVG(CASE WHEN action = 'question_answered' THEN 1 ELSE 0 END) as avg_questions_per_session
     FROM interactions 
     WHERE timestamp > ?`
  ).bind(since).first();
  
  // Get question performance
  const questionPerformance = await env.DB.prepare(
    `SELECT 
      qp.question_id,
      q.question_text,
      qp.avg_info_gain,
      qp.usage_count,
      qp.avg_satisfaction
     FROM question_performance qp
     JOIN questions q ON qp.question_id = q.id
     WHERE qp.last_updated > ?
     ORDER BY qp.avg_info_gain DESC
     LIMIT 10`
  ).bind(since).all();
  
  // Get recommendation feedback stats
  const feedbackStats = await env.DB.prepare(
    `SELECT 
      AVG(user_rating) as avg_rating,
      COUNT(*) as total_feedback,
      SUM(CASE WHEN was_clicked THEN 1 ELSE 0 END) as clicks,
      AVG(watch_time_seconds) as avg_watch_time
     FROM recommendation_feedback
     WHERE timestamp > ?`
  ).bind(since).first();
  
  return {
    timeframe,
    period: {
      start: new Date(since).toISOString(),
      end: new Date().toISOString()
    },
    stats: {
      sessions: {
        total: sessionStats?.total_sessions || 0,
        started: sessionStats?.sessions_started || 0,
        completed: sessionStats?.sessions_completed || 0,
        completionRate: sessionStats?.sessions_started > 0
          ? (sessionStats?.sessions_completed / sessionStats?.sessions_started)
          : 0,
        avgQuestionsPerSession: sessionStats?.avg_questions_per_session || 0
      },
      recommendations: {
        avgRating: feedbackStats?.avg_rating || 0,
        totalFeedback: feedbackStats?.total_feedback || 0,
        clickRate: feedbackStats?.total_feedback > 0
          ? (feedbackStats?.clicks / feedbackStats?.total_feedback)
          : 0,
        avgWatchTime: feedbackStats?.avg_watch_time || 0
      },
      topPerformingQuestions: questionPerformance?.results || []
    }
  };
}

function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function hashIP(ip) {
  if (!ip || ip === 'unknown') return null;
  
  // Simple hash function for privacy
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function generateDonationPrompt(recommendations) {
  const timeSaved = recommendations.timeSaved;
  const minutesSaved = parseInt(timeSaved?.match(/\d+/)?.[0] || 0);
  
  if (minutesSaved < 5) return null;
  
  const suggestedAmount = Math.min(10, Math.max(1, Math.round(minutesSaved / 10)));
  
  return {
    show: true,
    message: `This recommendation saved you ${timeSaved}. What's that worth to you?`,
    timeSaved: minutesSaved * 60, // in seconds
    suggestedAmount,
    options: [1, suggestedAmount, suggestedAmount * 2].filter((v, i, a) => a.indexOf(v) === i)
  };
}

// Export handler with error handling
export default {
  async fetch(request, env, ctx) {
    try {
      // Validate environment on first request
      validateEnvironment(env);
      
      // Handle request
      const response = await router.handle(request, env, ctx);
      
      if (!response) {
        throw new NotFoundError('Endpoint not found');
      }
      
      return response;
      
    } catch (error) {
      console.error('Worker error:', error);
      
      // Use error handler to create response
      const errorHandler = (err) => {
        if (err instanceof AppError) {
          return new Response(JSON.stringify(err.toJSON()), {
            status: err.statusCode,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        return new Response(JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      };
      
      return errorHandler(error);
    }
  }
};