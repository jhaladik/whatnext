#!/usr/bin/env node

/**
 * Clear queue and test with 10 fresh quality movies
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';

async function clearQueue() {
  console.log('🧹 Clearing queue...');
  // Since we don't have a clear endpoint, we'll need to use D1 directly
  console.log('   Note: Queue clearing should be done via Cloudflare dashboard');
  console.log('   Command: DELETE FROM processing_queue WHERE status = "pending"');
  return true;
}

async function findQualityMovies() {
  console.log('\n🔍 Finding 10 quality movies not in database...');
  
  // Movies that should definitely not be in the database yet
  // These are newer highly-rated films from 2022-2024
  const qualityMovies = [
    { id: 667538, title: "Transformers One", year: 2024 },
    { id: 957452, title: "The Crow", year: 2024 },
    { id: 1022789, title: "Inside Out 2", year: 2024 },
    { id: 748783, title: "The Garfield Movie", year: 2024 },
    { id: 653346, title: "Kingdom of the Planet of the Apes", year: 2024 },
    { id: 929590, title: "Civil War", year: 2024 },
    { id: 872585, title: "Oppenheimer", year: 2023 },
    { id: 569094, title: "Spider-Man: Across the Spider-Verse", year: 2023 },
    { id: 447365, title: "Guardians of the Galaxy Vol. 3", year: 2023 },
    { id: 603692, title: "John Wick: Chapter 4", year: 2023 }
  ];
  
  const availableMovies = [];
  
  for (const movie of qualityMovies) {
    // Check if movie exists in our database
    try {
      const response = await fetch(`${WORKER_URL}/debug?id=${movie.id}`);
      const data = await response.json();
      
      if (!data.movie || !data.movie.processing_status) {
        console.log(`   ✅ ${movie.title} (${movie.year}) - Not in database`);
        availableMovies.push(movie.id);
      } else {
        console.log(`   ⏭️  ${movie.title} - Already processed`);
      }
      
      if (availableMovies.length >= 10) break;
    } catch (error) {
      console.log(`   ⚠️  Error checking ${movie.title}`);
    }
  }
  
  return availableMovies;
}

async function addToQueue(movieIds) {
  console.log(`\n📝 Adding ${movieIds.length} movies to queue...`);
  
  const response = await fetch(`${WORKER_URL}/add-to-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieIds,
      adminKey: ADMIN_KEY,
      priority: 10
    })
  });
  
  const result = await response.json();
  console.log(`   ✅ ${result.message}`);
  console.log(`   📊 Queue status: ${result.queueStatus.pending} pending`);
  
  return result;
}

async function processQueue(batchSize = 1) {
  console.log(`\n⚙️  Processing queue...`);
  
  const response = await fetch(`${WORKER_URL}/process-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminKey: ADMIN_KEY,
      batchSize: batchSize,
      maxMovies: 10
    })
  });
  
  const result = await response.json();
  console.log(`   ✅ ${result.message}`);
  console.log(`   📊 Processed: ${result.totalProcessed}/${result.totalMovies}`);
  
  if (result.results) {
    result.results.forEach((batch, i) => {
      if (batch.success) {
        console.log(`   ✓ Batch ${i+1}: Success - ${batch.processed} movies`);
      } else {
        console.log(`   ✗ Batch ${i+1}: Failed - ${batch.error || 'Unknown error'}`);
      }
    });
  }
  
  return result;
}

async function checkResults(movieIds) {
  console.log('\n🔍 Checking processing results...');
  
  for (const movieId of movieIds.slice(0, 5)) {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    
    if (data.movie) {
      console.log(`   ${movieId}: ${data.movie.title}`);
      console.log(`     Status: ${data.movie.processing_status}`);
      console.log(`     Vector: ${data.movie.vector_id ? '✅' : '❌'}`);
    }
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 QUEUE TEST WITH QUALITY MOVIES');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Clear queue (manual step)
    await clearQueue();
    
    // Step 2: Find quality movies not in database
    const movieIds = await findQualityMovies();
    
    if (movieIds.length === 0) {
      console.log('\n❌ No new movies found to test');
      return;
    }
    
    // Step 3: Add to queue
    await addToQueue(movieIds);
    
    // Step 4: Wait a bit
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Process queue
    const result = await processQueue(1);
    
    // Step 6: Check results
    if (result.totalProcessed > 0) {
      await checkResults(movieIds);
    }
    
    // Step 7: Final stats
    console.log('\n📊 Final Statistics:');
    const statsResponse = await fetch(`${WORKER_URL}/stats`);
    const stats = await statsResponse.json();
    console.log(`   Total movies: ${stats.vectors.totalVectors}`);
    console.log(`   Queue pending: ${stats.queue.pending}`);
    console.log(`   Today processed: ${stats.today.movies_processed}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Test complete!');
}

main().catch(console.error);