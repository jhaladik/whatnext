import { VectorizeService } from './vectorize-service';
import { EmbeddingService } from './embedding-service';

export interface MovieRecommendation {
  tmdb_id: number;
  title: string;
  year: number | null;
  genres: string[];
  rating: number;
  runtime: number;
  similarity: number;
  reason?: string;
}

export interface UserPreferences {
  loved?: string[];
  liked?: string[];
  disliked?: string[];
  genres?: string[];
  minYear?: number;
  maxRuntime?: number;
  minRating?: number;
  languages?: string[];
}

export class RecommendationService {
  private vectorize: VectorizeService;
  private embedding: EmbeddingService;
  private db: D1Database;

  constructor(
    vectorize: VectorizeService,
    embedding: EmbeddingService,
    db: D1Database
  ) {
    this.vectorize = vectorize;
    this.embedding = embedding;
    this.db = db;
  }

  async getRecommendations(
    preferences: UserPreferences,
    topK: number = 10
  ): Promise<MovieRecommendation[]> {
    try {
      // Build user preference vector
      const userVector = await this.buildUserVector(preferences);
      
      if (!userVector) {
        // Fallback to genre-based recommendations
        return this.getGenreBasedRecommendations(preferences, topK);
      }

      
      // Build filter constraints
      const filter = this.buildFilter(preferences);
      
      // Query similar movies
      const results = await this.vectorize.queryVectors(
        userVector,
        Math.min(topK * 2, 30), // Get more candidates for filtering
        filter
      );

      // Process and rank results
      const recommendations = results.matches
        .filter(match => match.score > 0.7) // Similarity threshold
        .map(match => ({
          tmdb_id: match.metadata.tmdb_id as number,
          title: match.metadata.title as string,
          year: match.metadata.year as number | null,
          genres: match.metadata.genres as string[],
          rating: match.metadata.rating as number,
          runtime: match.metadata.runtime as number,
          similarity: match.score
        }))
        .slice(0, topK);

      // Log for feedback tracking
      await this.logRecommendations(recommendations);

      return recommendations;

    } catch (error) {
      console.error('[Recommendations] Failed to get recommendations:', error);
      throw error;
    }
  }

  private async buildUserVector(preferences: UserPreferences): Promise<number[] | null> {
    const vectors: number[][] = [];
    const weights: number[] = [];

    // Process loved movies (highest weight)
    if (preferences.loved && preferences.loved.length > 0) {
      for (const title of preferences.loved.slice(0, 5)) { // Limit to top 5
        const vector = await this.getMovieVectorByTitle(title);
        if (vector) {
          vectors.push(vector);
          weights.push(1.0);
        }
      }
    }

    // Process liked movies (medium weight)
    if (preferences.liked && preferences.liked.length > 0) {
      for (const title of preferences.liked.slice(0, 5)) {
        const vector = await this.getMovieVectorByTitle(title);
        if (vector) {
          vectors.push(vector);
          weights.push(0.6);
        }
      }
    }

    // Process disliked movies (negative weight)
    if (preferences.disliked && preferences.disliked.length > 0) {
      for (const title of preferences.disliked.slice(0, 3)) {
        const vector = await this.getMovieVectorByTitle(title);
        if (vector) {
          vectors.push(vector);
          weights.push(-0.5);
        }
      }
    }

    if (vectors.length === 0) {
      return null;
    }

    // Compute weighted average
    return this.computeWeightedAverage(vectors, weights);
  }

  private async getMovieVectorByTitle(title: string): Promise<number[] | null> {
    try {
      // First, try to find the movie in our database
      const movie = await this.db
        .prepare(`
          SELECT vector_id, tmdb_id, title as db_title
          FROM movies 
          WHERE LOWER(title) = LOWER(?) 
            AND vector_id IS NOT NULL
          LIMIT 1
        `)
        .bind(title)
        .first();

      if (movie && movie.vector_id) {
        // Get vector from Vectorize
        const vector = await this.vectorize.getVectorById(movie.vector_id as string);
        
        if (vector) {
          // Track this as user feedback
          await this.trackFeedback(movie.tmdb_id as number, 'queried');
          return vector.values;
        }
      }

      // If not found, generate embedding for the title
      const embedding = await this.embedding.generateSingleEmbedding(`Movie: ${title}`);
      return embedding;

    } catch (error) {
      console.error(`[Recommendations] Failed to get vector for "${title}":`, error);
      return null;
    }
  }

  private computeWeightedAverage(vectors: number[][], weights: number[]): number[] {
    const dimensions = vectors[0].length;
    const result = new Array(dimensions).fill(0);
    let totalWeight = 0;

    for (let i = 0; i < vectors.length; i++) {
      const weight = Math.abs(weights[i]);
      totalWeight += weight;
      
      for (let j = 0; j < dimensions; j++) {
        result[j] += vectors[i][j] * weights[i];
      }
    }

    // Normalize
    if (totalWeight > 0) {
      for (let j = 0; j < dimensions; j++) {
        result[j] /= totalWeight;
      }
    }

    return result;
  }

  private buildFilter(preferences: UserPreferences): Record<string, any> {
    const filter: Record<string, any> = {};

    if (preferences.minYear) {
      filter.year = { $gte: preferences.minYear };
    }

    if (preferences.maxRuntime) {
      filter.runtime = { $lte: preferences.maxRuntime };
    }

    if (preferences.minRating) {
      filter.rating = { $gte: preferences.minRating };
    }

    if (preferences.languages && preferences.languages.length > 0) {
      filter.language = { $in: preferences.languages };
    }

    return filter;
  }

  private async getGenreBasedRecommendations(
    preferences: UserPreferences,
    topK: number
  ): Promise<MovieRecommendation[]> {
    // Fallback to database query when vectors aren't available
    let query = `
      SELECT tmdb_id, title, year, genres, vote_average as rating, 
             runtime, popularity
      FROM movies
      WHERE processing_status = 'completed'
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (preferences.genres && preferences.genres.length > 0) {
      // Check if any preferred genre is in the movie's genres
      const genreConditions = preferences.genres.map(() => 
        `json_extract(genres, '$') LIKE ?`
      ).join(' OR ');
      conditions.push(`(${genreConditions})`);
      preferences.genres.forEach(genre => params.push(`%"${genre}"%`));
    }

    if (preferences.minYear) {
      conditions.push('year >= ?');
      params.push(preferences.minYear);
    }

    if (preferences.maxRuntime) {
      conditions.push('runtime <= ?');
      params.push(preferences.maxRuntime);
    }

    if (preferences.minRating) {
      conditions.push('vote_average >= ?');
      params.push(preferences.minRating);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY popularity DESC, vote_average DESC LIMIT ?';
    params.push(topK);

    const results = await this.db.prepare(query).bind(...params).all();

    return results.results.map(movie => ({
      tmdb_id: movie.tmdb_id as number,
      title: movie.title as string,
      year: movie.year as number | null,
      genres: JSON.parse(movie.genres as string).map((g: any) => g.name),
      rating: movie.rating as number,
      runtime: movie.runtime as number,
      similarity: 0.5 // Default similarity for non-vector results
    }));
  }

  async searchMovies(query: string, limit: number = 10): Promise<{ movies: any[], embedding: number[] }> {
    try {
      // Generate embedding for search query
      const queryVector = await this.embedding.generateSingleEmbedding(query);
      
      // Search in vector database
      const results = await this.vectorize.queryVectors(queryVector, limit);
      
      const movies = results.matches.map(match => ({
        tmdb_id: match.metadata.tmdb_id,
        title: match.metadata.title,
        year: match.metadata.year,
        genres: match.metadata.genres,
        rating: match.metadata.rating,
        similarity: match.score,
        overview: match.metadata.overview_snippet,
        runtime: match.metadata.runtime,
        vote_count: match.metadata.vote_count,
        popularity: match.metadata.popularity,
        poster_path: match.metadata.poster_path,
        backdrop_path: match.metadata.backdrop_path,
        release_date: match.metadata.release_date
      }));

      // Return both movies and the embedding used for search
      return {
        movies,
        embedding: queryVector
      };

    } catch (error) {
      console.error('[Recommendations] Search failed:', error);
      
      // Fallback to text search in database
      const results = await this.db
        .prepare(`
          SELECT tmdb_id, title, year, genres, vote_average as rating, 
                 substr(overview, 1, 200) as overview
          FROM movies
          WHERE title LIKE ? OR overview LIKE ?
          ORDER BY popularity DESC
          LIMIT ?
        `)
        .bind(`%${query}%`, `%${query}%`, limit)
        .all();

      return results.results.map(movie => ({
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        genres: JSON.parse(movie.genres as string).map((g: any) => g.name),
        rating: movie.rating,
        similarity: 0,
        overview: movie.overview
      }));
    }
  }

  private async trackFeedback(tmdbId: number, type: string) {
    try {
      // Try to update existing record first
      const result = await this.db
        .prepare(`
          UPDATE movie_feedback 
          SET count = count + 1, last_feedback_at = datetime('now')
          WHERE tmdb_id = ? AND feedback_type = ?
        `)
        .bind(tmdbId, type)
        .run();
      
      // If no rows were updated, insert new record
      if (result.meta.changes === 0) {
        await this.db
          .prepare(`
            INSERT INTO movie_feedback (tmdb_id, feedback_type, count)
            VALUES (?, ?, 1)
          `)
          .bind(tmdbId, type)
          .run();
      }
    } catch (error) {
      // Silently ignore feedback tracking errors
    }
  }

  private async logRecommendations(recommendations: MovieRecommendation[]) {
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .prepare(`
        INSERT INTO daily_metrics (date, movies_processed)
        VALUES (?, 0)
        ON CONFLICT(date) DO UPDATE SET
        movies_processed = movies_processed
      `)
      .bind(today)
      .run();
  }
}