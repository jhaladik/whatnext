// src/services/domainService.js
export class DomainService {
  constructor(env) {
    this.db = env.DB;
    this.questionsKV = env.MOVIE_QUESTIONS;
  }

  /**
   * Get available content domains
   */
  async getAvailableDomains() {
    // For now, hardcoded. Could be loaded from DB
    return [
      {
        id: 'movies',
        name: 'Movies',
        description: 'Feature films and cinema',
        icon: '🎬',
        questionCount: 5,
        avgCompletionTime: 30,
        isActive: true,
        vectorServiceAvailable: true
      },
      {
        id: 'tv-series',
        name: 'TV Series',
        description: 'Television shows and streaming series',
        icon: '📺',
        questionCount: 5,
        avgCompletionTime: 35,
        isActive: true,
        vectorServiceAvailable: false // Coming soon
      },
      {
        id: 'documentaries',
        name: 'Documentaries',
        description: 'Non-fiction and educational content',
        icon: '🎥',
        questionCount: 5,
        avgCompletionTime: 30,
        isActive: true,
        vectorServiceAvailable: false // Coming soon
      },
      {
        id: 'kids',
        name: 'Kids Content',
        description: 'Family-friendly movies and shows',
        icon: '🧸',
        questionCount: 4,
        avgCompletionTime: 25,
        isActive: false, // Coming soon
        vectorServiceAvailable: false
      }
    ];
  }

  /**
   * Get domain configuration
   */
  async getDomainConfig(domainId) {
    try {
      // Try to load from database
      const stmt = this.db.prepare(`
        SELECT * FROM domains WHERE id = ?
      `);
      
      const result = await stmt.bind(domainId).first();
      
      if (result) {
        return {
          id: result.id,
          name: result.name,
          questionSet: JSON.parse(result.question_set || '[]'),
          vectorServiceUrl: result.vector_service_url,
          enrichmentConfig: JSON.parse(result.enrichment_config || '{}'),
          isActive: result.is_active
        };
      }
      
      // Fallback to default config
      return this.getDefaultDomainConfig(domainId);
      
    } catch (error) {
      console.error('Failed to load domain config:', error);
      return this.getDefaultDomainConfig(domainId);
    }
  }

  /**
   * Get default domain configuration
   */
  getDefaultDomainConfig(domainId) {
    const configs = {
      movies: {
        id: 'movies',
        name: 'Movies',
        questionSet: ['cognitive_load', 'emotional_tone', 'personal_context', 'attention_level', 'discovery_mode'],
        vectorServiceUrl: null,
        enrichmentConfig: {
          tmdb: true,
          streamingProviders: true,
          cast: true,
          keywords: true
        },
        isActive: true
      },
      'tv-series': {
        id: 'tv-series',
        name: 'TV Series',
        questionSet: ['cognitive_load', 'emotional_tone', 'personal_context', 'attention_level', 'discovery_mode'],
        vectorServiceUrl: null,
        enrichmentConfig: {
          tmdb: true,
          streamingProviders: true,
          episodeInfo: true
        },
        isActive: true
      },
      documentaries: {
        id: 'documentaries',
        name: 'Documentaries',
        questionSet: ['cognitive_load', 'emotional_tone', 'personal_context', 'attention_level', 'discovery_mode'],
        vectorServiceUrl: null,
        enrichmentConfig: {
          tmdb: true,
          subjects: true,
          educationalValue: true
        },
        isActive: true
      }
    };
    
    return configs[domainId] || configs.movies;
  }

  /**
   * Select domain for a session
   */
  async selectDomain(sessionId, domainId) {
    // Validate domain exists and is active
    const domains = await this.getAvailableDomains();
    const domain = domains.find(d => d.id === domainId);
    
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }
    
    if (!domain.isActive) {
      throw new Error(`Domain ${domainId} is not currently available`);
    }
    
    // Store domain selection
    try {
      await this.db.prepare(`
        INSERT INTO session_domains (session_id, domain_id, selected_at)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          domain_id = excluded.domain_id,
          selected_at = excluded.selected_at
      `).bind(
        sessionId,
        domainId,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store domain selection:', error);
      // Continue anyway - not critical
    }
    
    return {
      success: true,
      domain: domainId,
      config: await this.getDomainConfig(domainId)
    };
  }

  /**
   * Get domain-specific filters
   */
  getDomainFilters(domainId) {
    const filters = {
      movies: {
        minYear: 1970,
        maxYear: new Date().getFullYear(),
        minRating: 5.0,
        excludeGenres: ['Adult']
      },
      'tv-series': {
        minYear: 1990,
        maxYear: new Date().getFullYear(),
        minRating: 6.0,
        minEpisodes: 3,
        excludeGenres: ['Adult', 'Reality-TV']
      },
      documentaries: {
        minYear: 2000,
        maxYear: new Date().getFullYear(),
        minRating: 6.5,
        includeGenres: ['Documentary']
      },
      kids: {
        minYear: 1990,
        maxYear: new Date().getFullYear(),
        minRating: 5.0,
        includeRatings: ['G', 'PG'],
        includeGenres: ['Animation', 'Family']
      }
    };
    
    return filters[domainId] || filters.movies;
  }

  /**
   * Get domain-specific recommendation count
   */
  getRecommendationCount(domainId) {
    const counts = {
      movies: 8,
      'tv-series': 6,
      documentaries: 6,
      kids: 10
    };
    
    return counts[domainId] || 8;
  }

  /**
   * Check if domain supports vector search
   */
  async isDomainVectorEnabled(domainId) {
    const config = await this.getDomainConfig(domainId);
    return !!config.vectorServiceUrl || domainId === 'movies'; // Movies always enabled
  }

  /**
   * Get domain statistics
   */
  async getDomainStats(domainId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(*) as total_interactions,
          AVG(CASE WHEN feedback_score IS NOT NULL THEN feedback_score ELSE NULL END) as avg_satisfaction
        FROM session_domains sd
        LEFT JOIN user_preferences up ON sd.session_id = up.session_id
        WHERE sd.domain_id = ?
      `);
      
      const result = await stmt.bind(domainId).first();
      
      return {
        totalSessions: result?.total_sessions || 0,
        totalInteractions: result?.total_interactions || 0,
        averageSatisfaction: result?.avg_satisfaction || 0
      };
      
    } catch (error) {
      console.error('Failed to get domain stats:', error);
      return {
        totalSessions: 0,
        totalInteractions: 0,
        averageSatisfaction: 0
      };
    }
  }

  /**
   * Store domain feedback
   */
  async storeDomainFeedback(sessionId, domainId, feedback) {
    try {
      await this.db.prepare(`
        INSERT INTO domain_feedback (
          session_id, domain_id, feedback_type, feedback_value, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        domainId,
        feedback.type,
        feedback.value,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store domain feedback:', error);
    }
  }
}