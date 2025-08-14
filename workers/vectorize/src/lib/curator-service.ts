/**
 * Database Curator Service
 * Based on existing curation strategy and scripts
 */

import { EnhancedTMDBClient } from './tmdb-client-enhanced';

export interface CurationDecision {
  action: 'accept' | 'reject' | 'queue' | 'duplicate';
  reason: string;
  score?: number;
  metadata?: any;
}

export interface CurationCriteria {
  minVotes: number;
  minRating: number;
  minAge: number;
  culturalBoost: boolean;
}

export interface CurationStats {
  totalEvaluated: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  averageScore: number;
  bySource: Record<string, number>;
  byReason: Record<string, number>;
}

export class CuratorService {
  private db: D1Database;
  private tmdbClient?: EnhancedTMDBClient;

  // Era-specific criteria from curation_strategy.md
  private readonly eraCriteria: Record<string, CurationCriteria> = {
    'pre-1970': { minVotes: 500, minRating: 7.0, minAge: 0, culturalBoost: true },
    '1970-1989': { minVotes: 1000, minRating: 7.0, minAge: 0, culturalBoost: true },
    '1990-1999': { minVotes: 5000, minRating: 7.0, minAge: 0, culturalBoost: true },
    '2000-2015': { minVotes: 10000, minRating: 7.2, minAge: 0, culturalBoost: false },
    '2016-2022': { minVotes: 20000, minRating: 7.5, minAge: 2, culturalBoost: false },
    '2023+': { minVotes: 50000, minRating: 8.0, minAge: 2, culturalBoost: false }
  };

  // Quality thresholds from existing scripts
  private readonly qualityThresholds = {
    minOverallScore: 60,
    duplicateSimilarity: 0.85,
    minRuntime: 60, // From tmdb-client-enhanced
    maxDailyAdditions: 50
  };

  constructor(db: D1Database, tmdbClient?: EnhancedTMDBClient) {
    this.db = db;
    this.tmdbClient = tmdbClient;
  }

  /**
   * Evaluate a movie for inclusion based on curation strategy
   */
  async evaluateMovie(movieData: any, source: string = 'unknown'): Promise<CurationDecision> {
    try {
      // Log the evaluation attempt
      await this.logCuration(movieData.id, 'evaluated', source, 'Starting evaluation');

      // Step 1: Check if already exists
      const exists = await this.checkMovieExists(movieData.id);
      if (exists) {
        return {
          action: 'duplicate',
          reason: 'Movie already in database',
          metadata: { tmdb_id: movieData.id }
        };
      }

      // Step 2: Check for duplicates (remakes, similar titles)
      const duplicateCheck = await this.checkDuplicates(movieData);
      if (duplicateCheck.isDuplicate) {
        await this.logDuplicate(movieData.id, duplicateCheck.matchId!, duplicateCheck.matchType!);
        return {
          action: 'duplicate',
          reason: duplicateCheck.reason!,
          metadata: duplicateCheck
        };
      }

      // Step 3: Apply era-specific criteria
      const year = movieData.release_date ? new Date(movieData.release_date).getFullYear() : 0;
      const criteria = this.getEraCriteria(year);
      
      // Check age requirement
      const age = new Date().getFullYear() - year;
      if (age < criteria.minAge) {
        await this.logRejection(movieData, 'too_recent', source);
        return {
          action: 'reject',
          reason: `Movie too recent (${age} years old, needs ${criteria.minAge}+)`
        };
      }

      // Check vote count
      if (movieData.vote_count < criteria.minVotes) {
        await this.logRejection(movieData, 'insufficient_votes', source);
        return {
          action: 'reject',
          reason: `Insufficient votes (${movieData.vote_count} < ${criteria.minVotes})`
        };
      }

      // Check rating
      if (movieData.vote_average < criteria.minRating) {
        await this.logRejection(movieData, 'low_rating', source);
        return {
          action: 'reject',
          reason: `Rating too low (${movieData.vote_average} < ${criteria.minRating})`
        };
      }

      // Step 4: Calculate quality score
      const qualityScore = await this.calculateQualityScore(movieData, criteria);
      
      if (qualityScore < this.qualityThresholds.minOverallScore) {
        await this.logRejection(movieData, 'low_quality_score', source);
        return {
          action: 'reject',
          reason: `Quality score too low (${qualityScore.toFixed(1)} < ${this.qualityThresholds.minOverallScore})`,
          score: qualityScore
        };
      }

      // Step 5: Check genre balance
      const balanceCheck = await this.checkGenreBalance(movieData);
      if (!balanceCheck.needed) {
        return {
          action: 'queue',
          reason: balanceCheck.reason!,
          score: qualityScore,
          metadata: { priority: qualityScore }
        };
      }

      // Step 6: Accept the movie
      await this.logCuration(movieData.id, 'accepted', source, `Quality score: ${qualityScore.toFixed(1)}`);
      await this.saveQualityMetrics(movieData.id, qualityScore);
      
      return {
        action: 'accept',
        reason: `Meets all criteria with score ${qualityScore.toFixed(1)}`,
        score: qualityScore,
        metadata: {
          era: this.getEraLabel(year),
          criteria_used: criteria
        }
      };
      
    } catch (error: any) {
      console.error('[Curator] Evaluation error:', error);
      return {
        action: 'reject',
        reason: `Evaluation error: ${error.message}`
      };
    }
  }

  /**
   * Calculate quality score based on multiple factors
   */
  private async calculateQualityScore(movie: any, criteria: CurationCriteria): Promise<number> {
    let score = 0;
    const weights = {
      rating: 0.40,      // 40% weight for rating
      votes: 0.20,       // 20% weight for vote confidence
      age: 0.15,         // 15% weight for age/classic status
      cultural: 0.15,    // 15% weight for cultural significance
      genre: 0.05,       // 5% weight for genre diversity
      popularity: 0.05   // 5% weight for popularity
    };

    // Base score from rating (0-40 points)
    const ratingScore = (movie.vote_average / 10) * 100 * weights.rating;
    score += ratingScore;

    // Vote confidence score (0-20 points)
    // Using logarithmic scale: 100 votes = 2, 1000 = 3, 10000 = 4, 100000 = 5
    const voteConfidence = Math.min(1, Math.log10(movie.vote_count) / 5);
    score += voteConfidence * 100 * weights.votes;

    // Age bonus for classics (0-15 points)
    const year = new Date(movie.release_date).getFullYear();
    const age = new Date().getFullYear() - year;
    let ageScore = 0;
    if (age > 50) ageScore = 1.0;        // Pre-1975 classics
    else if (age > 30) ageScore = 0.8;   // 1975-1995 classics
    else if (age > 20) ageScore = 0.6;   // 1995-2005 modern classics
    else if (age > 10) ageScore = 0.4;   // 2005-2015 recent classics
    else ageScore = 0.2;                 // Recent films
    score += ageScore * 100 * weights.age;

    // Cultural significance boost (0-15 points)
    let culturalScore = 0;
    if (criteria.culturalBoost) {
      // Check if it's in special collections
      const isClassic = await this.checkIfClassic(movie.id);
      if (isClassic) culturalScore = 1.0;
      else if (movie.vote_count > 10000) culturalScore = 0.5; // Popular = some cultural impact
    }
    score += culturalScore * 100 * weights.cultural;

    // Genre diversity bonus (0-5 points)
    const genreScore = await this.calculateGenreDiversityScore(movie);
    score += (genreScore / 15) * 100 * weights.genre; // Normalize to 0-1 range

    // Popularity adjustment (0-5 points)
    let popularityScore = 0;
    if (movie.popularity) {
      if (movie.popularity > 100) popularityScore = 1.0;
      else if (movie.popularity > 50) popularityScore = 0.8;
      else if (movie.popularity > 20) popularityScore = 0.6;
      else if (movie.popularity > 10) popularityScore = 0.4;
      else popularityScore = 0.2;
    }
    score += popularityScore * 100 * weights.popularity;

    // Round to 1 decimal place for cleaner scores
    return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
  }

  /**
   * Check for duplicate movies
   */
  private async checkDuplicates(movie: any): Promise<{
    isDuplicate: boolean;
    matchId?: number;
    matchType?: string;
    reason?: string;
  }> {
    // Exact title + year match
    const exactMatch = await this.db
      .prepare(`
        SELECT tmdb_id, title 
        FROM movies 
        WHERE LOWER(title) = LOWER(?) 
          AND year = ?
      `)
      .bind(movie.title, new Date(movie.release_date).getFullYear())
      .first();

    if (exactMatch) {
      return {
        isDuplicate: true,
        matchId: exactMatch.tmdb_id as number,
        matchType: 'exact',
        reason: `Exact match found: ${exactMatch.title}`
      };
    }

    // Check for remakes (same title, different year)
    const remakes = await this.db
      .prepare(`
        SELECT tmdb_id, title, year 
        FROM movies 
        WHERE LOWER(title) = LOWER(?) 
          AND year != ?
      `)
      .bind(movie.title, new Date(movie.release_date).getFullYear())
      .all();

    if (remakes.results.length > 0) {
      const bestRemake = remakes.results[0];
      return {
        isDuplicate: true,
        matchId: bestRemake.tmdb_id as number,
        matchType: 'remake',
        reason: `Possible remake of "${bestRemake.title}" (${bestRemake.year})`
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Check genre balance
   */
  private async checkGenreBalance(movie: any): Promise<{
    needed: boolean;
    reason?: string;
  }> {
    // Get current genre distribution
    const genreStats = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN genres LIKE '%Drama%' THEN 1 ELSE 0 END) as drama_count,
          SUM(CASE WHEN genres LIKE '%Comedy%' THEN 1 ELSE 0 END) as comedy_count,
          SUM(CASE WHEN genres LIKE '%Action%' THEN 1 ELSE 0 END) as action_count
        FROM movies
        WHERE processing_status = 'completed'
      `)
      .first();

    const total = genreStats?.total as number || 0;
    
    // Check if we need more of this genre
    const movieGenres = movie.genre_ids || [];
    const isDrama = movieGenres.includes(18);
    const isComedy = movieGenres.includes(35);
    
    // Target percentages from curation_strategy.md
    const targets = {
      drama: 0.25,
      comedy: 0.15,
      action: 0.15
    };

    if (isDrama) {
      const dramaPercent = (genreStats?.drama_count as number || 0) / total;
      if (dramaPercent > targets.drama * 1.2) {
        return {
          needed: false,
          reason: 'Drama genre is overrepresented'
        };
      }
    }

    return { needed: true };
  }

  /**
   * Get era-specific criteria
   */
  private getEraCriteria(year: number): CurationCriteria {
    if (year < 1970) return this.eraCriteria['pre-1970'];
    if (year < 1990) return this.eraCriteria['1970-1989'];
    if (year < 2000) return this.eraCriteria['1990-1999'];
    if (year < 2016) return this.eraCriteria['2000-2015'];
    if (year < 2023) return this.eraCriteria['2016-2022'];
    return this.eraCriteria['2023+'];
  }

  private getEraLabel(year: number): string {
    if (year < 1970) return 'pre-1970';
    if (year < 1990) return '1970-1989';
    if (year < 2000) return '1990-1999';
    if (year < 2016) return '2000-2015';
    if (year < 2023) return '2016-2022';
    return '2023+';
  }

  /**
   * Check if movie exists in database
   */
  private async checkMovieExists(tmdbId: number): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT tmdb_id FROM movies WHERE tmdb_id = ?')
      .bind(tmdbId)
      .first();
    
    return result !== null;
  }

  /**
   * Check if movie is a classic
   */
  private async checkIfClassic(tmdbId: number): Promise<boolean> {
    // Check if in special collections or has awards
    // This would check against AFI 100, Criterion, Oscar winners, etc.
    // For now, simplified check
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM movie_sources ms
        JOIN source_collections sc ON ms.source_id = sc.id
        WHERE ms.movie_id = ?
          AND sc.name IN ('afi_top_100', 'criterion_collection', 'oscar_winners')
      `)
      .bind(tmdbId)
      .first();
    
    return (result?.count as number || 0) > 0;
  }

  /**
   * Calculate genre diversity score
   */
  private async calculateGenreDiversityScore(movie: any): Promise<number> {
    // Bonus for underrepresented genres
    const genreIds = movie.genre_ids || [];
    let score = 0;
    
    // Documentary (99), Animation (16), Foreign (10769)
    if (genreIds.includes(99)) score += 10; // Documentary
    if (genreIds.includes(16)) score += 5;  // Animation
    
    return score;
  }

  /**
   * Log curation decision
   */
  private async logCuration(
    tmdbId: number,
    action: string,
    source: string,
    reason: string
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO curation_log (tmdb_id, action, reason, source, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      .bind(tmdbId, action, reason, source)
      .run();
  }

  /**
   * Log rejection
   */
  private async logRejection(
    movie: any,
    reason: string,
    source: string
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO rejection_log (
          tmdb_id, title, year, rejection_reason, 
          vote_average, vote_count, popularity, runtime, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        movie.id,
        movie.title,
        new Date(movie.release_date).getFullYear(),
        reason,
        movie.vote_average,
        movie.vote_count,
        movie.popularity,
        movie.runtime || null,
        source
      )
      .run();
  }

  /**
   * Log duplicate detection
   */
  private async logDuplicate(
    tmdbId: number,
    duplicateId: number,
    matchType: string
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT OR IGNORE INTO duplicate_mappings (
          primary_tmdb_id, duplicate_tmdb_id, match_type, created_at
        )
        VALUES (?, ?, ?, datetime('now'))
      `)
      .bind(duplicateId, tmdbId, matchType)
      .run();
  }

  /**
   * Save quality metrics
   */
  private async saveQualityMetrics(
    tmdbId: number,
    overallScore: number
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT OR REPLACE INTO quality_metrics (
          tmdb_id, overall_score, calculated_at
        )
        VALUES (?, ?, datetime('now'))
      `)
      .bind(tmdbId, overallScore)
      .run();
  }

  /**
   * Get curation statistics
   */
  async getStats(days: number = 30): Promise<CurationStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const stats = await this.db
      .prepare(`
        SELECT 
          action,
          source,
          COUNT(*) as count,
          AVG(quality_score) as avg_score
        FROM curation_log
        WHERE created_at >= ?
        GROUP BY action, source
      `)
      .bind(since.toISOString())
      .all();

    const result: CurationStats = {
      totalEvaluated: 0,
      accepted: 0,
      rejected: 0,
      duplicates: 0,
      averageScore: 0,
      bySource: {},
      byReason: {}
    };

    stats.results.forEach((row: any) => {
      result.totalEvaluated += row.count;
      
      if (row.action === 'accepted') result.accepted += row.count;
      if (row.action === 'rejected') result.rejected += row.count;
      if (row.action === 'duplicate') result.duplicates += row.count;
      
      if (!result.bySource[row.source]) result.bySource[row.source] = 0;
      result.bySource[row.source] += row.count;
      
      if (row.avg_score) {
        result.averageScore = row.avg_score;
      }
    });

    return result;
  }

  /**
   * Get suggestions for what to add next
   */
  async getSuggestions(): Promise<{
    underrepresentedGenres: string[];
    missingDecades: string[];
    lowQualityToRemove: number[];
  }> {
    // Analyze genre distribution
    const genreAnalysis = await this.db
      .prepare(`
        SELECT 
          genres,
          COUNT(*) as count
        FROM movies
        WHERE processing_status = 'completed'
        GROUP BY genres
      `)
      .all();

    // Analyze decade distribution
    const decadeAnalysis = await this.db
      .prepare(`
        SELECT 
          (year / 10) * 10 as decade,
          COUNT(*) as count
        FROM movies
        WHERE processing_status = 'completed'
        GROUP BY decade
      `)
      .all();

    // Find low-quality movies to potentially remove
    const lowQuality = await this.db
      .prepare(`
        SELECT 
          m.tmdb_id
        FROM movies m
        LEFT JOIN quality_metrics qm ON m.tmdb_id = qm.tmdb_id
        WHERE m.processing_status = 'completed'
          AND (qm.overall_score < 50 OR m.vote_average < 6.5)
        LIMIT 10
      `)
      .all();

    return {
      underrepresentedGenres: ['Documentary', 'Animation'], // Simplified
      missingDecades: ['1950s', '1960s'], // Simplified
      lowQualityToRemove: lowQuality.results.map(r => r.tmdb_id as number)
    };
  }
}