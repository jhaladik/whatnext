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
    
    // Initialize choices if needed
    if (!userState.choices) {
      userState.choices = [];
    }
    
    // Check if this question was already answered
    const existingAnswerIndex = userState.choices.findIndex(
      choice => choice.questionId === questionId
    );
    
    if (existingAnswerIndex >= 0) {
      // Update existing answer instead of adding duplicate
      userState.choices[existingAnswerIndex] = {
        questionId,
        choice: answer,
        responseTime: responseTime || 0,
        timestamp: Date.now()
      };
      console.log(`Session ${sessionId}: Updated answer for question ${questionId}`);
    } else {
      // Add new answer
      userState.choices.push({
        questionId,
        choice: answer,
        responseTime: responseTime || 0,
        timestamp: Date.now()
      });
      console.log(`Session ${sessionId}: Added answer for question ${questionId}`);
    }
    
    // Count unique answered questions
    const answeredQuestionIds = new Set(userState.choices.map(c => c.questionId));
    const answeredCount = answeredQuestionIds.size;
    
    // Find next unanswered question
    let nextQuestionIndex = -1;
    for (let i = 0; i < questions.length; i++) {
      if (!answeredQuestionIds.has(questions[i].id)) {
        nextQuestionIndex = i;
        break;
      }
    }
    
    userState.currentQuestionIndex = answeredCount;
    
    console.log(`Session ${sessionId}: Answered ${answeredCount}/${questions.length} questions`);
    
    // Check if we have more questions
    if (nextQuestionIndex >= 0) {
      // Return next unanswered question
      const nextQuestion = questions[nextQuestionIndex];
      
      // Update session
      await env.USER_SESSIONS.put(
        sessionKey,
        JSON.stringify(userState),
        { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
      );
      
      return new Response(JSON.stringify({
        type: 'question',
        question: nextQuestion,
        progress: { 
          current: answeredCount + 1, 
          total: questions.length 
        },
        sessionId: sessionId
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
    
    // COMBINE emotional profile with preference text for richer search
    const enrichedSearchQuery = combineEmotionalAndPreference(
      preferenceText,
      emotionalResult.emotionalProfile,
      emotionalResult.vector
    );
    
    // Build SOFT filters (not hard exclusions)
    const filters = buildSmartFilters(answers, userState.context);
    
    // Search movies using enriched query
    const vectorResults = await vectorService.searchMovies(
      enrichedSearchQuery, 
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
    
    // Enable surprise injection - adds 2 surprise movies to the 10 recommendations
    const recommendationsWithSurprises = await surpriseEngine.injectSurprise(
      enrichedMovies.slice(0, 10),
      userProfile,
      userState.context
    );
    // Now we have 12 movies total: 10 regular + 2 surprises
    
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

// Combine emotional profile with preference text for richer search
function combineEmotionalAndPreference(preferenceText, emotionalProfile, emotionalVector) {
  // Start with the base preference text
  let enrichedQuery = preferenceText;
  
  // Add emotional dimensions to enhance the search
  if (emotionalProfile) {
    const emotionalEnhancements = [];
    
    // Add energy-based enhancements
    if (emotionalProfile.energy === 'energized') {
      emotionalEnhancements.push('high-energy, exciting, thrilling');
    } else if (emotionalProfile.energy === 'drained') {
      emotionalEnhancements.push('gentle, calming, soothing');
    }
    
    // Add mood-based enhancements
    if (emotionalProfile.mood === 'melancholic') {
      emotionalEnhancements.push('emotional, deep, poignant');
    } else if (emotionalProfile.mood === 'adventurous') {
      emotionalEnhancements.push('adventurous, exciting, discovery');
    }
    
    // Add openness-based enhancements
    if (emotionalProfile.openness === 'experimental') {
      emotionalEnhancements.push('unique, unconventional, artistic');
    } else if (emotionalProfile.openness === 'comfort_zone') {
      emotionalEnhancements.push('familiar, classic, well-loved');
    }
    
    // Add focus-based enhancements
    if (emotionalProfile.focus === 'immersed') {
      emotionalEnhancements.push('complex, layered, detailed');
    } else if (emotionalProfile.focus === 'scattered') {
      emotionalEnhancements.push('simple, straightforward, accessible');
    }
    
    // Append emotional enhancements to the query
    if (emotionalEnhancements.length > 0) {
      enrichedQuery += ' The film should also be ' + emotionalEnhancements.join(', ') + '.';
    }
  }
  
  // Add vector weights as hints (if we had direct vector support)
  // For now, the text query will be converted to a vector by the vectorize worker
  
  return enrichedQuery;
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