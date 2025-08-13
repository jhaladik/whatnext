// src/services/enrichmentService.js
// Content enrichment orchestration service

import { TMDBService } from './tmdbService.js';

export class EnrichmentService {
  constructor(env) {
    this.env = env;
    this.tmdb = new TMDBService(env);
    // Future services can be added here
    // this.goodreads = new GoodreadsService(env);
    // this.yelp = new YelpService(env);
  }

  async enrichRecommendations(domain, recommendations) {
    if (!recommendations || !Array.isArray(recommendations)) {
      return recommendations;
    }

    try {
      switch(domain) {
        case 'movies':
          return await this.tmdb.enrichMovies(recommendations);
        
        case 'series':
          return await this.tmdb.enrichSeries(recommendations);
        
        case 'documentaries':
          return await this.tmdb.enrichDocumentaries(recommendations);
        
        case 'books':
          // Future: Goodreads enrichment
          return await this.enrichBooks(recommendations);
        
        case 'restaurants':
          // Future: Yelp enrichment
          return await this.enrichRestaurants(recommendations);
        
        case 'general':
        default:
          // No enrichment for general content
          return recommendations;
      }
    } catch (error) {
      console.error(`Error enriching ${domain} recommendations:`, error);
      return recommendations;
    }
  }

  async enrichBooks(recommendations) {
    // Placeholder for future Goodreads integration
    console.log('Book enrichment not yet implemented');
    return recommendations.map(book => ({
      ...book,
      enrichment_note: 'Goodreads integration coming soon'
    }));
  }

  async enrichRestaurants(recommendations) {
    // Placeholder for future Yelp integration
    console.log('Restaurant enrichment not yet implemented');
    return recommendations.map(restaurant => ({
      ...restaurant,
      enrichment_note: 'Yelp integration coming soon'
    }));
  }

  async getCachedContent(domain, contentId) {
    try {
      const cacheKey = `content:${domain}:${contentId}`;
      const cached = await this.env.RECOMMENDATION_CACHE.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached content:', error);
      return null;
    }
  }

  async cacheContent(domain, contentId, content, ttl = 86400) {
    try {
      const cacheKey = `content:${domain}:${contentId}`;
      await this.env.RECOMMENDATION_CACHE.put(
        cacheKey,
        JSON.stringify(content),
        { expirationTtl: ttl }
      );
    } catch (error) {
      console.error('Error caching content:', error);
    }
  }

  async getTrendingContent(domain) {
    try {
      switch(domain) {
        case 'movies':
          const trending = await this.tmdb.getTrending('movie', 'week');
          return trending.slice(0, 5).map(movie => ({
            title: movie.title || movie.name,
            year: new Date(movie.release_date || movie.first_air_date).getFullYear(),
            type: movie.media_type || 'movie',
            tmdb_id: movie.id,
            poster_url: movie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            overview: movie.overview,
            vote_average: movie.vote_average
          }));
        
        case 'books':
          // Future: Get trending books
          return [];
        
        case 'restaurants':
          // Future: Get trending restaurants
          return [];
        
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting trending ${domain} content:`, error);
      return [];
    }
  }

  formatEnrichedContent(domain, content) {
    switch(domain) {
      case 'movies':
        return this.formatMovieContent(content);
      case 'books':
        return this.formatBookContent(content);
      case 'restaurants':
        return this.formatRestaurantContent(content);
      default:
        return content;
    }
  }

  formatMovieContent(movie) {
    const formatted = {
      title: movie.title,
      year: movie.year,
      type: movie.type || 'movie',
      genre: movie.genre || (movie.genres ? movie.genres[0] : 'Unknown'),
      reason: movie.reason || 'Matches your preferences',
      runtime: movie.runtime ? `${movie.runtime} min` : movie.runtime,
      rating: movie.rating || 'Not Rated'
    };

    // Add streaming availability
    if (movie.streaming?.available_on?.length > 0) {
      formatted.where_to_watch = movie.streaming.available_on.join(', ');
    } else if (movie.where_to_watch) {
      formatted.where_to_watch = movie.where_to_watch;
    } else {
      formatted.where_to_watch = 'Check streaming services';
    }

    // Add enriched data if available
    if (movie.poster_url) {
      formatted.poster_url = movie.poster_url;
    }
    if (movie.vote_average) {
      formatted.user_rating = `${movie.vote_average}/10`;
    }
    if (movie.overview) {
      formatted.description = movie.overview;
    }
    if (movie.trailer_url) {
      formatted.trailer_url = movie.trailer_url;
    }

    return formatted;
  }

  formatBookContent(book) {
    // Placeholder for book formatting
    return {
      title: book.title,
      author: book.author || 'Unknown Author',
      genre: book.genre || 'Fiction',
      reason: book.reason || 'Matches your reading preferences',
      pages: book.pages || 'Unknown',
      published: book.year || 'Unknown'
    };
  }

  formatRestaurantContent(restaurant) {
    // Placeholder for restaurant formatting
    return {
      name: restaurant.name,
      cuisine: restaurant.cuisine || 'Various',
      price_range: restaurant.price_range || '$$',
      reason: restaurant.reason || 'Matches your dining preferences',
      location: restaurant.location || 'Unknown',
      rating: restaurant.rating || 'Not Rated'
    };
  }
}