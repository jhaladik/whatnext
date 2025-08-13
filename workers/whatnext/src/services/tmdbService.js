// src/services/tmdbService.js
// TMDB (The Movie Database) API integration service

export class TMDBService {
  constructor(env) {
    this.env = env;
    this.apiKey = env.TMDB_API_KEY;
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p';
    this.cache = env.RECOMMENDATION_CACHE;
  }

  async enrichMovies(recommendations) {
    if (!this.apiKey) {
      console.warn('TMDB API key not configured, returning unenriched recommendations');
      return recommendations;
    }

    try {
      const enrichedRecommendations = await Promise.all(
        recommendations.map(async (movie) => {
          try {
            // Check cache first
            const cacheKey = `tmdb:${movie.title}:${movie.year || ''}`;
            const cached = await this.cache.get(cacheKey);
            
            if (cached) {
              const cachedData = JSON.parse(cached);
              return { ...movie, ...cachedData };
            }

            // Search for the movie/show
            const searchResult = await this.searchContent(
              movie.title, 
              movie.type || 'movie',
              movie.year
            );

            if (!searchResult) {
              return movie;
            }

            // Get detailed information
            const details = await this.getContentDetails(
              searchResult.id,
              movie.type || 'movie'
            );

            // Get streaming providers
            const streamingProviders = await this.getStreamingProviders(
              searchResult.id,
              movie.type || 'movie'
            );

            // Extract cast and crew information
            const cast = details?.credits?.cast?.slice(0, 5).map(actor => ({
              name: actor.name,
              character: actor.character,
              profile_url: actor.profile_path 
                ? `${this.imageBaseUrl}/w185${actor.profile_path}`
                : null
            })) || [];
            
            const director = details?.credits?.crew?.find(
              person => person.job === 'Director'
            );
            
            const enrichedData = {
              tmdb_id: searchResult.id,
              poster_url: searchResult.poster_path 
                ? `${this.imageBaseUrl}/w500${searchResult.poster_path}`
                : null,
              backdrop_url: searchResult.backdrop_path
                ? `${this.imageBaseUrl}/w1280${searchResult.backdrop_path}`
                : null,
              overview: searchResult.overview,
              vote_average: searchResult.vote_average,
              vote_count: searchResult.vote_count,
              release_date: searchResult.release_date || searchResult.first_air_date,
              genres: details?.genres?.map(g => g.name) || [],
              runtime: details?.runtime || details?.episode_run_time?.[0] || null,
              tagline: details?.tagline || null,
              trailer_url: details?.trailer_url || null,
              streaming: streamingProviders,
              popularity: searchResult.popularity,
              cast: cast,
              director: director?.name || null,
              budget: details?.budget || null,
              revenue: details?.revenue || null,
              status: details?.status || null,
              original_language: searchResult.original_language || null,
              imdb_id: details?.imdb_id || null
            };

            // Cache the enriched data for 24 hours
            await this.cache.put(
              cacheKey,
              JSON.stringify(enrichedData),
              { expirationTtl: 86400 }
            );

            return { ...movie, ...enrichedData };
          } catch (error) {
            console.error(`Error enriching movie "${movie.title}":`, error);
            return movie;
          }
        })
      );

      return enrichedRecommendations;
    } catch (error) {
      console.error('Error enriching movies:', error);
      return recommendations;
    }
  }

  async searchContent(title, type = 'movie', year = null) {
    try {
      const endpoint = type === 'series' || type === 'tv' 
        ? '/search/tv' 
        : '/search/movie';
      
      const params = new URLSearchParams({
        api_key: this.apiKey,
        query: title,
        include_adult: 'false'
      });

      if (year) {
        params.append(type === 'series' ? 'first_air_date_year' : 'year', year);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Return the most relevant result
      if (data.results && data.results.length > 0) {
        // If year is specified, try to find exact match
        if (year) {
          const exactMatch = data.results.find(r => {
            const releaseYear = new Date(r.release_date || r.first_air_date).getFullYear();
            return releaseYear === parseInt(year);
          });
          if (exactMatch) return exactMatch;
        }
        
        // Otherwise return the most popular/relevant result
        return data.results[0];
      }

      return null;
    } catch (error) {
      console.error('Error searching TMDB:', error);
      return null;
    }
  }

  async getContentDetails(tmdbId, type = 'movie') {
    try {
      const endpoint = type === 'series' || type === 'tv' 
        ? `/tv/${tmdbId}` 
        : `/movie/${tmdbId}`;
      
      const params = new URLSearchParams({
        api_key: this.apiKey,
        append_to_response: 'videos,credits'
      });

      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract trailer URL if available
      if (data.videos && data.videos.results) {
        const trailer = data.videos.results.find(
          v => v.type === 'Trailer' && v.site === 'YouTube'
        );
        if (trailer) {
          data.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
      }

      return data;
    } catch (error) {
      console.error('Error getting content details:', error);
      return null;
    }
  }

  async getStreamingProviders(tmdbId, type = 'movie', region = 'US') {
    try {
      const endpoint = type === 'series' || type === 'tv'
        ? `/tv/${tmdbId}/watch/providers`
        : `/movie/${tmdbId}/watch/providers`;
      
      const params = new URLSearchParams({
        api_key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results[region]) {
        const providers = data.results[region];
        const streaming = {
          buy: providers.buy?.map(p => p.provider_name) || [],
          rent: providers.rent?.map(p => p.provider_name) || [],
          flatrate: providers.flatrate?.map(p => p.provider_name) || [],
          link: providers.link || null
        };
        
        // Simplify for display
        const availableOn = [];
        if (streaming.flatrate.length > 0) {
          availableOn.push(...streaming.flatrate);
        }
        if (streaming.rent.length > 0 && availableOn.length === 0) {
          availableOn.push(`Rent on ${streaming.rent[0]}`);
        }
        if (streaming.buy.length > 0 && availableOn.length === 0) {
          availableOn.push(`Buy on ${streaming.buy[0]}`);
        }
        
        return {
          available_on: availableOn,
          tmdb_link: streaming.link
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting streaming providers:', error);
      return null;
    }
  }

  async getTrending(type = 'movie', timeWindow = 'week') {
    try {
      const endpoint = `/trending/${type}/${timeWindow}`;
      
      const params = new URLSearchParams({
        api_key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error getting trending content:', error);
      return [];
    }
  }

  async getRecommendations(tmdbId, type = 'movie') {
    try {
      const endpoint = type === 'series' || type === 'tv'
        ? `/tv/${tmdbId}/recommendations`
        : `/movie/${tmdbId}/recommendations`;
      
      const params = new URLSearchParams({
        api_key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error getting TMDB recommendations:', error);
      return [];
    }
  }

  async enrichSeries(recommendations) {
    if (!this.apiKey) {
      console.warn('TMDB API key not configured, returning unenriched recommendations');
      return recommendations;
    }

    try {
      const enrichedRecommendations = await Promise.all(
        recommendations.map(async (series) => {
          try {
            // Check cache first
            const cacheKey = `tmdb:series:${series.title}:${series.year || ''}`;
            const cached = await this.cache.get(cacheKey);
            
            if (cached) {
              const cachedData = JSON.parse(cached);
              return { ...series, ...cachedData };
            }

            // Search for the series
            const searchResult = await this.searchContent(
              series.title, 
              'tv',
              series.year
            );

            if (!searchResult) {
              return series;
            }

            // Get detailed information
            const details = await this.getContentDetails(
              searchResult.id,
              'tv'
            );

            // Get streaming providers
            const streamingProviders = await this.getStreamingProviders(
              searchResult.id,
              'tv'
            );

            // Extract cast and crew information
            const cast = details?.credits?.cast?.slice(0, 5).map(actor => ({
              name: actor.name,
              character: actor.character,
              profile_url: actor.profile_path 
                ? `${this.imageBaseUrl}/w185${actor.profile_path}`
                : null
            })) || [];
            
            const creator = details?.created_by?.[0]?.name || null;
            
            const enrichedData = {
              tmdb_id: searchResult.id,
              poster_url: searchResult.poster_path 
                ? `${this.imageBaseUrl}/w500${searchResult.poster_path}`
                : null,
              backdrop_url: searchResult.backdrop_path
                ? `${this.imageBaseUrl}/w1280${searchResult.backdrop_path}`
                : null,
              overview: searchResult.overview,
              vote_average: searchResult.vote_average,
              vote_count: searchResult.vote_count,
              first_air_date: searchResult.first_air_date,
              genres: details?.genres?.map(g => g.name) || [],
              episode_run_time: details?.episode_run_time?.[0] || null,
              number_of_seasons: details?.number_of_seasons || series.seasons,
              number_of_episodes: details?.number_of_episodes || series.episodes,
              tagline: details?.tagline || null,
              trailer_url: details?.trailer_url || null,
              streaming: streamingProviders,
              popularity: searchResult.popularity,
              cast: cast,
              creator: creator,
              status: details?.status || series.status,
              original_language: searchResult.original_language || null,
              networks: details?.networks?.map(n => n.name) || [],
              type: 'series'
            };

            // Cache the enriched data for 24 hours
            await this.cache.put(
              cacheKey,
              JSON.stringify(enrichedData),
              { expirationTtl: 86400 }
            );

            return { ...series, ...enrichedData };
          } catch (error) {
            console.error(`Error enriching series "${series.title}":`, error);
            return series;
          }
        })
      );

      return enrichedRecommendations;
    } catch (error) {
      console.error('Error enriching series:', error);
      return recommendations;
    }
  }

  async enrichDocumentaries(recommendations) {
    if (!this.apiKey) {
      console.warn('TMDB API key not configured, returning unenriched recommendations');
      return recommendations;
    }

    try {
      const enrichedRecommendations = await Promise.all(
        recommendations.map(async (doc) => {
          try {
            // Check cache first
            const cacheKey = `tmdb:doc:${doc.title}:${doc.year || ''}`;
            const cached = await this.cache.get(cacheKey);
            
            if (cached) {
              const cachedData = JSON.parse(cached);
              return { ...doc, ...cachedData };
            }

            // Search for the documentary (could be movie or series)
            let searchResult = await this.searchContent(
              doc.title, 
              'movie',
              doc.year
            );

            let contentType = 'movie';
            
            // If not found as movie, try as TV series
            if (!searchResult) {
              searchResult = await this.searchContent(
                doc.title,
                'tv',
                doc.year
              );
              contentType = 'tv';
            }

            if (!searchResult) {
              return doc;
            }

            // Get detailed information
            const details = await this.getContentDetails(
              searchResult.id,
              contentType
            );

            // Get streaming providers
            const streamingProviders = await this.getStreamingProviders(
              searchResult.id,
              contentType
            );

            // Extract relevant crew for documentaries
            const director = details?.credits?.crew?.find(
              person => person.job === 'Director'
            );
            
            const enrichedData = {
              tmdb_id: searchResult.id,
              poster_url: searchResult.poster_path 
                ? `${this.imageBaseUrl}/w500${searchResult.poster_path}`
                : null,
              backdrop_url: searchResult.backdrop_path
                ? `${this.imageBaseUrl}/w1280${searchResult.backdrop_path}`
                : null,
              overview: searchResult.overview,
              vote_average: searchResult.vote_average,
              vote_count: searchResult.vote_count,
              release_date: searchResult.release_date || searchResult.first_air_date,
              genres: details?.genres?.map(g => g.name) || [],
              runtime: details?.runtime || (details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} min per episode` : doc.runtime),
              tagline: details?.tagline || null,
              trailer_url: details?.trailer_url || null,
              streaming: streamingProviders,
              popularity: searchResult.popularity,
              director: director?.name || null,
              production_companies: details?.production_companies?.map(c => c.name) || [],
              status: details?.status || null,
              original_language: searchResult.original_language || null,
              type: 'documentary'
            };

            // Add series-specific info if it's a docu-series
            if (contentType === 'tv') {
              enrichedData.number_of_seasons = details?.number_of_seasons;
              enrichedData.number_of_episodes = details?.number_of_episodes;
            }

            // Cache the enriched data for 24 hours
            await this.cache.put(
              cacheKey,
              JSON.stringify(enrichedData),
              { expirationTtl: 86400 }
            );

            return { ...doc, ...enrichedData };
          } catch (error) {
            console.error(`Error enriching documentary "${doc.title}":`, error);
            return doc;
          }
        })
      );

      return enrichedRecommendations;
    } catch (error) {
      console.error('Error enriching documentaries:', error);
      return recommendations;
    }
  }
}