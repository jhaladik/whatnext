// Debug endpoint to check if all bindings are available
export async function onRequest(context) {
  const { env } = context;
  
  const bindings = {
    // Check KV namespaces
    USER_SESSIONS: !!env.USER_SESSIONS,
    MOVIE_QUESTIONS: !!env.MOVIE_QUESTIONS,
    MOVIE_CACHE: !!env.MOVIE_CACHE,
    VECTOR_CACHE: !!env.VECTOR_CACHE,
    PREFERENCE_VECTORS: !!env.PREFERENCE_VECTORS,
    
    // Check D1 database
    DB: !!env.DB,
    
    // Check Vectorize
    MOVIE_VECTORS: !!env.MOVIE_VECTORS,
    
    // Check environment variables
    OPENAI_API_KEY: !!env.OPENAI_API_KEY,
    CLAUDE_API_KEY: !!env.CLAUDE_API_KEY,
    TMDB_API_KEY: !!env.TMDB_API_KEY,
    ADMIN_KEY: !!env.ADMIN_KEY,
    
    // Other configs
    VECTORIZE_WORKER_URL: env.VECTORIZE_WORKER_URL || 'not set',
    SESSION_TIMEOUT_SECONDS: env.SESSION_TIMEOUT_SECONDS || 'not set',
    ENABLE_ANALYTICS: env.ENABLE_ANALYTICS || 'not set'
  };
  
  // Test KV read
  let kvTest = 'not tested';
  try {
    if (env.USER_SESSIONS) {
      await env.USER_SESSIONS.get('test-key');
      kvTest = 'working';
    }
  } catch (e) {
    kvTest = 'error: ' + e.message;
  }
  
  // Test D1
  let dbTest = 'not tested';
  try {
    if (env.DB) {
      await env.DB.prepare('SELECT 1').first();
      dbTest = 'working';
    }
  } catch (e) {
    dbTest = 'error: ' + e.message;
  }
  
  return new Response(JSON.stringify({
    bindings,
    tests: {
      kv: kvTest,
      database: dbTest
    }
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}