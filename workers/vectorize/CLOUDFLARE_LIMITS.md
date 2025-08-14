# Cloudflare Workers Execution Limits & Constraints

## Critical Limits to Understand

### 1. CPU Time Limits
- **Free Plan**: 10ms CPU time per request
- **Paid Plan**: 30ms CPU time per request (Bundled)
- **Paid Plan**: 30s CPU time per request (Unbound - deprecated)
- **Workers Paid**: 30s wall-clock time

**Important**: CPU time is different from wall-clock time!
- CPU time = actual computation time
- Wall-clock time = total time including I/O waits

### 2. Subrequest Limits
- **50 subrequests** per request (Free)
- **1000 subrequests** per request (Paid)
- Includes: fetch(), DB queries, KV operations, etc.

### 3. Memory Limits
- **128 MB** per Worker instance

### 4. Script Size
- **1 MB** after compression (Free)
- **10 MB** after compression (Paid)

### 5. Environment Variables
- **64 variables** maximum
- **5 KB** per variable value

## What DOESN'T Work in Workers

### ❌ No setTimeout/setInterval
```javascript
// THIS WILL FAIL
setTimeout(() => console.log('fail'), 1000); // Error!
setInterval(() => console.log('fail'), 1000); // Error!

// Alternative: Use waitUntil() for background tasks
ctx.waitUntil(doBackgroundWork());
```

### ❌ No Traditional Sleep/Delay
```javascript
// THIS WILL FAIL
await new Promise(resolve => setTimeout(resolve, 2000)); // Error!

// Alternative: Just continue processing
// Or use Durable Objects for stateful delays
```

### ❌ No Node.js APIs
- No `fs` (file system)
- No `child_process`
- No `cluster`
- No `net` modules
- Use Web APIs instead

### ❌ No Synchronous I/O
- Everything must be async
- No blocking operations

## What DOES Work

### ✅ Fetch API
```javascript
const response = await fetch('https://api.example.com');
```

### ✅ Async/Await
```javascript
async function processData() {
  const data = await env.DB.prepare('SELECT * FROM movies').all();
  return data;
}
```

### ✅ Web Crypto API
```javascript
const uuid = crypto.randomUUID();
```

### ✅ Streams API
```javascript
const { readable, writable } = new TransformStream();
```

## Context (ctx) and waitUntil()

### How ctx.waitUntil() Works
```javascript
export default {
  async fetch(request, env, ctx) {
    // Main response returned immediately
    const response = new Response('Started');
    
    // Background work continues after response
    ctx.waitUntil(
      doBackgroundWork() // Can run up to 30 seconds
    );
    
    return response;
  }
}
```

**Limitations of waitUntil()**:
1. Cannot extend beyond 30 seconds wall-clock time
2. Cannot guarantee completion (Worker may be evicted)
3. No way to check status or get results
4. Errors are silent unless logged

## D1 Database Limits

### Query Limits
- **1 MB** max query size
- **100 MB** max response size
- **1000 rows** recommended batch size
- **500 statements** per batch transaction

### Performance
- Queries can take 10-100ms each
- Batch operations are faster than individual queries

## Vectorize Limits

### Vector Operations
- **1000 vectors** per upsert batch
- **100 vectors** per query
- **1536 dimensions** per vector (OpenAI embeddings)
- **200,000 vectors** per index (Free)
- **5,000,000 vectors** per index (Paid)

## Rate Limiting Strategies

### 1. No Built-in Delays
Since `setTimeout` doesn't work, we need alternatives:

```javascript
// ❌ WRONG - This will fail
async function processWithDelay(items) {
  for (const item of items) {
    await processItem(item);
    await new Promise(r => setTimeout(r, 1000)); // FAILS!
  }
}

// ✅ CORRECT - Process without delays
async function processWithoutDelay(items) {
  for (const item of items) {
    await processItem(item);
    // No delay - let the API handle rate limiting
  }
}

// ✅ CORRECT - Use external rate limiting
async function processWithRateLimit(items) {
  const rateLimiter = new RateLimiter(env.KV);
  for (const item of items) {
    await rateLimiter.waitForCapacity();
    await processItem(item);
  }
}
```

### 2. Using KV for Rate Limiting
```javascript
class RateLimiter {
  async waitForCapacity() {
    const now = Date.now();
    const key = `ratelimit:${Math.floor(now / 1000)}`;
    const count = await this.kv.get(key) || 0;
    
    if (count >= this.limit) {
      throw new Error('Rate limit exceeded, retry later');
    }
    
    await this.kv.put(key, count + 1, { expirationTtl: 2 });
  }
}
```

## Execution Time Strategies

### 1. Break Work into Chunks
```javascript
// Process in small batches that fit within CPU limits
async function processBatch(movieIds) {
  const BATCH_SIZE = 5; // Small batch to stay under limits
  
  for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
    const batch = movieIds.slice(i, i + BATCH_SIZE);
    await processBatchSync(batch);
    
    // Return partial results if approaching limit
    if (Date.now() - startTime > 25000) { // 25 seconds
      return { processed: i, remaining: movieIds.length - i };
    }
  }
}
```

### 2. Use Multiple Requests
```javascript
// Instead of processing all at once, use multiple requests
async function processQueue(request, env) {
  const batch = await getNextBatch(env.DB, 5); // Get only 5 items
  const results = await processBatch(batch);
  
  // Client should call again for next batch
  return new Response(JSON.stringify({
    processed: results.length,
    hasMore: await hasMoreItems(env.DB)
  }));
}
```

### 3. Use Cron Triggers
```javascript
// Process queue gradually via scheduled events
export default {
  async scheduled(controller, env, ctx) {
    // Process a small batch every minute
    const batch = await getNextBatch(env.DB, 10);
    await processBatch(batch);
  }
}
```

## Our Current Issues

### Problem 1: setTimeout in handleProcessQueue
```javascript
// Line 595 - THIS IS CAUSING THE ERROR
await new Promise(resolve => setTimeout(resolve, 2000));
```

### Problem 2: Long Running Operations
Processing multiple movies with embeddings can exceed CPU limits:
- TMDB API call: ~100ms
- OpenAI embedding: ~500ms
- Vectorize upload: ~100ms
- Database operations: ~50ms
Total per movie: ~750ms

With 30s limit, we can process ~40 movies maximum.

## Solution Approach

1. **Remove all setTimeout calls**
2. **Process smaller batches** (1-5 movies at a time)
3. **Use multiple requests** instead of one long request
4. **Implement proper error handling** for rate limits
5. **Use KV-based rate limiting** instead of delays
6. **Return partial results** if approaching limits

## Best Practices

1. **Always return quickly** - Aim for <1 second response time
2. **Use waitUntil() sparingly** - It's not reliable for critical work
3. **Design for idempotency** - Requests may be retried
4. **Log everything** - Debugging is hard without logs
5. **Monitor CPU time** - Use `Date.now()` to track execution
6. **Batch database operations** - Reduce round trips
7. **Cache aggressively** - Use KV and Cache API
8. **Handle failures gracefully** - Always have fallbacks