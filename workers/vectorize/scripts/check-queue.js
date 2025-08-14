#!/usr/bin/env node

/**
 * Check what's in the processing queue
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';

async function checkQueue() {
  console.log('='.repeat(70));
  console.log('📋 PROCESSING QUEUE STATUS');
  console.log('='.repeat(70));
  
  // Get stats
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log('\n📊 Queue Summary:');
  console.log(`  Pending: ${stats.queue.pending}`);
  console.log(`  Processing: ${stats.queue.processing}`);
  console.log(`  Completed: ${stats.queue.completed}`);
  
  console.log('\n📈 Today\'s Processing:');
  console.log(`  Movies processed: ${stats.today.movies_processed}`);
  console.log(`  Embeddings created: ${stats.today.embeddings_created}`);
  console.log(`  Vectors uploaded: ${stats.today.vectors_uploaded}`);
  
  // The queue has items but we can't directly query D1 from here
  // Let's check some of the movie IDs we tried to process
  const testMovieIds = [755898, 1195631, 1185528, 1311031, 986206];
  
  console.log('\n🔍 Checking specific movies from our attempts:');
  for (const movieId of testMovieIds) {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    
    if (data.movie) {
      console.log(`  ✅ ${movieId}: ${data.movie.title} - Status: ${data.movie.processing_status}`);
    } else {
      console.log(`  ❌ ${movieId}: Not in database`);
    }
  }
  
  // Check some known movies to see their status
  console.log('\n📽️ Sample of existing movies:');
  const sampleIds = [533535, 912649, 13, 550, 603];
  for (const movieId of sampleIds) {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    
    if (data.movie) {
      console.log(`  ${movieId}: ${data.movie.title}`);
      console.log(`    - Status: ${data.movie.processing_status}`);
      console.log(`    - Vector: ${data.movie.vector_id || 'NULL'}`);
      console.log(`    - Embedded: ${data.movie.embedded_at || 'Never'}`);
    }
  }
  
  console.log('\n💡 Analysis:');
  if (stats.queue.pending > 0 && stats.today.movies_processed === 0) {
    console.log('  ⚠️  Queue has pending items but nothing is being processed');
    console.log('  Possible issues:');
    console.log('  1. Worker async processing (ctx.waitUntil) may not be executing');
    console.log('  2. TMDB API key might be invalid in worker environment');
    console.log('  3. Rate limits may have been hit');
    console.log('  4. Processing might be failing silently');
  }
  
  console.log('\n🔧 Recommendations:');
  console.log('  1. Check worker logs: npx wrangler tail');
  console.log('  2. Try processing without async (sync mode)');
  console.log('  3. Add more detailed error logging to worker');
  console.log('  4. Clear queue and try fresh: DELETE FROM processing_queue');
}

checkQueue().catch(console.error);