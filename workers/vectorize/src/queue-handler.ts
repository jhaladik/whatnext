// Robust Queue Handler for Cloudflare Workers
// Designed for processing large databases efficiently

import { VectorizationOrchestrator } from './lib/orchestrator';

export interface QueueConfig {
  maxBatchSize: number;
  maxExecutionTime: number; // milliseconds
  maxRetries: number;
}

export class QueueHandler {
  private db: D1Database;
  private orchestrator: VectorizationOrchestrator;
  private config: QueueConfig;

  constructor(env: Env, config?: Partial<QueueConfig>) {
    this.db = env.DB;
    this.orchestrator = new VectorizationOrchestrator(env);
    this.config = {
      maxBatchSize: config?.maxBatchSize || 5,
      maxExecutionTime: config?.maxExecutionTime || 25000, // 25 seconds to be safe
      maxRetries: config?.maxRetries || 3
    };
  }

  // Get next batch of movies to process
  async getNextBatch(limit: number = 5): Promise<number[]> {
    try {
      // Simple query first - avoid complex JOINs that might fail
      const result = await this.db
        .prepare(`
          SELECT tmdb_id 
          FROM processing_queue 
          WHERE status = 'pending'
          ORDER BY priority DESC, added_at ASC
          LIMIT ?
        `)
        .bind(limit)
        .all();

      if (!result.results || result.results.length === 0) {
        return [];
      }

      // Filter out already completed movies
      const movieIds = result.results.map(r => r.tmdb_id as number);
      const completedCheck = await this.db
        .prepare(`
          SELECT tmdb_id 
          FROM movies 
          WHERE tmdb_id IN (${movieIds.map(() => '?').join(',')})
            AND processing_status = 'completed'
        `)
        .bind(...movieIds)
        .all();

      const completedIds = new Set(completedCheck.results.map(r => r.tmdb_id as number));
      return movieIds.filter(id => !completedIds.has(id));

    } catch (error) {
      console.error('[QueueHandler] Failed to get next batch:', error);
      return [];
    }
  }

  // Process a single batch with timing constraints
  async processBatch(movieIds: number[]): Promise<{
    processed: number;
    failed: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    for (const movieId of movieIds) {
      // Check if we're approaching time limit
      if (Date.now() - startTime > this.config.maxExecutionTime) {
        console.log('[QueueHandler] Approaching time limit, stopping batch');
        break;
      }

      try {
        // Mark as processing
        await this.updateQueueStatus(movieId, 'processing');

        // Process the movie
        const result = await this.orchestrator.processNewMovies([movieId]);
        
        if (result.moviesProcessed > 0) {
          processed++;
          await this.updateQueueStatus(movieId, 'completed');
        } else {
          failed++;
          await this.updateQueueStatus(movieId, 'failed', result.errors.join('; '));
        }

      } catch (error: any) {
        console.error(`[QueueHandler] Failed to process movie ${movieId}:`, error);
        errors.push(`Movie ${movieId}: ${error.message}`);
        failed++;
        await this.updateQueueStatus(movieId, 'failed', error.message);
      }
    }

    return {
      processed,
      failed,
      errors,
      duration: Date.now() - startTime
    };
  }

  // Update queue status for a movie
  private async updateQueueStatus(
    movieId: number, 
    status: string, 
    error?: string
  ): Promise<void> {
    try {
      if (status === 'completed' || status === 'failed') {
        await this.db
          .prepare(`
            UPDATE processing_queue 
            SET status = ?, 
                processed_at = datetime('now'),
                last_error = ?
            WHERE tmdb_id = ?
          `)
          .bind(status, error || null, movieId)
          .run();
      } else {
        await this.db
          .prepare(`
            UPDATE processing_queue 
            SET status = ?
            WHERE tmdb_id = ?
          `)
          .bind(status, movieId)
          .run();
      }
    } catch (error) {
      console.error(`[QueueHandler] Failed to update status for ${movieId}:`, error);
    }
  }

  // Add movies to queue
  async addToQueue(
    movieIds: number[], 
    priority: number = 0
  ): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    // Process in smaller batches for D1
    const batchSize = 100;
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      
      try {
        // Use INSERT OR IGNORE to handle duplicates
        const statements = batch.map(id => 
          this.db.prepare(`
            INSERT OR IGNORE INTO processing_queue (tmdb_id, priority, status, added_at)
            VALUES (?, ?, 'pending', datetime('now'))
          `).bind(id, priority)
        );

        const results = await this.db.batch(statements);
        
        // Count actual insertions
        results.forEach(result => {
          if (result.meta.changes > 0) {
            added++;
          } else {
            skipped++;
          }
        });

      } catch (error) {
        console.error('[QueueHandler] Failed to add batch to queue:', error);
      }
    }

    return { added, skipped };
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const result = await this.db
        .prepare(`
          SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            COUNT(*) as total
          FROM processing_queue
        `)
        .first();

      return {
        pending: result?.pending as number || 0,
        processing: result?.processing as number || 0,
        completed: result?.completed as number || 0,
        failed: result?.failed as number || 0,
        total: result?.total as number || 0
      };

    } catch (error) {
      console.error('[QueueHandler] Failed to get stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }

  // Clear completed items from queue (cleanup)
  async cleanupQueue(): Promise<number> {
    try {
      const result = await this.db
        .prepare(`
          DELETE FROM processing_queue 
          WHERE status = 'completed' 
            AND processed_at < datetime('now', '-7 days')
        `)
        .run();

      return result.meta.changes;

    } catch (error) {
      console.error('[QueueHandler] Failed to cleanup queue:', error);
      return 0;
    }
  }

  // Reset failed items for retry
  async resetFailed(): Promise<number> {
    try {
      const result = await this.db
        .prepare(`
          UPDATE processing_queue 
          SET status = 'pending', 
              last_error = NULL
          WHERE status = 'failed'
        `)
        .run();

      return result.meta.changes;

    } catch (error) {
      console.error('[QueueHandler] Failed to reset failed items:', error);
      return 0;
    }
  }

  // Get failed items with details
  async getFailedItems(limit: number = 10): Promise<any[]> {
    try {
      const result = await this.db
        .prepare(`
          SELECT 
            q.tmdb_id,
            q.priority,
            q.added_at,
            q.processed_at,
            q.last_error,
            m.title,
            m.year
          FROM processing_queue q
          LEFT JOIN movies m ON q.tmdb_id = m.tmdb_id
          WHERE q.status = 'failed'
          ORDER BY q.processed_at DESC
          LIMIT ?
        `)
        .bind(limit)
        .all();

      return result.results;

    } catch (error) {
      console.error('[QueueHandler] Failed to get failed items:', error);
      return [];
    }
  }
}

// Endpoint handlers using the QueueHandler
export async function handleQueueProcess(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, batchSize = 5 } = body;

  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const handler = new QueueHandler(env, { maxBatchSize: batchSize });
  
  try {
    // Get next batch
    const movieIds = await handler.getNextBatch(batchSize);
    
    if (movieIds.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No pending movies in queue',
          stats: await handler.getQueueStats()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process the batch
    const result = await handler.processBatch(movieIds);
    const stats = await handler.getQueueStats();

    return new Response(
      JSON.stringify({
        message: 'Queue batch processed',
        batchSize: movieIds.length,
        result,
        stats
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Queue] Processing failed:', error);
    return new Response(
      JSON.stringify({
        error: 'Queue processing failed',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function handleQueueAdd(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, movieIds, priority = 0 } = body;

  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!movieIds || !Array.isArray(movieIds)) {
    return new Response(
      JSON.stringify({ error: 'movieIds array required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const handler = new QueueHandler(env);
  
  try {
    const result = await handler.addToQueue(movieIds, priority);
    const stats = await handler.getQueueStats();

    return new Response(
      JSON.stringify({
        message: `Added ${result.added} movies to queue`,
        added: result.added,
        skipped: result.skipped,
        stats
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to add to queue',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function handleQueueStats(
  request: Request,
  env: Env
): Promise<Response> {
  const handler = new QueueHandler(env);
  
  try {
    const stats = await handler.getQueueStats();
    const failed = await handler.getFailedItems(5);

    return new Response(
      JSON.stringify({
        stats,
        recentFailures: failed
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get queue stats',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function handleQueueReset(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json() as any;
  const { adminKey, action } = body;

  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const handler = new QueueHandler(env);
  
  try {
    let result = 0;
    let message = '';

    switch (action) {
      case 'reset_failed':
        result = await handler.resetFailed();
        message = `Reset ${result} failed items to pending`;
        break;
      
      case 'cleanup':
        result = await handler.cleanupQueue();
        message = `Removed ${result} old completed items`;
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: reset_failed or cleanup' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const stats = await handler.getQueueStats();

    return new Response(
      JSON.stringify({
        message,
        changes: result,
        stats
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Queue operation failed',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}