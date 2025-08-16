// Debug endpoint to check poster URLs in a session
export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response(JSON.stringify({
      error: 'Please provide sessionId as query parameter'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  try {
    // Get session from KV
    const sessionKey = `session:${sessionId}`;
    const sessionData = await env.USER_SESSIONS.get(sessionKey);
    
    if (!sessionData) {
      return new Response(JSON.stringify({
        error: 'Session not found'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const userState = JSON.parse(sessionData);
    const recommendations = userState.lastRecommendations || [];
    
    // Extract poster information
    const posterInfo = recommendations.map(movie => ({
      title: movie.title,
      movieId: movie.movieId,
      poster: movie.poster,
      poster_path: movie.poster_path,
      hasPoster: !!movie.poster,
      posterUrl: movie.poster || 'NO POSTER URL'
    }));
    
    // Test if we can fetch from D1 directly
    let dbTest = null;
    if (env.DB && recommendations.length > 0) {
      try {
        const firstMovieId = recommendations[0].movieId || recommendations[0].tmdb_id;
        const result = await env.DB.prepare(
          'SELECT tmdb_id, title, poster_path FROM movies WHERE tmdb_id = ?'
        ).bind(firstMovieId).first();
        dbTest = result;
      } catch (e) {
        dbTest = 'DB query error: ' + e.message;
      }
    }
    
    return new Response(JSON.stringify({
      sessionId,
      recommendationCount: recommendations.length,
      posters: posterInfo,
      sampleMovie: recommendations[0],
      dbTest,
      note: 'Check if poster URLs are being generated correctly'
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to check posters',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}