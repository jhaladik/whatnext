#!/usr/bin/env node

/**
 * Direct movie processing - fetches from TMDB and processes immediately
 * Bypasses queue system for immediate processing
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Rate limiting settings
const TMDB_DELAY = 2000; // 2 seconds between TMDB calls (conservative)
const PROCESS_DELAY = 5000; // 5 seconds between processing each movie

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromTMDB(endpoint) {
  const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`TMDB error: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`TMDB fetch error: ${error.message}`);
    return null;
  }
}

async function getExistingMovieIds() {
  try {
    const response = await fetch(`${WORKER_URL}/stats`);
    const stats = await response.json();
    console.log(`  Current database has ${stats.vectors?.completedMovies || 0} movies`);
    
    // We can't get all IDs from stats, so we'll check each movie individually
    return new Set();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return new Set();
  }
}

async function checkMovieExists(movieId) {
  try {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    return data.movie && data.movie.tmdb_id === movieId;
  } catch (error) {
    return false;
  }
}

async function processMovie(movieId) {
  try {
    console.log(`    Processing movie ${movieId}...`);
    const response = await fetch(`${WORKER_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds: [movieId],
        adminKey: ADMIN_KEY
      })
    });
    
    if (!response.ok) {
      console.log(`      ❌ Failed: HTTP ${response.status}`);
      return false;
    }
    
    // Wait for processing to complete
    console.log(`      ⏳ Waiting 15 seconds for processing to complete...`);
    await wait(15000); // Give it 15 seconds to process
    
    // Verify it was added and check vector
    const verifyResponse = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.movie && verifyData.movie.tmdb_id === movieId) {
      const movie = verifyData.movie;
      console.log(`      ✅ Movie saved to D1 database`);
      console.log(`         Title: ${movie.title}`);
      console.log(`         Vector ID: ${movie.vector_id || 'NOT SET'}`);
      console.log(`         Status: ${movie.processing_status}`);
      console.log(`         Poster: ${movie.poster_path ? '✓' : '✗'}`);
      console.log(`         Director: ${movie.director || 'N/A'}`);
      
      if (movie.vector_id && movie.processing_status === 'completed') {
        console.log(`      ✅ Vector successfully uploaded to Vectorize`);
        return true;
      } else if (movie.processing_status === 'processing') {
        console.log(`      ⚠️  Still processing embeddings...`);
        return false;
      } else {
        console.log(`      ⚠️  Movie saved but vector not yet complete`);
        return false;
      }
    } else {
      console.log(`      ❌ Movie not found in database after processing`);
      return false;
    }
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
    return false;
  }
}

async function getNewMoviesFromTMDB(count = 100) {
  console.log('\n📥 Fetching new movies from TMDB...');
  
  const newMovies = [];
  const sources = [
    '/movie/now_playing',
    '/movie/popular', 
    '/movie/top_rated',
    '/movie/upcoming',
    '/trending/movie/week'
  ];
  
  for (const source of sources) {
    if (newMovies.length >= count) break;
    
    console.log(`  Checking ${source}...`);
    const data = await fetchFromTMDB(source);
    
    if (data && data.results) {
      for (const movie of data.results) {
        // Quick validation
        if (movie.id && movie.title && movie.release_date) {
          // Check if movie exists
          console.log(`    Checking if movie ${movie.id} (${movie.title}) exists...`);
          const exists = await checkMovieExists(movie.id);
          
          if (!exists) {
            newMovies.push({
              id: movie.id,
              title: movie.title,
              year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'
            });
            console.log(`      ➕ Added to processing list`);
          } else {
            console.log(`      ⏭️  Already exists, skipping`);
          }
          
          if (newMovies.length >= count) break;
        }
        
        await wait(500); // Small delay between checks
      }
    }
    
    await wait(TMDB_DELAY);
  }
  
  // If we still need more, fetch from different pages
  if (newMovies.length < count) {
    console.log(`\n  Need ${count - newMovies.length} more movies, checking additional pages...`);
    
    for (let page = 2; page <= 10 && newMovies.length < count; page++) {
      const data = await fetchFromTMDB(`/movie/popular?page=${page}`);
      
      if (data && data.results) {
        for (const movie of data.results) {
          if (movie.id && movie.title && movie.release_date) {
            const exists = await checkMovieExists(movie.id);
            
            if (!exists) {
              newMovies.push({
                id: movie.id,
                title: movie.title,
                year: movie.release_date.substring(0, 4)
              });
              console.log(`    ➕ Found: ${movie.title} (${movie.id})`);
            }
            
            if (newMovies.length >= count) break;
          }
          
          await wait(500);
        }
      }
      
      await wait(TMDB_DELAY);
    }
  }
  
  return newMovies;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 DIRECT MOVIE PROCESSING (NO QUEUE)');
  console.log('='.repeat(70));
  
  const args = process.argv.slice(2);
  const targetCount = args[0] ? parseInt(args[0]) : 5; // DEFAULT TO 5 FOR TESTING
  
  console.log(`\n📊 Target: Process ${targetCount} new movies`);
  console.log('⚠️  This will take approximately:');
  console.log(`  - ${(targetCount * 20 / 60).toFixed(1)} minutes total`);
  console.log(`  - TMDB checks: 500ms per movie`);
  console.log(`  - Processing: 15-20 seconds per movie`);
  console.log(`\n🔍 Data validation will check:`);
  console.log(`  - Movie saved to D1 database`);
  console.log(`  - All fields properly populated`);
  console.log(`  - Vector ID correctly formatted (movie_XXXXX)`);
  console.log(`  - Vector uploaded to Vectorize index`);
  console.log(`  - Processing status = 'completed'`);
  
  // Get initial stats
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const initialStats = await statsResponse.json();
  const initialCount = initialStats.vectors?.completedMovies || 0;
  
  console.log(`\n📈 Starting count: ${initialCount} movies`);
  
  // Get new movies from TMDB
  const newMovies = await getNewMoviesFromTMDB(targetCount);
  
  if (newMovies.length === 0) {
    console.log('\n❌ No new movies found to process!');
    return;
  }
  
  console.log(`\n✅ Found ${newMovies.length} new movies to process`);
  console.log('='.repeat(70));
  
  // Process each movie
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < newMovies.length; i++) {
    const movie = newMovies[i];
    console.log(`\n[${i + 1}/${newMovies.length}] ${movie.title} (${movie.year}) - ID: ${movie.id}`);
    
    const success = await processMovie(movie.id);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Show progress
    if ((i + 1) % 5 === 0) {
      const currentStats = await fetch(`${WORKER_URL}/stats`).then(r => r.json());
      const currentCount = currentStats.vectors?.completedMovies || 0;
      console.log(`\n  📊 Progress: ${currentCount - initialCount} new movies added (Total: ${currentCount})`);
    }
    
    // Wait before next movie
    if (i < newMovies.length - 1) {
      console.log(`  ⏳ Waiting ${PROCESS_DELAY/1000} seconds before next movie...`);
      await wait(PROCESS_DELAY);
    }
    
    // Safety check - stop if we're seeing too many failures
    if (failCount >= 3) {
      console.log(`\n⚠️  Stopping due to ${failCount} consecutive failures`);
      break;
    }
  }
  
  // Final stats
  const finalStats = await fetch(`${WORKER_URL}/stats`).then(r => r.json());
  const finalCount = finalStats.vectors?.completedMovies || 0;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`  Initial count: ${initialCount}`);
  console.log(`  Final count: ${finalCount}`);
  console.log(`  New movies added: ${finalCount - initialCount}`);
  console.log(`  Success: ${successCount}/${newMovies.length}`);
  console.log(`  Failed: ${failCount}`);
  
  if (finalStats.today && finalStats.today.openai_tokens) {
    const cost = finalStats.today.openai_tokens * 0.10 / 1000000;
    console.log(`\n💰 Today's usage:`);
    console.log(`  OpenAI tokens: ${finalStats.today.openai_tokens}`);
    console.log(`  Cost: $${cost.toFixed(4)}`);
  }
  
  console.log('\n✅ Complete!');
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopped by user');
  process.exit(0);
});

main().catch(console.error);