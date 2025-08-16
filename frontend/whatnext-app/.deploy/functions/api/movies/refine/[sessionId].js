// Pages Function: /api/movies/refine/[sessionId]
// Refine recommendations based on user feedback

import { RefinementEngine } from '../../../services/refinementEngine.js';

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
    
    // Initialize refinement engine with session
    const refinementEngine = new RefinementEngine(env);
    refinementEngine.session = { userState }; // Set session for the engine
    
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
    
    // Use the actual refinement engine with feedback
    const refinementResult = await refinementEngine.refineRecommendations(
      data.feedback || [],  // Array of {movieId, reaction: 'like'|'dislike'|'neutral'}
      data.action || 'auto'  // 'more_like_this', 'less_like_this', 'auto', etc.
    );
    
    // Extract the recommendations array from the result
    const refinedRecommendations = Array.isArray(refinementResult.recommendations) 
      ? refinementResult.recommendations 
      : [];
    
    // Update session with new recommendations
    userState.lastRecommendations = refinedRecommendations;
    userState.refinementCount = (userState.refinementCount || 0) + 1;
    
    await env.USER_SESSIONS.put(
      sessionKey,
      JSON.stringify(userState),
      { expirationTtl: env.SESSION_TIMEOUT_SECONDS || 3600 }
    );
    
    return new Response(JSON.stringify({
      recommendations: refinedRecommendations,
      sessionId,
      refinementCount: userState.refinementCount,
      strategy: refinementResult.strategy || 'auto',
      confidence: refinementResult.confidence || 80,
      adjustments: refinementResult.adjustments || 'Refined based on your feedback'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error refining recommendations:', error);
    return new Response(JSON.stringify({
      error: 'Failed to refine recommendations',
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