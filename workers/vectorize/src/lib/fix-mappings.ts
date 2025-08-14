/**
 * Fix vector_id mappings in the database
 * Maps existing vectors back to their movies using the movie_{tmdb_id} format
 */

export class VectorMappingFixer {
  private db: D1Database;
  
  constructor(db: D1Database) {
    this.db = db;
  }

  async fixMappings(movieIds?: number[]): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    errors: any[];
  }> {
    console.log('[VectorMappingFixer] Starting vector mapping fix');
    
    let updated = 0;
    let failed = 0;
    const errors: any[] = [];
    const batchSize = 100;

    try {
      // If no specific movie IDs provided, get all movies without vector_id
      if (!movieIds || movieIds.length === 0) {
        console.log('[VectorMappingFixer] Fetching all movies without vector_id');
        
        const moviesWithoutVectors = await this.db
          .prepare(`
            SELECT tmdb_id 
            FROM movies 
            WHERE (vector_id IS NULL OR vector_id = '')
              AND processing_status = 'completed'
            LIMIT 5000
          `)
          .all();
        
        movieIds = moviesWithoutVectors.results.map((m: any) => m.tmdb_id);
        console.log(`[VectorMappingFixer] Found ${movieIds.length} movies to fix`);
      }

      // Process in batches
      for (let i = 0; i < movieIds.length; i += batchSize) {
        const batch = movieIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(movieIds.length / batchSize);
        
        console.log(`[VectorMappingFixer] Processing batch ${batchNum}/${totalBatches}`);
        
        try {
          // Create update statements for this batch
          const updates = batch.map(tmdbId => {
            const vectorId = `movie_${tmdbId}`;
            return this.db.prepare(`
              UPDATE movies 
              SET vector_id = ?,
                  processing_status = 'completed',
                  embedded_at = datetime('now'),
                  updated_at = datetime('now')
              WHERE tmdb_id = ?
                AND (vector_id IS NULL OR vector_id = '')
            `).bind(vectorId, tmdbId);
          });
          
          // Execute batch update
          const results = await this.db.batch(updates);
          
          // Count successful updates
          const batchUpdated = results.filter(r => r.meta.changes > 0).length;
          updated += batchUpdated;
          
          console.log(`[VectorMappingFixer] Batch ${batchNum}: Updated ${batchUpdated} movies`);
          
        } catch (error) {
          console.error(`[VectorMappingFixer] Batch ${batchNum} failed:`, error);
          failed += batch.length;
          errors.push({
            batch: batchNum,
            movieIds: batch,
            error: error.message
          });
        }
      }

      // Verify the fix
      const verificationResult = await this.verifyFix();
      
      console.log('[VectorMappingFixer] Fix completed');
      console.log(`  Updated: ${updated} movies`);
      console.log(`  Failed: ${failed} movies`);
      console.log(`  Verification: ${verificationResult.moviesWithVectors} movies now have vector_id`);

      return {
        success: failed === 0,
        updated,
        failed,
        errors
      };

    } catch (error) {
      console.error('[VectorMappingFixer] Fix failed:', error);
      throw error;
    }
  }

  async verifyFix(): Promise<{
    totalMovies: number;
    moviesWithVectors: number;
    moviesWithoutVectors: number;
    percentageFixed: number;
  }> {
    const stats = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN vector_id IS NOT NULL AND vector_id != '' THEN 1 END) as with_vectors,
          COUNT(CASE WHEN vector_id IS NULL OR vector_id = '' THEN 1 END) as without_vectors
        FROM movies
        WHERE processing_status = 'completed'
      `)
      .first();

    const total = stats?.total as number || 0;
    const withVectors = stats?.with_vectors as number || 0;
    const withoutVectors = stats?.without_vectors as number || 0;
    const percentage = total > 0 ? (withVectors / total * 100) : 0;

    return {
      totalMovies: total,
      moviesWithVectors: withVectors,
      moviesWithoutVectors: withoutVectors,
      percentageFixed: percentage
    };
  }

  async getFixStatus(): Promise<{
    needsFix: number;
    alreadyFixed: number;
    sampleMovies: any[];
  }> {
    // Get counts
    const counts = await this.db
      .prepare(`
        SELECT 
          COUNT(CASE WHEN vector_id IS NULL OR vector_id = '' THEN 1 END) as needs_fix,
          COUNT(CASE WHEN vector_id IS NOT NULL AND vector_id != '' THEN 1 END) as already_fixed
        FROM movies
      `)
      .first();

    // Get sample of movies needing fix
    const sample = await this.db
      .prepare(`
        SELECT tmdb_id, title, year, processing_status, vector_id
        FROM movies
        WHERE vector_id IS NULL OR vector_id = ''
        LIMIT 10
      `)
      .all();

    return {
      needsFix: counts?.needs_fix as number || 0,
      alreadyFixed: counts?.already_fixed as number || 0,
      sampleMovies: sample.results
    };
  }
}