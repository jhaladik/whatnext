import { EnhancedTMDBClient, EnhancedProcessedMovie } from './tmdb-client-enhanced';
import { EmbeddingService } from './embedding-service';
import { VectorizeService } from './vectorize-service';
import { RateLimiter } from './rate-limiter';

export interface ProcessingResult {
  moviesProcessed: number;
  embeddingsCreated: number;
  vectorsUploaded: number;
  errors: string[];
  duration: number;
}

export class VectorizationOrchestrator {
  private tmdb: EnhancedTMDBClient;
  private embedding: EmbeddingService;
  private vectorize: VectorizeService;
  private db: D1Database;
  private maxDailyMovies: number;

  constructor(env: Env) {
    // Initialize rate limiters with conservative settings
    const tmdbRateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
      requestsPerSecond: parseInt(env.TMDB_RATE_LIMIT_PER_SECOND || '2'),
      burstSize: 1,
      windowMs: 1000,
      service: 'tmdb'
    });

    const openaiRateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
      requestsPerSecond: 10, // OpenAI allows 3000/min = 50/sec, but we're conservative
      burstSize: 5,
      windowMs: 1000,
      service: 'openai'
    });

    this.tmdb = new EnhancedTMDBClient(env.TMDB_API_KEY, tmdbRateLimiter, env.DB);
    this.embedding = new EmbeddingService(
      env.OPENAI_API_KEY,
      openaiRateLimiter,
      env.DB,
      parseInt(env.OPENAI_BATCH_SIZE || '50')
    );
    this.vectorize = new VectorizeService(
      env.MOVIE_VECTORS,
      env.DB,
      parseInt(env.VECTORIZE_BATCH_SIZE || '500')
    );
    this.db = env.DB;
    this.maxDailyMovies = parseInt(env.MAX_DAILY_NEW_MOVIES || '50');
  }

  async processNewMovies(movieIds?: number[]): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let moviesProcessed = 0;
    let embeddingsCreated = 0;
    let vectorsUploaded = 0;

    try {
      // First, check if there are already movies in the queue to process
      const pendingInQueue = await this.getPendingMoviesFromQueue();
      
      let idsToProcess = movieIds;
      
      // If specific IDs provided, use those
      if (movieIds && movieIds.length > 0) {
        // For manually specified movies, process them directly
        // The TMDB client will check if they already exist
        idsToProcess = movieIds;
      } 
      // If there are pending movies in queue, process those
      else if (pendingInQueue.length > 0) {
        console.log(`[Orchestrator] Found ${pendingInQueue.length} pending movies in queue`);
        idsToProcess = pendingInQueue;
      }
      // Otherwise fetch new movies from TMDB
      else {
        // Get trending and popular movies
        const [trending, popular] = await Promise.all([
          this.tmdb.fetchTrendingMovies('week'),
          this.tmdb.fetchPopularMovies(1)
        ]);
        
        const allIds = [...new Set([...trending, ...popular])];
        const existingMovies = await this.getExistingMovieIds();
        idsToProcess = allIds.filter(id => !existingMovies.includes(id));
      }

      const newMovieIds = idsToProcess;
      
      if (newMovieIds.length === 0) {
        console.log('[Orchestrator] No new movies to process');
        return {
          moviesProcessed: 0,
          embeddingsCreated: 0,
          vectorsUploaded: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      // Limit daily processing
      const moviesToProcess = newMovieIds.slice(0, this.maxDailyMovies);
      console.log(`[Orchestrator] Processing ${moviesToProcess.length} movies`);

      // Add to processing queue only if not already there
      if (movieIds && movieIds.length > 0) {
        await this.addToQueue(moviesToProcess);
      }

      // Process movies in batches
      const batchSize = 10; // Process 10 movies at a time
      const processedMovies: EnhancedProcessedMovie[] = [];

      for (let i = 0; i < moviesToProcess.length; i += batchSize) {
        const batch = moviesToProcess.slice(i, i + batchSize);
        console.log(`[Orchestrator] Processing movie batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(moviesToProcess.length/batchSize)}`);
        console.log(`[Orchestrator] Batch IDs: ${batch.join(', ')}`);
        
        // Fetch movie details with enhanced data
        const moviePromises = batch.map(id => this.tmdb.fetchEnhancedMovie(id));
        const movies = await Promise.all(moviePromises);
        const validMovies = movies.filter(m => m !== null) as EnhancedProcessedMovie[];
        
        console.log(`[Orchestrator] Fetched ${movies.length} movies, ${validMovies.length} passed filters`);
        
        if (validMovies.length > 0) {
          // Save to database
          await this.saveMoviesToDB(validMovies);
          processedMovies.push(...validMovies);
          moviesProcessed += validMovies.length;
          console.log(`[Orchestrator] Saved ${validMovies.length} movies to DB`);
        } else {
          console.log(`[Orchestrator] No valid movies in this batch after filtering`);
        }

        // Check rate limit capacity
        const capacity = await this.tmdb.getRemainingCapacity();
        if (capacity === 0) {
          console.log('[Orchestrator] Rate limit reached, stopping batch processing');
          break; // Stop processing more batches
        }
      }

      if (processedMovies.length === 0) {
        console.log('[Orchestrator] No valid movies to vectorize');
        return {
          moviesProcessed,
          embeddingsCreated: 0,
          vectorsUploaded: 0,
          errors,
          duration: Date.now() - startTime
        };
      }

      // Generate embeddings
      console.log(`[Orchestrator] Generating embeddings for ${processedMovies.length} movies`);
      console.log(`[Orchestrator] Movies to embed: ${processedMovies.map(m => `${m.tmdb_id}:${m.title}`).join(', ')}`);
      const embeddings = await this.embedding.generateEmbeddings(processedMovies);
      embeddingsCreated = embeddings.length;
      console.log(`[Orchestrator] Generated ${embeddings.length} embeddings`);

      if (embeddings.length === 0) {
        errors.push('Failed to generate any embeddings');
        return {
          moviesProcessed,
          embeddingsCreated: 0,
          vectorsUploaded: 0,
          errors,
          duration: Date.now() - startTime
        };
      }

      // Upload to Vectorize
      console.log(`[Orchestrator] Uploading ${embeddings.length} vectors`);
      vectorsUploaded = await this.vectorize.uploadEmbeddings(embeddings);

      // Update queue status
      await this.updateQueueStatus(moviesToProcess, 'completed');

      const duration = Date.now() - startTime;
      console.log(`[Orchestrator] Processing complete in ${duration}ms`);
      
      return {
        moviesProcessed,
        embeddingsCreated,
        vectorsUploaded,
        errors,
        duration
      };

    } catch (error) {
      console.error('[Orchestrator] Processing failed:', error);
      errors.push(error.message);
      
      return {
        moviesProcessed,
        embeddingsCreated,
        vectorsUploaded,
        errors,
        duration: Date.now() - startTime
      };
    }
  }

  async reprocessFailedMovies(): Promise<ProcessingResult> {
    console.log('[Orchestrator] Reprocessing failed movies');
    
    // Get failed movies
    const failedMovies = await this.db
      .prepare(`
        SELECT tmdb_id 
        FROM movies 
        WHERE processing_status = 'failed' 
          AND processing_attempts < 3
        ORDER BY processing_attempts ASC
        LIMIT ?
      `)
      .bind(this.maxDailyMovies)
      .all();

    if (failedMovies.results.length === 0) {
      return {
        moviesProcessed: 0,
        embeddingsCreated: 0,
        vectorsUploaded: 0,
        errors: [],
        duration: 0
      };
    }

    const movieIds = failedMovies.results.map(m => m.tmdb_id as number);
    return this.processNewMovies(movieIds);
  }

  async enrichExistingMovies(movieIds?: number[]): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let moviesEnriched = 0;

    try {
      // If no specific IDs provided, get all movies that need enrichment
      if (!movieIds || movieIds.length === 0) {
        const result = await this.db
          .prepare(`
            SELECT tmdb_id 
            FROM movies 
            WHERE poster_path IS NULL 
               OR cast IS NULL 
               OR director IS NULL
            LIMIT ?
          `)
          .bind(this.maxDailyMovies)
          .all();
        
        movieIds = result.results.map(r => r.tmdb_id as number);
      }

      if (movieIds.length === 0) {
        console.log('[Orchestrator] No movies need enrichment');
        return {
          moviesProcessed: 0,
          embeddingsCreated: 0,
          vectorsUploaded: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      console.log(`[Orchestrator] Enriching ${movieIds.length} movies with enhanced data`);

      // Process in batches
      const batchSize = 5; // Smaller batches for enrichment
      
      for (let i = 0; i < movieIds.length; i += batchSize) {
        const batch = movieIds.slice(i, i + batchSize);
        console.log(`[Orchestrator] Enriching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movieIds.length/batchSize)}`);
        
        // Fetch enhanced movie data
        const moviePromises = batch.map(id => this.tmdb.fetchEnhancedMovie(id));
        const movies = await Promise.all(moviePromises);
        const validMovies = movies.filter(m => m !== null) as EnhancedProcessedMovie[];
        
        if (validMovies.length > 0) {
          // Update database with enhanced data only (no new embeddings)
          await this.updateMoviesWithEnhancedData(validMovies);
          moviesEnriched += validMovies.length;
          console.log(`[Orchestrator] Enriched ${validMovies.length} movies`);
        }

        // Rate limiting
        const capacity = await this.tmdb.getRemainingCapacity();
        if (capacity === 0) {
          console.log('[Orchestrator] Rate limit reached, stopping enrichment');
          break; // Stop processing more batches
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Orchestrator] Enrichment complete in ${duration}ms`);
      
      return {
        moviesProcessed: moviesEnriched,
        embeddingsCreated: 0, // No new embeddings for enrichment
        vectorsUploaded: 0,
        errors,
        duration
      };

    } catch (error) {
      console.error('[Orchestrator] Enrichment failed:', error);
      errors.push(error.message);
      
      return {
        moviesProcessed: moviesEnriched,
        embeddingsCreated: 0,
        vectorsUploaded: 0,
        errors,
        duration: Date.now() - startTime
      };
    }
  }

  private async updateMoviesWithEnhancedData(movies: EnhancedProcessedMovie[]) {
    const updates = movies.map(movie =>
      this.db.prepare(`
        UPDATE movies SET
          poster_path = ?,
          backdrop_path = ?,
          trailer_key = ?,
          cast = ?,
          director = ?,
          crew = ?,
          streaming_providers = ?,
          streaming_regions = ?,
          watch_links = ?,
          tagline = ?,
          budget = ?,
          revenue = ?,
          imdb_id = ?,
          homepage = ?,
          spoken_languages = ?,
          status = ?,
          collection_id = ?,
          collection_name = ?,
          updated_at = datetime('now')
        WHERE tmdb_id = ?
      `).bind(
        movie.poster_path,
        movie.backdrop_path,
        movie.trailer_key,
        JSON.stringify(movie.cast),
        movie.director,
        JSON.stringify(movie.crew),
        JSON.stringify(movie.streaming_providers),
        JSON.stringify(movie.streaming_regions),
        JSON.stringify(movie.watch_links),
        movie.tagline,
        movie.budget,
        movie.revenue,
        movie.imdb_id,
        movie.homepage,
        JSON.stringify(movie.spoken_languages),
        movie.status,
        movie.collection_id,
        movie.collection_name,
        movie.tmdb_id
      )
    );
    
    await this.db.batch(updates);
  }

  private async getExistingMovieIds(): Promise<number[]> {
    const result = await this.db
      .prepare('SELECT tmdb_id FROM movies')
      .all();
    
    return result.results.map(r => r.tmdb_id as number);
  }

  private async getPendingMoviesFromQueue(): Promise<number[]> {
    const result = await this.db
      .prepare(`
        SELECT DISTINCT q.tmdb_id 
        FROM processing_queue q
        LEFT JOIN movies m ON q.tmdb_id = m.tmdb_id
        WHERE q.status = 'pending' 
          AND (m.processing_status IS NULL OR m.processing_status != 'completed')
        ORDER BY q.priority DESC, q.added_at ASC
        LIMIT ?
      `)
      .bind(this.maxDailyMovies)
      .all();
    
    return result.results.map(r => r.tmdb_id as number);
  }

  private async addToQueue(movieIds: number[]) {
    const insertPromises = movieIds.map(id =>
      this.db.prepare(`
        INSERT OR IGNORE INTO processing_queue (tmdb_id, priority, status)
        VALUES (?, ?, 'pending')
      `).bind(id, 0).run()
    );
    
    await Promise.all(insertPromises);
  }

  private async updateQueueStatus(movieIds: number[], status: string) {
    const updates = movieIds.map(id =>
      this.db.prepare(`
        UPDATE processing_queue 
        SET status = ?, processed_at = datetime('now')
        WHERE tmdb_id = ?
      `).bind(status, id)
    );
    
    await this.db.batch(updates);
  }

  private async saveMoviesToDB(movies: EnhancedProcessedMovie[]) {
    const inserts = movies.map(movie =>
      this.db.prepare(`
        INSERT OR REPLACE INTO movies (
          tmdb_id, title, original_title, overview, release_date, year,
          runtime, vote_average, vote_count, popularity, original_language,
          genres, keywords, production_countries, processing_status, updated_at,
          poster_path, backdrop_path, trailer_key,
          cast, director, crew,
          streaming_providers, streaming_regions, watch_links,
          tagline, budget, revenue, imdb_id, homepage,
          spoken_languages, status, media_type,
          collection_id, collection_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', datetime('now'),
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        movie.tmdb_id,
        movie.title,
        movie.original_title,
        movie.overview,
        movie.release_date,
        movie.year,
        movie.runtime,
        movie.vote_average,
        movie.vote_count,
        movie.popularity,
        movie.original_language,
        JSON.stringify(movie.genres),
        JSON.stringify(movie.keywords),
        JSON.stringify(movie.production_countries),
        // New fields
        movie.poster_path,
        movie.backdrop_path,
        movie.trailer_key,
        JSON.stringify(movie.cast),
        movie.director,
        JSON.stringify(movie.crew),
        JSON.stringify(movie.streaming_providers),
        JSON.stringify(movie.streaming_regions),
        JSON.stringify(movie.watch_links),
        movie.tagline,
        movie.budget,
        movie.revenue,
        movie.imdb_id,
        movie.homepage,
        JSON.stringify(movie.spoken_languages),
        movie.status,
        movie.media_type,
        movie.collection_id,
        movie.collection_name
      )
    );
    
    await this.db.batch(inserts);
  }

  // Removed delay function - setTimeout doesn't work in Cloudflare Workers

  async getProcessingStats(): Promise<any> {
    const vectorStats = await this.vectorize.getStats();
    
    const queueStats = await this.db
      .prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM processing_queue
      `)
      .first();

    const todayMetrics = await this.db
      .prepare(`
        SELECT * FROM daily_metrics 
        WHERE date = date('now')
      `)
      .first();

    return {
      vectors: vectorStats,
      queue: queueStats,
      today: todayMetrics || {
        movies_processed: 0,
        embeddings_created: 0,
        vectors_uploaded: 0,
        tmdb_requests: 0,
        openai_requests: 0,
        openai_tokens: 0,
        errors_count: 0
      }
    };
  }
}