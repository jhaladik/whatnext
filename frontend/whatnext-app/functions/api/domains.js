// Pages Function: /api/domains
// Returns available recommendation domains

export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // For now, return static domains
    // Later we can fetch from D1 database
    const domains = [
      {
        id: 'movies',
        name: 'Movies',
        description: 'Get personalized movie recommendations',
        icon: '🎬',
        available: true
      },
      {
        id: 'tv-series',
        name: 'TV Series',
        description: 'Find your next binge-worthy show',
        icon: '📺',
        available: false
      },
      {
        id: 'books',
        name: 'Books',
        description: 'Discover your next great read',
        icon: '📚',
        available: false
      }
    ];
    
    return new Response(JSON.stringify({
      domains,
      defaultDomain: 'movies'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in domains endpoint:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch domains',
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