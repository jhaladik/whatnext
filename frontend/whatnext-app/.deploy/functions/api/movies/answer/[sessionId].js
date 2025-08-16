// Pages Function: /api/movies/answer/[sessionId]
// Submit an answer and get next question or recommendations

import { EmotionalMappingService } from '../../../services/emotionalMappingService.js';
import { PreferenceToVectorConverter } from '../../../services/preferenceToVectorConverter.js';
import { VectorSearchService } from '../../../services/vectorSearchService.js';
import { MovieEnrichmentService } from '../../../services/movieEnrichmentService.js';
import { SurpriseEngine } from '../../../services/surpriseEngine.js';
import { MomentValidationService } from '../../../services/momentValidationService.js';
import { AnalyticsService } from '../../../services/analyticsService.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const sessionId = params.sessionId;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Parse request body
    const data = await request.json();
    const { questionId, answer, responseTime } = data;
    
    // Get session from KV
    const sessionKey = `session:${sessionId}`;
    const sessionData = await env.USER_SESSIONS.get(sessionKey);
    
    if (!sessionData) {
      return new Response(JSON.stringify({
        error: 'Session not found or expired'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const userState = JSON.parse(sessionData);
    const { questions } = userState;
    
    // Add answer to choices
    if (!userState.choices) {
      userState.choices = [];
    }
    
    userState.choices.push({
      questionId,
      choice: answer,
      responseTime: responseTime || 0,
      timestamp: Date.now()
    });
    
    const answeredCount = userState.choices.length;
    userState.currentQuestionIndex = answeredCount;
    
    console.log(`Session ${sessionId}: Answered ${answeredCount}/${questions.length} questions`);
    
    // Check if we have more questions
    if (answeredCount < questions.length) {
      // Return next question
      const nextQuestion = questions[answeredCount];
      
      // Update session
      await env.USER_SESSIONS.put(
        sessionKey,
        JSON.stringify(userState),
        { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
      );
      
      return new Response(JSON.stringify({
        question: nextQuestion,
        progress: { 
          current: answeredCount + 1, 
          total: questions.length 
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      // Generate recommendations
      const recommendationResult = await generateMovieRecommendations(userState, env);
      
      // Update session with recommendations
      userState.recommendationsGeneratedAt = Date.now();
      userState.lastRecommendations = recommendationResult.recommendations;
      userState.emotionalProfile = recommendationResult.emotionalProfile;
      
      await env.USER_SESSIONS.put(
        sessionKey,
        JSON.stringify(userState),
        { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
      );
      
      return new Response(JSON.stringify({
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
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error('Error processing answer:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process answer',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Generate movie recommendations
async function generateMovieRecommendations(userState, env) {
  const emotionalMapping = new EmotionalMappingService(env);
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  const surpriseEngine = new SurpriseEngine(env);
  const validationService = new MomentValidationService(env);
  
  try {
    // Convert answers to object
    const answers = {};
    userState.choices.forEach(choice => {
      answers[choice.questionId] = choice.choice;
    });
    
    // Map moment to emotional vector
    const emotionalResult = await emotionalMapping.mapMomentToVector(answers, userState.context);
    
    // Get preference text
    const preferenceText = await vectorConverter.getPreferenceText(
      answers, 
      userState.domain
    );
    
    // Build filters
    const filters = buildSmartFilters(answers, userState.context);
    
    // Search movies
    const vectorResults = await vectorService.searchMovies(
      preferenceText, 
      filters, 
      20
    );
    
    // Enrich with TMDB data
    const enrichedMovies = await enrichmentService.enrichMovieResults(vectorResults);
    
    // Inject surprises
    const userProfile = {
      emotionalProfile: emotionalResult.emotionalProfile,
      answers,
      confidence: emotionalResult.confidence
    };
    
    // Temporarily disable surprise injection to avoid placeholder movies
    // const recommendationsWithSurprises = await surpriseEngine.injectSurprise(
    //   enrichedMovies.slice(0, 10),
    //   userProfile,
    //   userState.context
    // );
    const recommendationsWithSurprises = enrichedMovies.slice(0, 10);
    
    // Validate moment
    const validation = await validationService.validateMoment(
      userState.sessionId,
      recommendationsWithSurprises,
      userProfile
    );
    
    return {
      recommendations: recommendationsWithSurprises,
      moment: emotionalResult.moment,
      validation,
      emotionalProfile: emotionalResult.emotionalProfile
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    // Return fallback recommendations
    return {
      recommendations: [],
      moment: {
        description: 'Unable to capture your moment',
        emoji: '🎬',
        confidence: 0
      },
      validation: null,
      emotionalProfile: null
    };
  }
}

// Build smart filters from answers
function buildSmartFilters(answers, context) {
  const filters = {};
  
  // Decade filter
  if (answers.era) {
    const eraMap = {
      'classic': { minYear: 1940, maxYear: 1979 },
      '80s-90s': { minYear: 1980, maxYear: 1999 },
      '2000s': { minYear: 2000, maxYear: 2010 },
      'recent': { minYear: 2011, maxYear: 2024 }
    };
    const era = eraMap[answers.era];
    if (era) {
      filters.minYear = era.minYear;
      filters.maxYear = era.maxYear;
    }
  }
  
  // Genre filter
  if (answers.genre) {
    filters.genre = answers.genre;
  }
  
  // Rating filter
  if (answers.rating) {
    const ratingMap = {
      'highly-rated': 7.5,
      'decent': 6.0,
      'any': 0
    };
    filters.minRating = ratingMap[answers.rating] || 0;
  }
  
  return filters;
}