#!/usr/bin/env node

/**
 * Simple Queue Test - Test queue with a single movie
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

async function testQueue() {
  console.log('='.repeat(70));
  console.log('🧪 SIMPLE QUEUE TEST');
  console.log('='.repeat(70));
  
  // Test movie IDs - classic movies that should work
  const testMovieIds = [
    238,  // The Godfather
    278,  // Shawshank Redemption
    550   // Fight Club
  ];
  
  console.log('\n1️⃣ Adding movies to queue...');
  console.log(`   Movies to add: ${testMovieIds.join(', ')}`);
  
  try {
    const addResponse = await fetch(`${WORKER_URL}/add-to-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds: testMovieIds,
        adminKey: ADMIN_KEY,
        priority: 10  // High priority
      })
    });
    
    if (!addResponse.ok) {
      const error = await addResponse.text();
      console.log(`   ❌ Failed to add: ${error}`);
      return;
    }
    
    const addResult = await addResponse.json();
    console.log(`   ✅ ${addResult.message}`);
    console.log(`   📊 Added: ${addResult.added}, Skipped: ${addResult.skipped}`);
    console.log(`   📈 Queue: ${addResult.queueStatus.pending} pending, ${addResult.queueStatus.completed} completed`);
    
  } catch (error) {
    console.log(`   ❌ Error adding to queue: ${error.message}`);
    return;
  }
  
  console.log('\n2️⃣ Processing queue (one movie at a time)...');
  
  try {
    const processResponse = await fetch(`${WORKER_URL}/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        batchSize: 1,  // Process one at a time
        maxMovies: 3   // Process up to 3 movies
      })
    });
    
    if (!processResponse.ok) {
      const error = await processResponse.text();
      console.log(`   ❌ Failed to process: ${error}`);
      return;
    }
    
    const processResult = await processResponse.json();
    console.log(`   ✅ ${processResult.message}`);
    console.log(`   📊 Processed: ${processResult.totalProcessed}/${processResult.totalMovies}`);
    
    if (processResult.results && processResult.results.length > 0) {
      console.log('\n   📋 Details:');
      processResult.results.forEach((batch, i) => {
        const movieId = batch.movieIds[0];
        if (batch.success) {
          console.log(`     ✅ Movie ${movieId}: Processed successfully`);
        } else {
          console.log(`     ❌ Movie ${movieId}: ${batch.error || 'Failed'}`);
        }
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Error processing queue: ${error.message}`);
    return;
  }
  
  console.log('\n3️⃣ Checking final status...');
  
  try {
    const statsResponse = await fetch(`${WORKER_URL}/stats`);
    const stats = await statsResponse.json();
    
    console.log(`   📊 Queue Status:`);
    console.log(`      Pending: ${stats.queue.pending}`);
    console.log(`      Completed: ${stats.queue.completed}`);
    console.log(`   📈 Today's Stats:`);
    console.log(`      Movies processed: ${stats.today.movies_processed}`);
    console.log(`      Embeddings created: ${stats.today.embeddings_created}`);
    console.log(`      Vectors uploaded: ${stats.today.vectors_uploaded}`);
    
  } catch (error) {
    console.log(`   ❌ Error fetching stats: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Queue test complete!');
  console.log('='.repeat(70));
  console.log('\n💡 Next steps:');
  console.log('   - Check worker logs: npx wrangler tail');
  console.log('   - View specific movie: node scripts/check-queue.js');
  console.log('   - Process more: node scripts/queue-processor.js process 1 10');
}

testQueue().catch(console.error);