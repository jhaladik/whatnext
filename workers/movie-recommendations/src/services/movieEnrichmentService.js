// src/services/movieEnrichmentService.js
export class MovieEnrichmentService {
  constructor(env) {
    this.tmdbApiKey = env.TMDB_API_KEY;
    this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p';
    this.movieCache = env.MOVIE_CACHE;
    this.db = env.DB;
  }

  /**
   * Enrich multiple movie results with TMDB data
   * @param {Array} movieResults - Array of movie results from vector search
   * @returns {Array} Enriched movie results
   */
  async enrichMovieResults(movieResults) {
    if (!Array.isArray(movieResults) || movieResults.length === 0) {
      return [];
    }

    // Since vectorize worker now returns enriched data,
    // just format it properly for the frontend
    return movieResults.map(movie => ({
      movieId: movie.movieId || movie.tmdb_id,
      title: movie.title || 'Unknown Title',
      year: movie.year || new Date().getFullYear(),
      genres: movie.genres || [],
      rating: movie.rating || 0,
      overview: movie.overview || '',
      similarity: movie.similarity || 0.5,
      runtime: movie.runtime,
      voteCount: movie.vote_count || movie.voteCount,
      popularity: movie.popularity,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      releaseDate: movie.release_date || movie.releaseDate
    }));
  }

  /**
   * Enrich a single movie with TMDB data
   */
  async enrichSingleMovie(movie) {
    try {
      // Check cache first
      const cacheKey = `movie:${movie.movieId || movie.title}`;
      const cachedMovie = await this.getCachedMovie(cacheKey);
      
      if (cachedMovie) {
        return this.mergeWithVectorResult(cachedMovie, movie);
      }

      // Search TMDB for the movie
      const tmdbData = await this.searchTMDB(movie.title, movie.year);
      
      if (!tmdbData) {
        // Return basic movie info if TMDB search fails
        return this.createBasicMovieInfo(movie);
      }

      // Get additional details in parallel
      const [movieDetails, streamingProviders] = await Promise.all([
        this.getTMDBMovieDetails(tmdbData.id),
        this.getStreamingProviders(tmdbData.id)
      ]);

      const enrichedMovie = {
        ...movie,
        tmdbId: tmdbData.id,
        title: movieDetails.title || movie.title,
        originalTitle: movieDetails.original_title,
        poster: this.getImageUrl(movieDetails.poster_path, 'w500'),
        backdrop: this.getImageUrl(movieDetails.backdrop_path, 'w1280'),
        overview: movieDetails.overview || movie.overview,
        releaseDate: movieDetails.release_date,
        runtime: movieDetails.runtime || movie.runtime,
        genres: this.extractGenres(movieDetails.genres),
        director: this.extractDirector(movieDetails.credits),
        cast: this.extractCast(movieDetails.credits),
        streamingOn: streamingProviders,
        tmdbRating: movieDetails.vote_average,
        voteCount: movieDetails.vote_count,
        popularity: movieDetails.popularity,
        language: movieDetails.original_language,
        tagline: movieDetails.tagline,
        budget: movieDetails.budget,
        revenue: movieDetails.revenue,
        productionCompanies: this.extractProductionCompanies(movieDetails.production_companies),
        keywords: this.extractKeywords(movieDetails.keywords),
        recommendationReason: this.generateRecommendationReason(movie, movieDetails)
      };

      // Cache for 24 hours
      await this.cacheMovie(cacheKey, enrichedMovie, 86400);

      return enrichedMovie;
      
    } catch (error) {
      console.error(`Failed to enrich movie ${movie.title}:`, error);
      // Return basic movie info even if enrichment fails
      return this.createBasicMovieInfo(movie);
    }
  }

  /**
   * Search TMDB for a movie
   */
  async searchTMDB(title, year) {
    if (!this.tmdbApiKey) {
      console.log('TMDB API key not configured');
      return null;
    }

    try {
      const searchUrl = `${this.tmdbBaseUrl}/search/movie`;
      const params = new URLSearchParams({
        api_key: this.tmdbApiKey,
        query: title,
        year: year || '',
        include_adult: false
      });

      const response = await fetch(`${searchUrl}?${params}`);
      
      if (!response.ok) {
        console.error(`TMDB search failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Return best match (first result)
      if (data.results && data.results.length > 0) {
        // If year is provided, try to find exact match
        if (year) {
          const exactMatch = data.results.find(movie => {
            const releaseYear = new Date(movie.release_date).getFullYear();
            return releaseYear === year;
          });
          if (exactMatch) return exactMatch;
        }
        
        return data.results[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('TMDB search error:', error);
      return null;
    }
  }

  /**
   * Get detailed movie information from TMDB
   */
  async getTMDBMovieDetails(tmdbId) {
    try {
      const detailsUrl = `${this.tmdbBaseUrl}/movie/${tmdbId}`;
      const params = new URLSearchParams({
        api_key: this.tmdbApiKey,
        append_to_response: 'credits,keywords,videos,recommendations'
      });

      const response = await fetch(`${detailsUrl}?${params}`);
      
      if (!response.ok) {
        console.error(`TMDB details fetch failed: ${response.status}`);
        return {};
      }

      return await response.json();
      
    } catch (error) {
      console.error('TMDB details error:', error);
      return {};
    }
  }

  /**
   * Get streaming provider information
   */
  async getStreamingProviders(tmdbId) {
    if (!this.tmdbApiKey) return [];

    try {
      const response = await fetch(
        `${this.tmdbBaseUrl}/movie/${tmdbId}/watch/providers?api_key=${this.tmdbApiKey}`
      );
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      // Focus on US providers (can be made configurable)
      const usProviders = data.results?.US || {};
      const providers = [];
      
      // Collect all provider types
      ['flatrate', 'rent', 'buy', 'free'].forEach(type => {
        if (usProviders[type]) {
          usProviders[type].forEach(provider => {
            if (!providers.find(p => p.provider_id === provider.provider_id)) {
              providers.push({
                id: provider.provider_id,
                name: provider.provider_name,
                logo: this.getImageUrl(provider.logo_path, 'w92'),
                type: type
              });
            }
          });
        }
      });
      
      return providers;
      
    } catch (error) {
      console.error('Failed to get streaming providers:', error);
      return [];
    }
  }

  /**
   * Get movie details by ID
   */
  async getMovieDetails(movieId) {
    // Check cache first
    const cacheKey = `movie_details:${movieId}`;
    const cached = await this.getCachedMovie(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Try to get from database
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM movie_cache WHERE id = ?
      `);
      const result = await stmt.bind(movieId).first();
      
      if (result) {
        const movieData = {
          ...result,
          genres: JSON.parse(result.genres || '[]'),
          streaming_platforms: JSON.parse(result.streaming_platforms || '[]')
        };
        
        // Cache for 1 hour
        await this.cacheMovie(cacheKey, movieData, 3600);
        return movieData;
      }
    } catch (error) {
      console.error('Database lookup failed:', error);
    }

    // If not in database, return minimal info
    return {
      movieId,
      error: 'Movie details not found'
    };
  }

  /**
   * Helper functions
   */
  
  getImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${this.imageBaseUrl}/${size}${path}`;
  }

  extractGenres(genres) {
    if (!genres || !Array.isArray(genres)) return [];
    return genres.map(g => g.name);
  }

  extractDirector(credits) {
    if (!credits || !credits.crew) return null;
    const director = credits.crew.find(person => person.job === 'Director');
    return director ? director.name : null;
  }

  extractCast(credits) {
    if (!credits || !credits.cast) return [];
    return credits.cast
      .slice(0, 5)
      .map(actor => ({
        name: actor.name,
        character: actor.character,
        photo: this.getImageUrl(actor.profile_path, 'w185')
      }));
  }

  extractProductionCompanies(companies) {
    if (!companies || !Array.isArray(companies)) return [];
    return companies
      .slice(0, 3)
      .map(company => ({
        name: company.name,
        logo: this.getImageUrl(company.logo_path, 'w92')
      }));
  }

  extractKeywords(keywordsData) {
    if (!keywordsData || !keywordsData.keywords) return [];
    return keywordsData.keywords
      .slice(0, 10)
      .map(k => k.name);
  }

  /**
   * Generate recommendation reason based on user preferences
   */
  generateRecommendationReason(movie, details) {
    const reasons = [];
    
    if (movie.confidence >= 85) {
      reasons.push('Highly matches your preferences');
    } else if (movie.confidence >= 70) {
      reasons.push('Good match for your mood');
    }
    
    if (details.vote_average >= 8) {
      reasons.push('Critically acclaimed');
    }
    
    if (details.popularity > 100) {
      reasons.push('Popular choice');
    }
    
    if (movie.genres && movie.genres.length > 0) {
      reasons.push(`${movie.genres[0]} classic`);
    }
    
    return reasons.join(' • ') || 'Recommended for you';
  }

  /**
   * Create basic movie info when enrichment fails
   */
  createBasicMovieInfo(movie) {
    return {
      ...movie,
      enrichmentStatus: 'basic',
      poster: null,
      backdrop: null,
      streamingOn: [],
      cast: [],
      director: null,
      recommendationReason: `${movie.confidence}% match`
    };
  }

  /**
   * Merge cached data with vector search result
   */
  mergeWithVectorResult(cachedMovie, vectorResult) {
    return {
      ...cachedMovie,
      similarity: vectorResult.similarity,
      confidence: vectorResult.confidence,
      searchRelevance: vectorResult.similarity
    };
  }

  /**
   * Cache operations
   */
  
  async getCachedMovie(cacheKey) {
    if (!this.movieCache) return null;
    
    try {
      const cached = await this.movieCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    
    return null;
  }

  async cacheMovie(cacheKey, movieData, ttl = 86400) {
    if (!this.movieCache) return;
    
    try {
      await this.movieCache.put(
        cacheKey,
        JSON.stringify(movieData),
        { expirationTtl: ttl }
      );
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Batch cache movies for efficiency
   */
  async batchCacheMovies(movies) {
    if (!this.movieCache || !movies || movies.length === 0) return;
    
    const cachePromises = movies.map(movie => {
      const cacheKey = `movie:${movie.tmdbId || movie.title}`;
      return this.cacheMovie(cacheKey, movie);
    });
    
    await Promise.all(cachePromises);
  }
}