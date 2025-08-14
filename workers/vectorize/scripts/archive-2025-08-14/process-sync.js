#!/usr/bin/env node

/**
 * Process movies synchronously - direct processing without queue
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

async function processMovieSync(movieId) {
  try {
    console.log(`  Processing movie ${movieId} synchronously...`);
    
    const response = await fetch(`${WORKER_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds: [movieId],
        adminKey: ADMIN_KEY,
        sync: true  // Enable synchronous processing
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.log(`    ❌ Failed: ${result.error || result.details || 'Unknown error'}`);
      return false;
    }
    
    if (result.result) {
      console.log(`    ✅ Processed successfully`);
      console.log(`       Movies: ${result.result.moviesProcessed}`);
      console.log(`       Embeddings: ${result.result.embeddingsCreated}`);
      console.log(`       Vectors: ${result.result.vectorsUploaded}`);
      if (result.result.errors && result.result.errors.length > 0) {
        console.log(`       ⚠️ Errors: ${result.result.errors.join(', ')}`);
      }
      return result.result.moviesProcessed > 0;
    }
    
    return false;
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    return false;
  }
}

async function verifyMovie(movieId) {
  try {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    
    if (data.movie && data.movie.tmdb_id === movieId) {
      return {
        exists: true,
        title: data.movie.title,
        status: data.movie.processing_status,
        vectorId: data.movie.vector_id,
        hasDirector: !!data.movie.director,
        hasPoster: !!data.movie.poster_path
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔄 SYNCHRONOUS MOVIE PROCESSING (NO QUEUE)');
  console.log('='.repeat(70));
  
  // Test with specific movie IDs we know don't exist
  const testMovieIds = [
    755898,   // War of the Worlds (2025)
    1195631,  // William Tell (2025)
    1185528,  // Legends of the Condor Heroes
    1311031,  // Demon Slayer: Infinity Castle
    986206    // Night Carnage
  ];
  
  console.log(`\n📊 Processing ${testMovieIds.length} movies synchronously`);
  console.log('⚠️  This will wait for each movie to complete before continuing\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testMovieIds.length; i++) {
    const movieId = testMovieIds[i];
    console.log(`\n[${i + 1}/${testMovieIds.length}] Movie ID: ${movieId}`);
    
    // Process synchronously
    const success = await processMovieSync(movieId);
    
    if (success) {
      successCount++;
      
      // Verify it was actually saved
      console.log('  Verifying in database...');
      const verification = await verifyMovie(movieId);
      
      if (verification.exists) {
        console.log(`    ✅ Confirmed: ${verification.title}`);
        console.log(`       Status: ${verification.status}`);
        console.log(`       Vector: ${verification.vectorId || 'Processing...'}`);
        console.log(`       Director: ${verification.hasDirector ? '✓' : '✗'}`);
        console.log(`       Poster: ${verification.hasPoster ? '✓' : '✗'}`);
      } else {
        console.log('    ⚠️ Movie processed but not yet visible in database');
      }
    } else {
      failCount++;
    }
    
    // Small delay between movies
    if (i < testMovieIds.length - 1) {
      console.log('  Waiting 2 seconds before next movie...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final stats
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  console.log(`  Attempted: ${testMovieIds.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  
  // Check final database state
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log(`\n📈 Database Stats:`);
  console.log(`  Total movies: ${stats.vectors.completedMovies}`);
  console.log(`  Total vectors: ${stats.vectors.totalVectors}`);
  console.log(`  Queue pending: ${stats.queue.pending}`);
  
  console.log('\n✅ Complete!');
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopped by user');
  process.exit(0);
});

main().catch(console.error);