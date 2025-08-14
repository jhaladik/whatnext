# Understanding Cloudflare Queue Architecture

## Current Implementation (D1 SQL Queue)

We're currently using D1 database table as a queue:
```sql
CREATE TABLE processing_queue (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER,
  status TEXT,  -- 'pending', 'processing', 'completed'
  priority INTEGER,
  added_at TEXT,
  processed_at TEXT
)
```

### Limitations:
1. **30-second execution limit** - Worker must complete ALL processing within 30 seconds
2. **Synchronous processing** - Can't defer work to background
3. **No automatic retries** - Failed items need manual retry logic
4. **Complex SQL queries** - Dynamic IN clauses may fail in D1
5. **ctx.waitUntil() unreliable** - Async processing often doesn't complete

## Cloudflare Queues (Proper Solution)

Cloudflare Queues is a separate service for message queuing:

### Architecture:
```
Producer Worker → Cloudflare Queue → Consumer Worker
```

### Benefits:
1. **Separate execution contexts** - Each message gets its own 30-second window
2. **Automatic retries** - Built-in retry logic with exponential backoff
3. **Dead letter queues** - Failed messages can be sent to separate queue
4. **Batching** - Can process multiple messages in one invocation
5. **Guaranteed delivery** - Messages persist until processed

### How to Implement:

1. **Create Queue**:
```bash
npx wrangler queues create movie-processing-queue
```

2. **Update wrangler.toml**:
```toml
# Producer binding (to send messages)
[[queues.producers]]
queue = "movie-processing-queue"
binding = "MOVIE_QUEUE"

# Consumer binding (to process messages)
[[queues.consumers]]
queue = "movie-processing-queue"
max_batch_size = 10
max_batch_timeout = 30
```

3. **Producer Code** (send to queue):
```typescript
// In your main worker
await env.MOVIE_QUEUE.send({
  movieId: 238,
  priority: 10,
  action: 'process'
});
```

4. **Consumer Code** (process from queue):
```typescript
export default {
  async queue(batch: MessageBatch<MovieMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // Process movie
        await processMovie(message.body.movieId, env);
        
        // Mark as processed
        message.ack();
      } catch (error) {
        // Retry later
        message.retry();
      }
    }
  }
}
```

## Why Our Current Queue Fails

1. **The LEFT JOIN issue**: D1 might not handle complex JOINs well
2. **Dynamic SQL binding**: `WHERE tmdb_id IN (${batch.map(() => '?').join(',')})` might fail
3. **Processing time**: Even one movie takes several seconds (TMDB + OpenAI + Vectorize)
4. **No real async**: ctx.waitUntil() doesn't guarantee completion

## Immediate Fix (Without Cloudflare Queues)

1. **Simplify SQL queries** - No JOINs, no dynamic IN clauses
2. **Process one at a time** - Avoid batching
3. **Use cron triggers** - Process queue every few minutes via cron
4. **Store state in KV** - Use KV for processing state instead of D1

## Recommendation

For production, implement Cloudflare Queues:
- Reliable processing
- Automatic retries
- Better scalability
- Proper async handling

For now, simplify the D1 queue:
- Remove complex SQL
- Process one movie per request
- Use scheduled workers for batch processing