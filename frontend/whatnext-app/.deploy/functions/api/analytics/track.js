// Pages Function: /api/analytics/track
// Track user interactions with movies

export async function onRequest(context) {
  const { request, env } = context;
  
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
    const { sessionId, movieId, interactionType, metadata } = data;
    
    // Store interaction in D1 database if analytics is enabled
    if (env.ENABLE_ANALYTICS) {
      const timestamp = new Date().toISOString();
      
      await env.DB.prepare(`
        INSERT INTO movie_interactions (session_id, movie_id, interaction_type, metadata, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        movieId,
        interactionType,
        JSON.stringify(metadata || {}),
        timestamp
      ).run();
    }
    
    return new Response(JSON.stringify({
      success: true,
      tracked: true
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error tracking interaction:', error);
    // Don't fail the request if analytics fails
    return new Response(JSON.stringify({
      success: true,
      tracked: false
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}