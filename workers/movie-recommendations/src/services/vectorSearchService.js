// src/services/vectorSearchService.js
export class VectorSearchService {
  constructor(env) {
    this.vectorIndex = env.MOVIE_VECTORS; // Direct Vectorize binding
    this.vectorizeService = env.VECTORIZE_SERVICE; // Service binding to vectorize worker
    this.vectorizeWorkerUrl = env.VECTORIZE_WORKER_URL; // Fallback URL for non-service-binding envs
    this.fallbackEnabled = env.ENABLE_CLAUDE_FALLBACK || false;
    this.cacheKV = env.VECTOR_CACHE;
    this.db = env.DB;
  }

  /**
   * Get the last query embedding (if available)
   * @returns {Array<number>|null} The embedding from the last search
   */
  getLastQueryEmbedding() {
    return this.lastQueryEmbedding || null;
  }

  /**
   * Search for movies using text query
   * @param {string|Array<number>} queryOrVector - Text query or vector (for backwards compatibility)
   * @param {Object} filters - Search filters
   * @param {number} limit - Maximum number of results
   * @returns {Array} Movie search results
   */
  async searchMovies(queryOrVector, filters = {}, limit = 50) {
    try {
      // Determine if we have a text query or vector
      const isTextQuery = typeof queryOrVector === 'string';
      
      // Check cache first
      const cacheKey = this.generateCacheKey(queryOrVector, filters);
      const cachedResults = await this.getCachedResults(cacheKey);
      
      if (cachedResults) {
        console.log('Returning cached search results');
        return cachedResults;
      }

      let processedResults;
      
      // Use service binding if available, otherwise fall back to URL
      if (isTextQuery && (this.vectorizeService || this.vectorizeWorkerUrl)) {
        console.log('Using vectorize worker for text search:', queryOrVector.substring(0, 100));
        
        let response;
        if (this.vectorizeService) {
          // Use service binding for direct worker-to-worker communication
          const request = new Request('https://vectorize.internal/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryOrVector,
              limit: limit
            })
          });
          response = await this.vectorizeService.fetch(request);
        } else {
          // Fallback to HTTP URL
          response = await fetch(`${this.vectorizeWorkerUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryOrVector,
              limit: limit
            })
          });
        }

        if (!response.ok) {
          throw new Error(`Vectorize worker search failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Map the results to expected format (tmdb_id -> movieId)
        processedResults = (data.results || []).map(movie => ({
          movieId: movie.tmdb_id,
          title: movie.title,
          year: movie.year,
          genres: movie.genres,
          rating: movie.rating,
          similarity: movie.similarity,
          overview: movie.overview,
          runtime: movie.runtime,
          vote_count: movie.vote_count,
          popularity: movie.popularity,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          release_date: movie.release_date
        }));
        
        // Store the embedding separately to preserve array structure
        if (data.query_embedding) {
          this.lastQueryEmbedding = data.query_embedding;
        }
        
      } else if (this.vectorIndex && !isTextQuery) {
        // Use native Vectorize binding for vector search (legacy)
        console.log('Using native Vectorize binding for vector search');
        
        const vectorResults = await this.vectorIndex.query(queryOrVector, {
          topK: limit,
          returnMetadata: true
        });

        processedResults = this.processVectorResults(vectorResults);
      } else {
        // Fallback to database search
        console.log('Falling back to database search');
        processedResults = await this.fallbackToDatabase(filters, limit);
      }
      
      // Cache results for 1 hour
      await this.cacheResults(cacheKey, processedResults, 3600);
      
      return processedResults;
      
    } catch (error) {
      console.error('Vector search error:', error);
      
      if (this.fallbackEnabled) {
        console.log('Falling back to database search');
        return this.fallbackToDatabaseSearch(filters);
      }
      
      throw error;
    }
  }

  /**
   * Build filters for vector search
   */
  buildVectorFilters(userFilters) {
    const filters = {};
    
    // Release year filtering
    if (userFilters.releaseYearRange) {
      filters.release_year = {
        gte: userFilters.releaseYearRange[0],
        lte: userFilters.releaseYearRange[1]
      };
    } else if (userFilters.minYear) {
      filters.release_year = { gte: userFilters.minYear };
    } else if (userFilters.maxYear) {
      filters.release_year = { lte: userFilters.maxYear };
    }
    
    // Rating filtering
    if (userFilters.minRating) {
      filters.rating = { gte: userFilters.minRating };
    }
    
    // Runtime filtering
    if (userFilters.maxRuntime) {
      filters.runtime = { lte: userFilters.maxRuntime };
    }
    if (userFilters.minRuntime) {
      filters.runtime = { gte: userFilters.minRuntime };
    }
    
    // Genre filtering
    if (userFilters.includeGenres?.length) {
      filters.genres = { in: userFilters.includeGenres };
    }
    if (userFilters.excludeGenres?.length) {
      filters.genres = { not_in: userFilters.excludeGenres };
    }
    
    // Vote count filtering (popularity indicator)
    if (userFilters.minVoteCount) {
      filters.vote_count = { gte: userFilters.minVoteCount };
    }
    
    // Popularity filtering
    if (userFilters.maxPopularity) {
      filters.popularity = { lte: userFilters.maxPopularity };
    }
    if (userFilters.minPopularity) {
      filters.popularity = { gte: userFilters.minPopularity };
    }
    
    return filters;
  }

  /**
   * Process raw vector search results
   */
  processVectorResults(rawResults) {
    if (!rawResults.matches || !Array.isArray(rawResults.matches)) {
      console.error('Invalid vector search results format');
      return [];
    }

    return rawResults.matches.map(match => ({
      movieId: match.id,
      title: match.metadata?.title || 'Unknown Title',
      similarity: match.score || 0,
      year: match.metadata?.release_year || null,
      genres: match.metadata?.genres || [],
      rating: match.metadata?.rating || 0,
      poster: match.metadata?.poster_url || null,
      overview: match.metadata?.overview || '',
      runtime: match.metadata?.runtime || null,
      voteCount: match.metadata?.vote_count || 0,
      confidence: this.calculateConfidence(match.score)
    }));
  }

  /**
   * Calculate confidence percentage from similarity score
   */
  calculateConfidence(similarity) {
    // Convert similarity score (0-1) to confidence percentage
    // Apply a slight boost to make scores more optimistic
    const boostedScore = Math.pow(similarity, 0.85);
    return Math.min(Math.round(boostedScore * 100), 95);
  }

  /**
   * Fallback to database when no vector index is available
   */
  async fallbackToDatabase(filters, limit = 20) {
    try {
      console.log('Fallback to database search with filters:', filters);
      
      // For now, return some mock data or query from movie_cache table
      // This is a temporary solution until Vectorize is properly configured
      let query = `
        SELECT 
          id as movieId,
          title,
          release_year as year,
          genres,
          rating,
          poster_url as poster,
          overview,
          runtime,
          vote_count as voteCount
        FROM movie_cache
        WHERE 1=1
      `;
      
      const bindings = [];
      
      // Apply basic filters
      if (filters.minRating) {
        query += ` AND rating >= ?`;
        bindings.push(filters.minRating);
      }
      
      if (filters.minYear) {
        query += ` AND release_year >= ?`;
        bindings.push(filters.minYear);
      }
      
      if (filters.maxYear) {
        query += ` AND release_year <= ?`;
        bindings.push(filters.maxYear);
      }
      
      // Order by rating and popularity
      query += ` ORDER BY rating DESC, vote_count DESC LIMIT ?`;
      bindings.push(limit);
      
      const result = await this.db.prepare(query).bind(...bindings).all();
      
      if (!result.results || result.results.length === 0) {
        console.log('No movies found in database, returning empty array');
        return [];
      }
      
      // Transform results to match expected format
      return result.results.map(movie => ({
        movieId: movie.movieId,
        title: movie.title,
        similarity: 0.75, // Default similarity score
        year: movie.year,
        genres: movie.genres ? JSON.parse(movie.genres) : [],
        rating: movie.rating || 0,
        poster: movie.poster,
        overview: movie.overview || '',
        runtime: movie.runtime,
        voteCount: movie.voteCount || 0,
        confidence: 60 // Default confidence
      }));
      
    } catch (error) {
      console.error('Database fallback error:', error);
      return [];
    }
  }

  /**
   * Fallback to database search when vector search fails
   */
  async fallbackToDatabaseSearch(filters) {
    try {
      let query = `
        SELECT 
          id as movieId,
          title,
          release_year as year,
          genres,
          rating,
          poster_url as poster,
          overview,
          runtime,
          vote_count as voteCount
        FROM movie_cache
        WHERE 1=1
      `;
      
      const bindings = [];
      
      // Apply filters to SQL query
      if (filters.minRating) {
        query += ' AND rating >= ?';
        bindings.push(filters.minRating);
      }
      
      if (filters.maxRuntime) {
        query += ' AND runtime <= ?';
        bindings.push(filters.maxRuntime);
      }
      
      if (filters.minYear) {
        query += ' AND release_year >= ?';
        bindings.push(filters.minYear);
      }
      
      // Order by rating and vote count for quality
      query += ' ORDER BY rating DESC, vote_count DESC LIMIT 20';
      
      const stmt = this.db.prepare(query);
      const results = await stmt.bind(...bindings).all();
      
      if (results.results) {
        return results.results.map(movie => ({
          ...movie,
          similarity: 0.7, // Default similarity for fallback
          confidence: 70,
          genres: JSON.parse(movie.genres || '[]')
        }));
      }
      
      return [];
      
    } catch (error) {
      console.error('Database fallback search failed:', error);
      return [];
    }
  }

  /**
   * Generate cache key for vector search
   */
  generateCacheKey(queryOrVector, filters) {
    // Handle both text queries and vectors
    let keyPrefix;
    if (typeof queryOrVector === 'string') {
      // For text queries, use a hash of the text
      keyPrefix = `text:${this.hashObject(queryOrVector)}`;
    } else if (Array.isArray(queryOrVector)) {
      // For vectors, use first 10 dimensions
      const vectorPrefix = queryOrVector.slice(0, 10).map(v => v.toFixed(3)).join(',');
      keyPrefix = `vector:${vectorPrefix}`;
    } else {
      // Fallback
      keyPrefix = 'unknown';
    }
    
    const filterHash = this.hashObject(filters);
    return `search:${keyPrefix}:${filterHash}`;
  }

  /**
   * Simple object hash for cache key generation
   */
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached search results
   */
  async getCachedResults(cacheKey) {
    if (!this.cacheKV) return null;
    
    try {
      const cached = await this.cacheKV.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    
    return null;
  }

  /**
   * Cache search results
   */
  async cacheResults(cacheKey, results, ttl = 3600) {
    if (!this.cacheKV) return;
    
    try {
      await this.cacheKV.put(
        cacheKey,
        JSON.stringify(results),
        { expirationTtl: ttl }
      );
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Search for similar movies based on a reference movie
   */
  async findSimilarMovies(movieId, limit = 10) {
    try {
      const response = await fetch(`${this.vectorizeWorkerUrl}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: movieId,
          namespace: 'movies',
          limit
        })
      });

      if (!response.ok) {
        throw new Error(`Similar movies search failed: ${response.status}`);
      }

      const results = await response.json();
      return this.processVectorResults(results);
      
    } catch (error) {
      console.error('Similar movies search error:', error);
      return [];
    }
  }

  /**
   * Get vector embedding for a movie
   */
  async getMovieVector(movieId) {
    try {
      const response = await fetch(`${this.vectorizeWorkerUrl}/vector/${movieId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to get movie vector: ${response.status}`);
      }

      const data = await response.json();
      return data.vector;
      
    } catch (error) {
      console.error('Failed to retrieve movie vector:', error);
      return null;
    }
  }
}