import { VectorizationOrchestrator } from './lib/orchestrator';
import { RecommendationService } from './lib/recommendation-service';
import { VectorizeService } from './lib/vectorize-service';
import { EmbeddingService } from './lib/embedding-service';
import { RateLimiter } from './lib/rate-limiter';
import { VectorMappingFixer } from './lib/fix-mappings';
import { CuratorService } from './lib/curator-service';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        return handleHealthCheck(env);
      }

      // Debug endpoint to check database content
      if (url.pathname === '/debug' && request.method === 'GET') {
        return handleDebugMovie(request, env);
      }

      // Get processing stats
      if (url.pathname === '/stats') {
        return handleStats(env);
      }

      // Search movies
      if (url.pathname === '/search' && request.method === 'POST') {
        return handleSearch(request, env);
      }

      // Get recommendations
      if (url.pathname === '/recommend' && request.method === 'POST') {
        return handleRecommendations(request, env);
      }

      // Manual trigger for processing (admin only)
      if (url.pathname === '/process' && request.method === 'POST') {
        return handleManualProcess(request, env, ctx);
      }

      // Reprocess failed movies
      if (url.pathname === '/reprocess' && request.method === 'POST') {
        return handleReprocess(env, ctx);
      }

      // Enrich existing movies with enhanced data
      if (url.pathname === '/enrich' && request.method === 'POST') {
        return handleEnrichExisting(request, env, ctx);
      }

      // Fix vector mappings
      if (url.pathname === '/fix-mappings' && request.method === 'POST') {
        return handleFixMappings(request, env);
      }

      // Get fix status
      if (url.pathname === '/fix-status' && request.method === 'GET') {
        return handleFixStatus(env);
      }

      // Queue operations
      if (url.pathname === '/process-queue' && request.method === 'POST') {
        return handleProcessQueue(request, env);
      }
      
      if (url.pathname === '/add-to-queue' && request.method === 'POST') {
        return handleAddToQueue(request, env);
      }
      
      if (url.pathname === '/clear-queue' && request.method === 'POST') {
        return handleClearQueue(request, env);
      }

      // Curator endpoints
      if (url.pathname === '/curator/stats' && request.method === 'POST') {
        return handleCuratorStats(request, env);
      }
      
      if (url.pathname === '/curator/evaluate' && request.method === 'POST') {
        return handleCuratorEvaluate(request, env);
      }
      
      if (url.pathname === '/curator/suggestions' && request.method === 'GET') {
        return handleCuratorSuggestions(env);
      }
      
      // Temporary migration endpoint
      if (url.pathname === '/curator/migrate' && request.method === 'POST') {
        return handleCuratorMigration(request, env);
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('[Worker] Request failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Scheduled] Daily update triggered');
    
    try {
      const orchestrator = new VectorizationOrchestrator(env);
      
      // Process new movies
      const result = await orchestrator.processNewMovies();
      
      console.log('[Scheduled] Daily update completed:', result);
      
      // If we have capacity, reprocess failed movies
      if (result.moviesProcessed < parseInt(env.MAX_DAILY_NEW_MOVIES || '50')) {
        console.log('[Scheduled] Reprocessing failed movies');
        const reprocessResult = await orchestrator.reprocessFailedMovies();
        console.log('[Scheduled] Reprocess completed:', reprocessResult);
      }
      
    } catch (error) {
      console.error('[Scheduled] Daily update failed:', error);
    }
  }
};

async function handleDebugMovie(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const movieId = url.searchParams.get('id') || '13';
  
  try {
    const movie = await env.DB
      .prepare(`
        SELECT 
          tmdb_id,
          title,
          original_title,
          overview,
          release_date,
          year,
          runtime,
          vote_average,
          vote_count,
          popularity,
          original_language,
          genres,
          keywords,
          production_countries,
          poster_path,
          backdrop_path,
          director,
          trailer_key,
          tagline,
          budget,
          revenue,
          vector_id,
          processing_status,
          embedded_at,
          updated_at
        FROM movies 
        WHERE tmdb_id = ?
      `)
      .bind(parseInt(movieId))
      .first();
    
    const stats = await env.DB
      .prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(poster_path) as with_poster,
          COUNT(director) as with_director
        FROM movies
      `)
      .first();
    
    return new Response(
      JSON.stringify({
        movie,
        stats,
        message: 'Debug data for movie ' + movieId
      }, null, 2),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleHealthCheck(env: Env): Promise<Response> {
  try {
    // Check database
    const dbCheck = await env.DB.prepare('SELECT 1').first();
    
    // Check Vectorize (get stats)
    const vectorService = new VectorizeService(env.MOVIE_VECTORS, env.DB);
    const stats = await vectorService.getStats();
    
    return new Response(
      JSON.stringify({
        status: 'healthy',
        database: dbCheck ? 'connected' : 'error',
        vectorize: stats.totalVectors > 0 ? 'active' : 'empty',
        vectors: stats.totalVectors,
        environment: env.ENVIRONMENT || 'development'
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error.message
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleStats(env: Env): Promise<Response> {
  const orchestrator = new VectorizationOrchestrator(env);
  const stats = await orchestrator.getProcessingStats();
  
  return new Response(
    JSON.stringify(stats),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const { query, limit = 10 } = await request.json();
  
  if (!query) {
    return new Response(
      JSON.stringify({ error: 'Query parameter required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Initialize services
  const openaiRateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    requestsPerSecond: 10,
    burstSize: 5,
    windowMs: 1000,
    service: 'openai'
  });

  const vectorService = new VectorizeService(env.MOVIE_VECTORS, env.DB);
  const embeddingService = new EmbeddingService(
    env.OPENAI_API_KEY,
    openaiRateLimiter,
    env.DB
  );
  const recommendationService = new RecommendationService(
    vectorService,
    embeddingService,
    env.DB
  );

  const searchResult = await recommendationService.searchMovies(query, limit);
  
  return new Response(
    JSON.stringify({ 
      results: searchResult.movies,
      query_embedding: searchResult.embedding 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleRecommendations(request: Request, env: Env): Promise<Response> {
  const preferences = await request.json();
  
  // Initialize services
  const openaiRateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    requestsPerSecond: 10,
    burstSize: 5,
    windowMs: 1000,
    service: 'openai'
  });

  const vectorService = new VectorizeService(env.MOVIE_VECTORS, env.DB);
  const embeddingService = new EmbeddingService(
    env.OPENAI_API_KEY,
    openaiRateLimiter,
    env.DB
  );
  const recommendationService = new RecommendationService(
    vectorService,
    embeddingService,
    env.DB
  );

  const recommendations = await recommendationService.getRecommendations(
    preferences,
    preferences.topK || 10
  );
  
  return new Response(
    JSON.stringify({ recommendations }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleManualProcess(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const body = await request.json();
  const { movieIds, adminKey, sync = false } = body;
  
  // Simple admin authentication (you should use a proper auth system)
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const orchestrator = new VectorizationOrchestrator(env);
  
  // If no movieIds provided, return error (no queue processing)
  if (!movieIds || movieIds.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: 'movieIds required. Queue processing is disabled.' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Process synchronously if requested
  if (sync) {
    try {
      console.log('[Manual] Processing synchronously:', movieIds);
      const result = await orchestrator.processNewMovies(movieIds);
      console.log('[Manual] Sync processing completed:', result);
      
      return new Response(
        JSON.stringify({ 
          message: 'Processing completed', 
          movieIds: movieIds,
          result: result
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[Manual] Sync processing failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Processing failed',
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // Default: Run asynchronously (but warn that it might not work)
  ctx.waitUntil(
    orchestrator.processNewMovies(movieIds).then(result => {
      console.log('[Manual] Async processing completed:', result);
    }).catch(error => {
      console.error('[Manual] Async processing failed:', error);
    })
  );
  
  return new Response(
    JSON.stringify({ 
      message: 'Processing started (async - may not complete)', 
      movieIds: movieIds,
      warning: 'Async processing has issues. Use sync=true for reliable processing.'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleReprocess(env: Env, ctx: ExecutionContext): Promise<Response> {
  const orchestrator = new VectorizationOrchestrator(env);
  
  ctx.waitUntil(
    orchestrator.reprocessFailedMovies().then(result => {
      console.log('[Reprocess] Completed:', result);
    })
  );
  
  return new Response(
    JSON.stringify({ message: 'Reprocessing started' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleEnrichExisting(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const body = await request.json();
  const { movieIds, adminKey } = body;
  
  // Simple admin authentication
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const orchestrator = new VectorizationOrchestrator(env);
  
  // Run enrichment asynchronously
  ctx.waitUntil(
    orchestrator.enrichExistingMovies(movieIds).then(result => {
      console.log('[Enrich] Completed:', result);
    }).catch(error => {
      console.error('[Enrich] Failed:', error);
    })
  );
  
  return new Response(
    JSON.stringify({ 
      message: 'Enrichment started', 
      movieIds: movieIds?.length || 'all existing'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleFixMappings(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const { adminKey, movieIds } = body;
  
  // Simple admin authentication
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const fixer = new VectorMappingFixer(env.DB);
  
  try {
    // Get current status first
    const status = await fixer.getFixStatus();
    console.log(`[FixMappings] Current status: ${status.needsFix} need fix, ${status.alreadyFixed} already fixed`);
    
    // Apply the fix
    const result = await fixer.fixMappings(movieIds);
    
    // Get updated status
    const newStatus = await fixer.verifyFix();
    
    return new Response(
      JSON.stringify({
        success: result.success,
        before: status,
        after: newStatus,
        details: {
          updated: result.updated,
          failed: result.failed,
          errors: result.errors
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FixMappings] Failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: status 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleFixStatus(env: Env): Promise<Response> {
  const fixer = new VectorMappingFixer(env.DB);
  
  try {
    const status = await fixer.getFixStatus();
    const verification = await fixer.verifyFix();
    
    return new Response(
      JSON.stringify({
        status,
        verification,
        recommendation: status.needsFix > 0 ? 
          'Run /fix-mappings to fix vector mappings' : 
          'All mappings are up to date'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleProcessQueue(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, batchSize = 1, maxMovies = 10 } = body;
  
  // Simple admin authentication
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const orchestrator = new VectorizationOrchestrator(env);
  
  try {
    // Get pending movies from queue
    const pendingResult = await env.DB
      .prepare(`
        SELECT DISTINCT q.tmdb_id 
        FROM processing_queue q
        LEFT JOIN movies m ON q.tmdb_id = m.tmdb_id
        WHERE q.status = 'pending' 
          AND (m.processing_status IS NULL OR m.processing_status != 'completed')
        ORDER BY q.priority DESC, q.added_at ASC
        LIMIT ?
      `)
      .bind(maxMovies)
      .all();
    
    const pendingIds = pendingResult.results.map(r => r.tmdb_id as number);
    
    if (pendingIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending movies in queue',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[ProcessQueue] Processing ${pendingIds.length} movies from queue`);
    
    const results = [];
    let totalProcessed = 0;
    let totalErrors = 0;
    
    // Process movies in small batches or one by one
    for (let i = 0; i < pendingIds.length; i += batchSize) {
      const batch = pendingIds.slice(i, i + batchSize);
      console.log(`[ProcessQueue] Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
      
      try {
        // Process synchronously
        const result = await orchestrator.processNewMovies(batch);
        
        results.push({
          movieIds: batch,
          success: result.moviesProcessed > 0,
          processed: result.moviesProcessed,
          embeddings: result.embeddingsCreated,
          vectors: result.vectorsUploaded,
          errors: result.errors
        });
        
        totalProcessed += result.moviesProcessed;
        if (result.errors.length > 0) totalErrors++;
        
        // Update queue status for processed movies
        if (result.moviesProcessed > 0) {
          await env.DB
            .prepare(`
              UPDATE processing_queue 
              SET status = 'completed', processed_at = datetime('now')
              WHERE tmdb_id IN (${batch.map(() => '?').join(',')})
            `)
            .bind(...batch)
            .run();
        }
        
      } catch (error: any) {
        console.error(`[ProcessQueue] Batch failed:`, error);
        results.push({
          movieIds: batch,
          success: false,
          error: error.message
        });
        totalErrors++;
      }
      
      // No delay needed - let rate limiter handle timing
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Queue processing completed',
        totalMovies: pendingIds.length,
        totalProcessed,
        totalErrors,
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[ProcessQueue] Failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Queue processing failed',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleAddToQueue(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { movieIds, adminKey, priority = 0 } = body;
  
  // Simple admin authentication
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  if (!movieIds || movieIds.length === 0) {
    return new Response(
      JSON.stringify({ error: 'movieIds required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Add movies to queue
    const insertPromises = movieIds.map((id: number) =>
      env.DB.prepare(`
        INSERT OR IGNORE INTO processing_queue (tmdb_id, priority, status)
        VALUES (?, ?, 'pending')
      `).bind(id, priority).run()
    );
    
    await Promise.all(insertPromises);
    
    // Get queue status
    const queueStats = await env.DB
      .prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM processing_queue
      `)
      .first();
    
    return new Response(
      JSON.stringify({ 
        message: `Added ${movieIds.length} movies to queue`,
        movieIds,
        queueStatus: queueStats
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[AddToQueue] Failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to add movies to queue',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleClearQueue(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, clearType = 'pending' } = body;
  
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    // Get current queue stats
    const statsBefore = await env.DB
      .prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(*) as total
        FROM processing_queue
      `)
      .first();
    
    // Clear based on type
    if (clearType === 'all') {
      await env.DB.prepare('DELETE FROM processing_queue').run();
    } else if (clearType === 'pending') {
      await env.DB.prepare("DELETE FROM processing_queue WHERE status = 'pending'").run();
    } else if (clearType === 'completed') {
      await env.DB.prepare("DELETE FROM processing_queue WHERE status = 'completed'").run();
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid clearType. Use: all, pending, or completed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get updated stats
    const statsAfter = await env.DB
      .prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(*) as total
        FROM processing_queue
      `)
      .first();
    
    return new Response(
      JSON.stringify({ 
        message: `Queue cleared (${clearType})`,
        before: statsBefore,
        after: statsAfter,
        removed: {
          pending: (statsBefore?.pending || 0) - (statsAfter?.pending || 0),
          completed: (statsBefore?.completed || 0) - (statsAfter?.completed || 0),
          total: (statsBefore?.total || 0) - (statsAfter?.total || 0)
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[ClearQueue] Failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to clear queue',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCuratorStats(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, days = 30 } = body;
  
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const curator = new CuratorService(env.DB);
  const stats = await curator.getStats(days);
  
  return new Response(
    JSON.stringify(stats),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleCuratorEvaluate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, movieData, source = 'manual' } = body;
  
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  if (!movieData) {
    return new Response(
      JSON.stringify({ error: 'movieData required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const curator = new CuratorService(env.DB);
  const decision = await curator.evaluateMovie(movieData, source);
  
  return new Response(
    JSON.stringify(decision),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleCuratorSuggestions(env: Env): Promise<Response> {
  const curator = new CuratorService(env.DB);
  const suggestions = await curator.getSuggestions();
  
  return new Response(
    JSON.stringify(suggestions),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleCuratorMigration(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey } = body;
  
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    // Create curator tables
    const migrations = [
      // Curation log
      `CREATE TABLE IF NOT EXISTS curation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        reason TEXT,
        source TEXT,
        quality_score REAL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT DEFAULT 'system'
      )`,
      
      // Duplicate mappings
      `CREATE TABLE IF NOT EXISTS duplicate_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        primary_tmdb_id INTEGER NOT NULL,
        duplicate_tmdb_id INTEGER NOT NULL,
        match_type TEXT NOT NULL,
        match_confidence REAL,
        title_primary TEXT,
        title_duplicate TEXT,
        year_primary INTEGER,
        year_duplicate INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(primary_tmdb_id, duplicate_tmdb_id)
      )`,
      
      // Rejection log
      `CREATE TABLE IF NOT EXISTS rejection_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        title TEXT,
        year INTEGER,
        rejection_reason TEXT,
        rejection_details TEXT,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        runtime INTEGER,
        source TEXT,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Source collections
      `CREATE TABLE IF NOT EXISTS source_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT,
        description TEXT,
        total_movies INTEGER DEFAULT 0,
        movies_added INTEGER DEFAULT 0,
        movies_rejected INTEGER DEFAULT 0,
        movies_pending INTEGER DEFAULT 0,
        last_synced TIMESTAMP,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Movie sources
      `CREATE TABLE IF NOT EXISTS movie_sources (
        movie_id INTEGER NOT NULL,
        source_id INTEGER NOT NULL,
        rank_in_source INTEGER,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (movie_id, source_id)
      )`,
      
      // Quality metrics
      `CREATE TABLE IF NOT EXISTS quality_metrics (
        tmdb_id INTEGER PRIMARY KEY,
        rating_score REAL,
        popularity_score REAL,
        vote_confidence REAL,
        cultural_score REAL,
        longevity_score REAL,
        critical_score REAL,
        diversity_score REAL,
        uniqueness_score REAL,
        genre_balance_score REAL,
        overall_score REAL,
        score_version TEXT DEFAULT '1.0',
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Curation stats
      `CREATE TABLE IF NOT EXISTS curation_stats (
        date TEXT PRIMARY KEY,
        movies_evaluated INTEGER DEFAULT 0,
        movies_added INTEGER DEFAULT 0,
        movies_rejected INTEGER DEFAULT 0,
        movies_updated INTEGER DEFAULT 0,
        duplicates_found INTEGER DEFAULT 0,
        average_quality_score REAL,
        tmdb_evaluated INTEGER DEFAULT 0,
        tmdb_added INTEGER DEFAULT 0,
        manual_evaluated INTEGER DEFAULT 0,
        manual_added INTEGER DEFAULT 0,
        processing_time_ms INTEGER,
        api_calls_made INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Curator config
      `CREATE TABLE IF NOT EXISTS curator_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    // Run all migrations
    for (const sql of migrations) {
      await env.DB.prepare(sql).run();
    }
    
    // Insert default config
    const configs = [
      ['min_quality_score', '60', 'Minimum quality score to accept a movie'],
      ['min_vote_count', '1000', 'Minimum votes required'],
      ['min_rating', '6.5', 'Minimum TMDB rating'],
      ['min_year_age', '2', 'Movies must be at least N years old'],
      ['max_daily_additions', '50', 'Maximum movies to add per day'],
      ['duplicate_threshold', '0.85', 'Similarity threshold for duplicate detection'],
      ['enable_auto_curation', 'false', 'Enable automatic curation'],
      ['curator_version', '1.0', 'Current curator version']
    ];
    
    for (const [key, value, description] of configs) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES (?, ?, ?)`
      ).bind(key, value, description).run();
    }
    
    // Insert source collections
    const sources = [
      ['tmdb_popular', 'TMDB Popular', 'Popular movies from TMDB'],
      ['tmdb_top_rated', 'TMDB Top Rated', 'Top rated movies from TMDB'],
      ['tmdb_discover', 'TMDB Discover', 'Movies discovered through TMDB API'],
      ['manual_addition', 'Manual', 'Manually added movies'],
      ['afi_top_100', 'AFI Top 100', 'American Film Institute Top 100'],
      ['criterion_collection', 'Criterion Collection', 'Criterion Collection films'],
      ['oscar_winners', 'Oscar Winners', 'Academy Award winning films'],
      ['cannes_winners', 'Cannes Winners', 'Cannes Film Festival winners'],
      ['user_requests', 'User Requests', 'Movies requested by users']
    ];
    
    for (const [name, display_name, description] of sources) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES (?, ?, ?)`
      ).bind(name, display_name, description).run();
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Curator tables created successfully',
        tables_created: migrations.length,
        configs_added: configs.length,
        sources_added: sources.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[CuratorMigration] Failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Migration failed',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}