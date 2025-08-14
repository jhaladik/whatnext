#!/usr/bin/env node

/**
 * Queue Processor - Add movies to queue and process them one by one
 * This uses the new /add-to-queue and /process-queue endpoints
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

async function checkMovieExists(movieId) {
  try {
    const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
    const data = await response.json();
    return data.movie && data.movie.tmdb_id === movieId;
  } catch (error) {
    return false;
  }
}

async function addToQueue(movieIds) {
  try {
    console.log(`\n📝 Adding ${movieIds.length} movies to queue...`);
    
    const response = await fetch(`${WORKER_URL}/add-to-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds,
        adminKey: ADMIN_KEY,
        priority: 0
      })
    });
    
    if (!response.ok) {
      console.log(`  ❌ Failed: HTTP ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`  ✅ ${result.message}`);
    console.log(`  📊 Queue status: ${result.queueStatus.pending} pending, ${result.queueStatus.completed} completed`);
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function processQueue(batchSize = 1, maxMovies = 10) {
  try {
    console.log(`\n⚙️  Processing queue (batch size: ${batchSize}, max: ${maxMovies})...`);
    
    const response = await fetch(`${WORKER_URL}/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        batchSize,
        maxMovies
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ Failed: ${error}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`  ✅ ${result.message}`);
    console.log(`  📊 Processed: ${result.totalProcessed}/${result.totalMovies}`);
    
    if (result.totalErrors > 0) {
      console.log(`  ⚠️  Errors: ${result.totalErrors}`);
    }
    
    // Show details for each batch
    if (result.results && result.results.length > 0) {
      console.log('\n  📋 Batch Results:');
      result.results.forEach((batch, i) => {
        console.log(`    Batch ${i + 1}: Movies ${batch.movieIds.join(', ')}`);
        if (batch.success) {
          console.log(`      ✅ Processed: ${batch.processed}, Embeddings: ${batch.embeddings}, Vectors: ${batch.vectors}`);
        } else {
          console.log(`      ❌ Failed: ${batch.error || 'Unknown error'}`);
        }
        if (batch.errors && batch.errors.length > 0) {
          console.log(`      ⚠️ Errors: ${batch.errors.join(', ')}`);
        }
      });
    }
    
    return result.totalProcessed > 0;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function getQueueStatus() {
  try {
    const response = await fetch(`${WORKER_URL}/stats`);
    const stats = await response.json();
    
    console.log('\n📊 Current Queue Status:');
    console.log(`  Pending: ${stats.queue.pending}`);
    console.log(`  Processing: ${stats.queue.processing}`);
    console.log(`  Completed: ${stats.queue.completed}`);
    
    return stats.queue;
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return null;
  }
}

async function findNewMovies(count = 10) {
  console.log(`\n🔍 Finding ${count} new movies from TMDB...`);
  
  const newMovies = [];
  const sources = [
    { endpoint: '/movie/top_rated', name: 'Top Rated' },
    { endpoint: '/movie/popular', name: 'Popular' },
    { endpoint: '/trending/movie/week', name: 'Trending' }
  ];
  
  for (const source of sources) {
    if (newMovies.length >= count) break;
    
    console.log(`  Checking ${source.name}...`);
    const data = await fetchFromTMDB(source.endpoint);
    
    if (data && data.results) {
      for (const movie of data.results) {
        if (movie.id && movie.title) {
          const exists = await checkMovieExists(movie.id);
          
          if (!exists) {
            newMovies.push(movie.id);
            console.log(`    ➕ Found: ${movie.title} (${movie.id})`);
            
            if (newMovies.length >= count) break;
          }
        }
        
        await wait(100); // Small delay between checks
      }
    }
    
    await wait(1000); // Delay between API calls
  }
  
  return newMovies;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 QUEUE-BASED MOVIE PROCESSING');
  console.log('='.repeat(70));
  
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'status':
      // Just show queue status
      await getQueueStatus();
      break;
      
    case 'add':
      // Add movies to queue
      const countToAdd = parseInt(args[1]) || 10;
      const movieIds = await findNewMovies(countToAdd);
      
      if (movieIds.length > 0) {
        await addToQueue(movieIds);
      } else {
        console.log('\n❌ No new movies found to add to queue');
      }
      break;
      
    case 'process':
      // Process movies from queue
      const batchSize = parseInt(args[1]) || 1;
      const maxMovies = parseInt(args[2]) || 10;
      
      await processQueue(batchSize, maxMovies);
      break;
      
    case 'full':
      // Full workflow: find, add, and process
      const count = parseInt(args[1]) || 5;
      
      console.log(`\n📋 Full workflow: Find ${count} movies, add to queue, and process`);
      
      // Get initial status
      const initialQueue = await getQueueStatus();
      
      // Find new movies
      const newMovieIds = await findNewMovies(count);
      
      if (newMovieIds.length === 0) {
        console.log('\n❌ No new movies found');
        break;
      }
      
      // Add to queue
      const addSuccess = await addToQueue(newMovieIds);
      if (!addSuccess) {
        console.log('\n❌ Failed to add movies to queue');
        break;
      }
      
      // Process the queue (one at a time for safety)
      console.log('\n⏳ Waiting 2 seconds before processing...');
      await wait(2000);
      
      const processSuccess = await processQueue(1, newMovieIds.length);
      
      // Final status
      const finalQueue = await getQueueStatus();
      
      console.log('\n' + '='.repeat(70));
      console.log('📊 RESULTS');
      console.log('='.repeat(70));
      console.log(`  Movies added to queue: ${newMovieIds.length}`);
      console.log(`  Initial pending: ${initialQueue.pending}`);
      console.log(`  Final pending: ${finalQueue.pending}`);
      console.log(`  Completed: ${finalQueue.completed - initialQueue.completed}`);
      
      break;
      
    case 'clear':
      // Note: Clear queue functionality would need a new endpoint
      console.log('⚠️  To clear the queue, use Cloudflare dashboard or run:');
      console.log('  npx wrangler d1 execute whatnext-db --command "DELETE FROM processing_queue WHERE status = \'pending\'"');
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node queue-processor.js status              - Show queue status');
      console.log('  node queue-processor.js add [count]         - Add movies to queue');
      console.log('  node queue-processor.js process [batch] [max] - Process queue');
      console.log('  node queue-processor.js full [count]        - Full workflow');
      console.log('  node queue-processor.js clear               - Clear queue instructions');
      console.log('\nExamples:');
      console.log('  node queue-processor.js status');
      console.log('  node queue-processor.js add 10              - Find and add 10 movies');
      console.log('  node queue-processor.js process 1 5         - Process 5 movies, 1 at a time');
      console.log('  node queue-processor.js full 5              - Complete workflow for 5 movies');
  }
  
  console.log('\n✅ Done!');
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopped by user');
  process.exit(0);
});

main().catch(console.error);