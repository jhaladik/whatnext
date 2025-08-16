// Pages Function: /api/movies/validate-moment/[sessionId]
// Validate if recommendations matched the user's moment

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
    const { validationType, feedback } = data;
    
    // Store validation feedback
    if (env.ENABLE_ANALYTICS && env.DB) {
      const timestamp = new Date().toISOString();
      
      await env.DB.prepare(`
        INSERT INTO moment_validation (session_id, validation_type, feedback, timestamp)
        VALUES (?, ?, ?, ?)
      `).bind(
        sessionId,
        validationType,
        JSON.stringify(feedback),
        timestamp
      ).run();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you for your feedback!'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error storing validation:', error);
    return new Response(JSON.stringify({
      success: true,
      message: 'Feedback received'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}