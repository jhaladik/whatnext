import { EnhancedProcessedMovie } from './tmdb-client-enhanced';
import { RateLimiter } from './rate-limiter';

export interface MovieEmbedding {
  id: string;
  values: number[];
  metadata: {
    tmdb_id: number;
    title: string;
    year: number | null;
    genres: string[];
    rating: number;
    runtime: number;
    language: string;
    popularity: number;
    vote_count?: number;
    keywords: string[];
    overview_snippet: string;
  };
}

export class EmbeddingService {
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private db: D1Database;
  private model = 'text-embedding-ada-002';
  private batchSize: number;

  constructor(
    apiKey: string,
    rateLimiter: RateLimiter,
    db: D1Database,
    batchSize: number = 50
  ) {
    this.apiKey = apiKey;
    this.rateLimiter = rateLimiter;
    this.db = db;
    this.batchSize = batchSize;
  }

  async generateEmbeddings(movies: EnhancedProcessedMovie[]): Promise<MovieEmbedding[]> {
    const embeddings: MovieEmbedding[] = [];
    
    // Process in smaller batches
    for (let i = 0; i < movies.length; i += this.batchSize) {
      const batch = movies.slice(i, i + this.batchSize);
      console.log(`[Embeddings] Processing batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(movies.length/this.batchSize)}`);
      
      const batchEmbeddings = await this.processBatch(batch);
      embeddings.push(...batchEmbeddings);
      
      // Update progress in database
      for (const movie of batch) {
        await this.updateMovieStatus(movie.tmdb_id, 'embedding_generated');
      }
    }
    
    return embeddings;
  }

  private async processBatch(movies: EnhancedProcessedMovie[]): Promise<MovieEmbedding[]> {
    return this.rateLimiter.execute(async () => {
      try {
        const texts = movies.map(movie => this.createEmbeddingText(movie));
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            input: texts
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        
        // Log token usage
        await this.logTokenUsage(data.usage?.total_tokens || 0);
        
        // Create embeddings with metadata (no poster data - fetched separately)
        return movies.map((movie, index) => ({
          id: `movie_${movie.tmdb_id}`,
          values: data.data[index].embedding,
          metadata: {
            tmdb_id: movie.tmdb_id,
            title: movie.title,
            year: movie.year,
            genres: movie.genres.map(g => g.name),
            rating: movie.vote_average,
            runtime: movie.runtime,
            language: movie.original_language,
            popularity: movie.popularity,
            vote_count: movie.vote_count,
            keywords: movie.keywords.slice(0, 10).map(k => k.name),
            overview_snippet: movie.overview.slice(0, 200)
          }
        }));
        
      } catch (error) {
        console.error('[Embeddings] Batch processing failed:', error);
        // Mark movies as failed
        for (const movie of movies) {
          await this.updateMovieStatus(movie.tmdb_id, 'embedding_failed', error.message);
        }
        return [];
      }
    });
  }

  private createEmbeddingText(movie: EnhancedProcessedMovie): string {
    const year = movie.year || 'Unknown';
    const genres = movie.genres.map(g => g.name).join(', ') || 'Unknown';
    const keywords = movie.keywords.slice(0, 15).map(k => k.name).join(', ');
    const countries = movie.production_countries.map(c => c.name).join(', ');
    
    // Create rich text representation for embedding
    const text = `
Title: ${movie.title}
Year: ${year}
Genres: ${genres}
Runtime: ${movie.runtime} minutes
Rating: ${movie.vote_average}/10 (${movie.vote_count} votes)
Language: ${movie.original_language}
Countries: ${countries}
Plot: ${movie.overview}
Keywords: ${keywords}
Popularity Score: ${movie.popularity}
    `.trim();
    
    return text;
  }

  async generateSingleEmbedding(text: string): Promise<number[]> {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            input: text
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        await this.logTokenUsage(data.usage?.total_tokens || 0);
        
        return data.data[0].embedding;
        
      } catch (error) {
        console.error('[Embeddings] Single embedding failed:', error);
        throw error;
      }
    });
  }

  private async updateMovieStatus(tmdbId: number, status: string, error?: string) {
    const query = error
      ? `UPDATE movies SET processing_status = ?, last_error = ?, updated_at = datetime('now') WHERE tmdb_id = ?`
      : `UPDATE movies SET processing_status = ?, updated_at = datetime('now') WHERE tmdb_id = ?`;
    
    const params = error ? [status, error, tmdbId] : [status, tmdbId];
    
    await this.db.prepare(query).bind(...params).run();
  }

  private async logTokenUsage(tokens: number) {
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .prepare(`
        INSERT INTO daily_metrics (date, openai_tokens, openai_requests) 
        VALUES (?, ?, 1)
        ON CONFLICT(date) DO UPDATE SET 
        openai_tokens = openai_tokens + ?,
        openai_requests = openai_requests + 1
      `)
      .bind(today, tokens, tokens)
      .run();
  }
}