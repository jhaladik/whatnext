import { MovieEmbedding } from './embedding-service';

export class VectorizeService {
  private vectorize: VectorizeIndex;
  private db: D1Database;
  private batchSize: number;

  constructor(
    vectorize: VectorizeIndex,
    db: D1Database,
    batchSize: number = 500
  ) {
    this.vectorize = vectorize;
    this.db = db;
    this.batchSize = batchSize;
  }

  async uploadEmbeddings(embeddings: MovieEmbedding[]): Promise<number> {
    let uploaded = 0;
    const totalBatches = Math.ceil(embeddings.length / this.batchSize);
    
    for (let i = 0; i < embeddings.length; i += this.batchSize) {
      const batch = embeddings.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      
      console.log(`[Vectorize] Uploading batch ${batchNum}/${totalBatches} (${batch.length} vectors)`);
      
      try {
        // Upload to Vectorize
        await this.vectorize.upsert(batch);
        uploaded += batch.length;
        
        // Update database records
        await this.updateMovieRecords(batch);
        
        console.log(`[Vectorize] Successfully uploaded ${uploaded}/${embeddings.length} vectors`);
        
        // No delay between batches - Workers don't support setTimeout
        
      } catch (error) {
        console.error(`[Vectorize] Failed to upload batch ${batchNum}:`, error);
        
        // Try with smaller batches
        if (batch.length > 50) {
          console.log('[Vectorize] Retrying with smaller batch size');
          const smallerBatches = await this.uploadInSmallerBatches(batch, 50);
          uploaded += smallerBatches;
        } else {
          // Mark as failed
          await this.markBatchFailed(batch, error.message);
        }
      }
    }
    
    // Log metrics
    await this.logUploadMetrics(uploaded);
    
    return uploaded;
  }

  private async uploadInSmallerBatches(
    failedBatch: MovieEmbedding[],
    smallerSize: number
  ): Promise<number> {
    let uploaded = 0;
    
    for (let i = 0; i < failedBatch.length; i += smallerSize) {
      const smallBatch = failedBatch.slice(i, i + smallerSize);
      
      try {
        await this.vectorize.upsert(smallBatch);
        await this.updateMovieRecords(smallBatch);
        uploaded += smallBatch.length;
        // No delay - Workers don't support setTimeout
      } catch (error) {
        console.error('[Vectorize] Small batch failed:', error);
        await this.markBatchFailed(smallBatch, error.message);
      }
    }
    
    return uploaded;
  }

  private async updateMovieRecords(embeddings: MovieEmbedding[]) {
    const updates = embeddings.map(embedding => 
      this.db.prepare(`
        UPDATE movies 
        SET vector_id = ?, 
            processing_status = 'completed',
            embedded_at = datetime('now'),
            updated_at = datetime('now')
        WHERE tmdb_id = ?
      `).bind(embedding.id, embedding.metadata.tmdb_id)
    );
    
    await this.db.batch(updates);
  }

  private async markBatchFailed(batch: MovieEmbedding[], error: string) {
    const updates = batch.map(embedding =>
      this.db.prepare(`
        UPDATE movies 
        SET processing_status = 'failed',
            last_error = ?,
            updated_at = datetime('now')
        WHERE tmdb_id = ?
      `).bind(error, embedding.metadata.tmdb_id)
    );
    
    await this.db.batch(updates);
  }

  async queryVectors(
    vector: number[],
    topK: number = 10,
    filter?: Record<string, any>
  ): Promise<VectorizeMatches> {
    try {
      // Ensure vector is a proper array
      const vectorArray = Array.from(vector);
      
      // Use the working format for Cloudflare Vectorize
      return await this.vectorize.query(vectorArray, {
        topK: topK,
        returnMetadata: true,
        filter: filter
      });
      
    } catch (error) {
      console.error('[Vectorize] Query failed:', error);
      throw error;
    }
  }

  async getVectorById(vectorId: string): Promise<VectorizeVector | null> {
    try {
      const results = await this.vectorize.getByIds([vectorId]);
      return results && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`[Vectorize] Failed to get vector ${vectorId}:`, error);
      return null;
    }
  }

  async deleteVectors(vectorIds: string[]): Promise<void> {
    try {
      await this.vectorize.deleteByIds(vectorIds);
      
      // Update database
      const updates = vectorIds.map(id => {
        const tmdbId = parseInt(id.replace('movie_', ''));
        return this.db.prepare(`
          UPDATE movies 
          SET vector_id = NULL,
              processing_status = 'pending',
              embedded_at = NULL
          WHERE tmdb_id = ?
        `).bind(tmdbId);
      });
      
      await this.db.batch(updates);
      
    } catch (error) {
      console.error('[Vectorize] Delete failed:', error);
      throw error;
    }
  }

  private async logUploadMetrics(uploaded: number) {
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .prepare(`
        INSERT INTO daily_metrics (date, vectors_uploaded) 
        VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET 
        vectors_uploaded = vectors_uploaded + ?
      `)
      .bind(today, uploaded, uploaded)
      .run();
  }

  // Removed delay function - setTimeout doesn't work in Cloudflare Workers

  async getStats(): Promise<{
    totalVectors: number;
    completedMovies: number;
    failedMovies: number;
    pendingMovies: number;
  }> {
    const stats = await this.db
      .prepare(`
        SELECT 
          COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending,
          COUNT(*) as total
        FROM movies
      `)
      .first();
    
    return {
      totalVectors: stats.completed as number || 0,
      completedMovies: stats.completed as number || 0,
      failedMovies: stats.failed as number || 0,
      pendingMovies: stats.pending as number || 0
    };
  }
}