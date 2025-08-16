// Pages Function: /api/movies/adjust/[sessionId]
// Quick adjustments to recommendations (lighter, deeper, weirder, safer)

import { RefinementEngine } from '../../../services/refinementEngine.js';
import { PreferenceToVectorConverter } from '../../../services/preferenceToVectorConverter.js';
import { VectorSearchService } from '../../../services/vectorSearchService.js';
import { MovieEnrichmentService } from '../../../services/movieEnrichmentService.js';
import { SurpriseEngine } from '../../../services/surpriseEngine.js';

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
    const { adjustmentType } = data;
    
    // Get session from KV
    const sessionKey = `session:${sessionId}`;
    const sessionData = await env.USER_SESSIONS.get(sessionKey);
    
    if (!sessionData) {
      // Session doesn't exist - this happens when using a stale sessionId from localStorage
      // Return an error asking to start a new session
      return new Response(JSON.stringify({
        error: 'Session expired',
        message: 'Your session has expired. Please refresh the page to start a new session.',
        code: 'SESSION_EXPIRED'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const userState = JSON.parse(sessionData);
    
    // Initialize refinement engine
    const refinementEngine = new RefinementEngine(env);
    
    // Build user profile
    const userProfile = {
      emotionalProfile: userState.emotionalProfile,
      answers: {},
      lastRecommendations: userState.lastRecommendations || []
    };
    
    // Convert choices to answers object
    if (userState.choices) {
      userState.choices.forEach(choice => {
        userProfile.answers[choice.questionId] = choice.choice;
      });
    }
    
    // Get quick adjustment parameters
    const adjustment = await refinementEngine.quickAdjust(adjustmentType);
    
    // Apply adjustment and get new recommendations
    const adjustedResults = await applyQuickAdjustment(userState, adjustment, env);
    
    // Update session
    userState.lastRecommendations = adjustedResults.recommendations;
    userState.lastAdjustment = adjustmentType;
    
    await env.USER_SESSIONS.put(
      sessionKey,
      JSON.stringify(userState),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    return new Response(JSON.stringify({
      type: 'adjusted_recommendations',
      adjustment: adjustmentType,
      ...adjustedResults
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error applying quick adjustment:', error);
    return new Response(JSON.stringify({
      error: 'Failed to adjust recommendations',
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

// Apply quick adjustment to get new recommendations
async function applyQuickAdjustment(userState, adjustment, env) {
  const vectorConverter = new PreferenceToVectorConverter(env);
  const vectorService = new VectorSearchService(env);
  const enrichmentService = new MovieEnrichmentService(env);
  const surpriseEngine = new SurpriseEngine(env);
  
  // Get original answers
  const answers = {};
  if (userState.choices && userState.choices.length > 0) {
    userState.choices.forEach(choice => {
      answers[choice.questionId] = choice.choice;
    });
  } else {
    // Use default answers if no choices exist
    answers.cognitive_load = 'easy';
    answers.emotional_tone = 'uplifting';
    answers.personal_context = 'escaping';
    answers.attention_level = 'moderate';
    answers.discovery_mode = 'familiar';
  }
  
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
    15
  );
  
  // Enrich movies
  const enrichedMovies = await enrichmentService.enrichMovieResults(vectorResults);
  
  // Build user profile for surprise injection
  const userProfile = {
    emotionalProfile: userState.emotionalProfile,
    answers,
    adjustment: adjustment.description
  };
  
  // Inject surprises based on adjustment
  const adjustedRecommendations = await surpriseEngine.injectSurprise(
    enrichedMovies.slice(0, 10),
    userProfile,
    userState.context
  );
  
  return {
    recommendations: adjustedRecommendations,
    sessionId: userState.sessionId,
    adjustment: adjustment.description
  };
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