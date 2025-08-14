import { RateLimiter } from './rate-limiter';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  vote_count: number;
  runtime: number;
  original_language: string;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  keywords?: { keywords: Array<{ id: number; name: string }> };
  popularity: number;
  adult: boolean;
  video: boolean;
  poster_path: string | null;
  backdrop_path: string | null;
  tagline: string;
  budget: number;
  revenue: number;
  imdb_id: string | null;
  homepage: string | null;
  spoken_languages: Array<{ iso_639_1: string; name: string }>;
  status: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      order: number;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }>;
  };
  videos?: {
    results: Array<{
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  'watch/providers'?: {
    results: {
      [countryCode: string]: {
        flatrate?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        rent?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        buy?: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }>;
        link?: string;
      };
    };
  };
}

export interface EnhancedProcessedMovie {
  // Core fields (existing)
  tmdb_id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  year: number | null;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  vote_count: number;
  runtime: number;
  original_language: string;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  keywords: Array<{ id: number; name: string }>;
  popularity: number;
  
  // New visual media fields
  poster_path: string | null;
  backdrop_path: string | null;
  trailer_key: string | null;
  
  // People fields
  cast: Array<{
    name: string;
    character: string;
    order: number;
    profile_path: string | null;
  }>;
  director: string | null;
  crew: Array<{
    name: string;
    job: string;
    department: string;
  }>;
  
  // Streaming fields
  streaming_providers: Array<{
    provider_name: string;
    provider_id: number;
    logo_path: string;
    type: 'flatrate' | 'rent' | 'buy';
  }>;
  streaming_regions: string[];
  watch_links: { [region: string]: string };
  
  // Additional metadata
  tagline: string | null;
  budget: number;
  revenue: number;
  imdb_id: string | null;
  homepage: string | null;
  spoken_languages: Array<{ iso_639_1: string; name: string }>;
  status: string;
  media_type: 'movie';
  collection_id: number | null;
  collection_name: string | null;
}

export class EnhancedTMDBClient {
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private baseUrl = 'https://api.themoviedb.org/3';
  private db: D1Database;
  private defaultRegions = ['US', 'GB', 'CA', 'AU']; // Primary English-speaking regions

  constructor(
    apiKey: string,
    rateLimiter: RateLimiter,
    db: D1Database
  ) {
    this.apiKey = apiKey;
    this.rateLimiter = rateLimiter;
    this.db = db;
  }

  async fetchEnhancedMovie(movieId: number): Promise<EnhancedProcessedMovie | null> {
    return this.rateLimiter.execute(async () => {
      try {
        // Check if we already have this movie with all data
        const existing = await this.db
          .prepare('SELECT * FROM movies WHERE tmdb_id = ? AND poster_path IS NOT NULL')
          .bind(movieId)
          .first();

        if (existing && existing.processing_status === 'completed') {
          console.log(`[TMDB] Movie ${movieId} already fully processed, skipping`);
          return null;
        }

        await this.logRequest();

        // Fetch movie with all additional data in one request
        const url = `${this.baseUrl}/movie/${movieId}`;
        const params = new URLSearchParams({
          api_key: this.apiKey,
          append_to_response: 'keywords,credits,videos,watch/providers'
        });

        const response = await fetch(`${url}?${params}`);

        if (response.status === 429) {
          console.error(`[TMDB] Rate limited on movie ${movieId}`);
          // Can't delay in Workers - just fail and retry later
          throw new Error('Rate limited by TMDB API');
        }

        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }

        const movie = await response.json() as TMDBMovie;
        return this.processEnhancedMovie(movie);

      } catch (error) {
        console.error(`[TMDB] Failed to fetch movie ${movieId}:`, error);
        await this.markFailed(movieId, error.message);
        return null;
      }
    });
  }

  private processEnhancedMovie(movie: TMDBMovie): EnhancedProcessedMovie | null {
    // Apply existing filters
    if (movie.adult || movie.video) {
      console.log(`[TMDB] Filtered ${movie.id}: adult/video content`);
      return null;
    }
    
    // Calculate movie age and year
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    // STRICT QUALITY CRITERIA FOR WHATNEXT
    // We want a curated database of films people love
    
    // Reject movies that are too new (need time to prove themselves)
    if (age < 2) {
      // Exception: Award winners or festival winners can be included
      // For now, reject all movies less than 2 years old
      console.log(`[TMDB] Filtered ${movie.id}: too recent (${year})`);
      return null;
    }
    
    // Era-specific quality thresholds
    let minVotes: number;
    let minRating: number;
    
    if (year < 1970) {
      // Classic era: Lower vote threshold but high quality
      minVotes = 500;
      minRating = 7.0;
    } else if (year < 1990) {
      // 70s-80s: Moderate requirements
      minVotes = 1000;
      minRating = 7.0;
    } else if (year < 2000) {
      // 90s: Higher vote requirement
      minVotes = 5000;
      minRating = 7.0;
    } else if (year < 2016) {
      // Modern classics: Must be well-validated
      minVotes = 10000;
      minRating = 7.2;
    } else if (year < 2023) {
      // Recent films: Must be exceptional
      minVotes = 20000;
      minRating = 7.5;
    } else {
      // 2023+: Only the very best
      minVotes = 50000;
      minRating = 8.0;
    }
    
    // Apply the filters
    if (movie.vote_count < minVotes) {
      console.log(`[TMDB] Filtered ${movie.id}: insufficient votes (${movie.vote_count} < ${minVotes})`);
      return null;
    }
    
    if (movie.vote_average < minRating) {
      console.log(`[TMDB] Filtered ${movie.id}: rating too low (${movie.vote_average} < ${minRating})`);
      return null;
    }
    
    // Runtime check (skip for very old movies)
    if (year > 1960 && (!movie.runtime || movie.runtime < 60 || movie.runtime > 240)) {
      console.log(`[TMDB] Filtered ${movie.id}: invalid runtime (${movie.runtime})`);
      return null;
    }
    
    // Calculate quality score for logging
    const qualityScore = (movie.vote_average * 10) + (Math.log10(movie.vote_count) * 5) + (age * 0.5);
    
    console.log(`[TMDB] ACCEPTED ${movie.id} - ${movie.title} (${year})`); 
    console.log(`       Rating: ${movie.vote_average}/10, Votes: ${movie.vote_count}, Quality Score: ${qualityScore.toFixed(1)}`);

    // Extract director
    const director = movie.credits?.crew.find(
      person => person.job === 'Director'
    );

    // Extract top cast (limit to 10)
    const cast = movie.credits?.cast
      .slice(0, 10)
      .map(actor => ({
        name: actor.name,
        character: actor.character,
        order: actor.order,
        profile_path: actor.profile_path
      })) || [];

    // Extract key crew members
    const crew = movie.credits?.crew
      .filter(person => 
        ['Producer', 'Writer', 'Screenplay', 'Composer', 'Cinematography']
        .includes(person.job)
      )
      .slice(0, 5)
      .map(person => ({
        name: person.name,
        job: person.job,
        department: person.department
      })) || [];

    // Find official trailer
    const trailer = movie.videos?.results.find(
      video => video.type === 'Trailer' && video.site === 'YouTube' && video.official
    ) || movie.videos?.results.find(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    );

    // Process streaming providers
    const streamingProviders: EnhancedProcessedMovie['streaming_providers'] = [];
    const streamingRegions: string[] = [];
    const watchLinks: { [region: string]: string } = {};

    if (movie['watch/providers']?.results) {
      for (const [region, providers] of Object.entries(movie['watch/providers'].results)) {
        if (this.defaultRegions.includes(region)) {
          streamingRegions.push(region);
          
          if (providers.link) {
            watchLinks[region] = providers.link;
          }

          // Add flatrate (subscription) providers
          providers.flatrate?.forEach(provider => {
            streamingProviders.push({
              provider_name: provider.provider_name,
              provider_id: provider.provider_id,
              logo_path: provider.logo_path,
              type: 'flatrate'
            });
          });

          // Optionally add rent/buy providers
          providers.rent?.slice(0, 2).forEach(provider => {
            streamingProviders.push({
              provider_name: provider.provider_name,
              provider_id: provider.provider_id,
              logo_path: provider.logo_path,
              type: 'rent'
            });
          });
        }
      }
    }

    // Remove duplicates from streaming providers
    const uniqueProviders = Array.from(
      new Map(streamingProviders.map(p => [`${p.provider_id}-${p.type}`, p])).values()
    );

    console.log(`[TMDB] Accepted ${movie.id} - ${movie.title} with enhanced data`);

    return {
      // Core fields
      tmdb_id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      overview: movie.overview || '',
      release_date: movie.release_date,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      genres: movie.genres || [],
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      runtime: movie.runtime,
      original_language: movie.original_language,
      production_countries: movie.production_countries || [],
      keywords: movie.keywords?.keywords || [],
      popularity: movie.popularity,
      
      // Visual media
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      trailer_key: trailer?.key || null,
      
      // People
      cast,
      director: director?.name || null,
      crew,
      
      // Streaming
      streaming_providers: uniqueProviders,
      streaming_regions: streamingRegions,
      watch_links: watchLinks,
      
      // Additional metadata
      tagline: movie.tagline || null,
      budget: movie.budget || 0,
      revenue: movie.revenue || 0,
      imdb_id: movie.imdb_id,
      homepage: movie.homepage,
      spoken_languages: movie.spoken_languages || [],
      status: movie.status || 'Released',
      media_type: 'movie',
      collection_id: movie.belongs_to_collection?.id || null,
      collection_name: movie.belongs_to_collection?.name || null
    };
  }

  private async logRequest() {
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .prepare(`
        INSERT INTO daily_metrics (date, tmdb_requests) 
        VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET 
        tmdb_requests = tmdb_requests + 1
      `)
      .bind(today)
      .run();
  }

  private async markFailed(movieId: number, error: string) {
    await this.db
      .prepare(`
        UPDATE movies 
        SET processing_status = 'failed', 
            last_error = ?, 
            processing_attempts = processing_attempts + 1,
            updated_at = datetime('now')
        WHERE tmdb_id = ?
      `)
      .bind(error, movieId)
      .run();
  }

  // Removed delay function - setTimeout doesn't work in Cloudflare Workers

  async getRemainingCapacity(): Promise<number> {
    return this.rateLimiter.getRemainingCapacity();
  }

  // Keep existing methods for fetching movie lists
  async fetchTopRatedMovies(page: number = 1): Promise<number[]> {
    return this.rateLimiter.execute(async () => {
      try {
        await this.logRequest();

        const url = `${this.baseUrl}/movie/top_rated`;
        const params = new URLSearchParams({
          api_key: this.apiKey,
          page: page.toString(),
          language: 'en-US'
        });

        const response = await fetch(`${url}?${params}`);
        
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results
          .filter((m: any) => !m.adult && !m.video)
          .map((m: any) => m.id);

      } catch (error) {
        console.error('[TMDB] Failed to fetch top rated movies:', error);
        return [];
      }
    });
  }
  
  async fetchTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<number[]> {
    // Note: Trending is often too recent, prefer top_rated
    return this.rateLimiter.execute(async () => {
      try {
        await this.logRequest();

        const url = `${this.baseUrl}/trending/movie/${timeWindow}`;
        const params = new URLSearchParams({
          api_key: this.apiKey
        });

        const response = await fetch(`${url}?${params}`);
        
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results
          .filter((m: any) => !m.adult && !m.video)
          .map((m: any) => m.id);

      } catch (error) {
        console.error('[TMDB] Failed to fetch trending movies:', error);
        return [];
      }
    });
  }

  async fetchPopularMovies(page: number = 1): Promise<number[]> {
    return this.rateLimiter.execute(async () => {
      try {
        await this.logRequest();

        const url = `${this.baseUrl}/movie/popular`;
        const params = new URLSearchParams({
          api_key: this.apiKey,
          page: page.toString(),
          language: 'en-US'
        });

        const response = await fetch(`${url}?${params}`);
        
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results
          .filter((m: any) => !m.adult && !m.video)
          .map((m: any) => m.id);

      } catch (error) {
        console.error('[TMDB] Failed to fetch popular movies:', error);
        return [];
      }
    });
  }
}