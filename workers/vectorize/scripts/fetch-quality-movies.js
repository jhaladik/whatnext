#!/usr/bin/env node

/**
 * Fetch high-quality movies from TMDB based on strict curation criteria
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTopRatedFromTMDB(page = 1) {
  const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error.message);
    return [];
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

async function processMovieSync(movieId) {
  try {
    const response = await fetch(`${WORKER_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds: [movieId],
        adminKey: ADMIN_KEY,
        sync: true
      })
    });
    
    const result = await response.json();
    return response.ok && result.result && result.result.moviesProcessed > 0;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 FETCH HIGH-QUALITY MOVIES FOR WHATNEXT');
  console.log('='.repeat(70));
  
  console.log('\n📋 Curation Criteria:');
  console.log('  • Pre-1970: 500+ votes, 7.0+ rating');
  console.log('  • 1970-1989: 1,000+ votes, 7.0+ rating');
  console.log('  • 1990-1999: 5,000+ votes, 7.0+ rating');
  console.log('  • 2000-2015: 10,000+ votes, 7.2+ rating');
  console.log('  • 2016-2022: 20,000+ votes, 7.5+ rating');
  console.log('  • 2023+: 50,000+ votes, 8.0+ rating');
  console.log('  • Minimum age: 2 years (no 2024-2025 releases)');
  
  const targetCount = 10; // Start with 10 quality movies for testing
  const processedMovies = [];
  const skippedRecent = [];
  const failedCriteria = [];
  let page = 1;
  
  console.log(`\n🎯 Goal: Add ${targetCount} high-quality films`);
  console.log('📥 Fetching from TMDB Top Rated...\n');
  
  while (processedMovies.length < targetCount && page <= 10) {
    console.log(`\n📄 Page ${page} of Top Rated Movies:`);
    const movies = await fetchTopRatedFromTMDB(page);
    
    for (const movie of movies) {
      if (processedMovies.length >= targetCount) break;
      
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
      const age = new Date().getFullYear() - year;
      
      // Quick pre-filter
      if (age < 2) {
        skippedRecent.push(`${movie.title} (${year})`);
        continue;
      }
      
      console.log(`\n  Checking: ${movie.title} (${year})`);
      console.log(`    Rating: ${movie.vote_average}/10, Votes: ${movie.vote_count}`);
      
      // Check if already exists
      const exists = await checkMovieExists(movie.id);
      if (exists) {
        console.log(`    ⏭️ Already in database`);
        continue;
      }
      
      // Process the movie
      console.log(`    Processing...`);
      const success = await processMovieSync(movie.id);
      
      if (success) {
        console.log(`    ✅ Added successfully!`);
        processedMovies.push({
          id: movie.id,
          title: movie.title,
          year: year,
          rating: movie.vote_average,
          votes: movie.vote_count
        });
      } else {
        console.log(`    ❌ Failed quality criteria or processing error`);
        failedCriteria.push(`${movie.title} (${year})`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    page++;
    await new Promise(resolve => setTimeout(resolve, 3000)); // Delay between pages
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✅ Successfully Added (${processedMovies.length} movies):`);
  processedMovies.forEach(m => {
    console.log(`  • ${m.title} (${m.year}) - ${m.rating}/10, ${m.votes.toLocaleString()} votes`);
  });
  
  if (skippedRecent.length > 0) {
    console.log(`\n⏭️ Skipped Recent Movies (${skippedRecent.length}):`);
    skippedRecent.slice(0, 10).forEach(m => console.log(`  • ${m}`));
    if (skippedRecent.length > 10) {
      console.log(`  ... and ${skippedRecent.length - 10} more`);
    }
  }
  
  if (failedCriteria.length > 0) {
    console.log(`\n❌ Failed Quality Criteria (${failedCriteria.length}):`);
    failedCriteria.slice(0, 10).forEach(m => console.log(`  • ${m}`));
  }
  
  // Get final stats
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log(`\n📈 Database Status:`);
  console.log(`  Total movies: ${stats.vectors.completedMovies}`);
  console.log(`  Total vectors: ${stats.vectors.totalVectors}`);
  
  console.log('\n💡 Next Steps:');
  console.log('  1. Continue fetching from pages 11-50 of top_rated');
  console.log('  2. Fetch from discover endpoint with decade filters');
  console.log('  3. Add specific lists (AFI Top 100, Criterion, etc.)');
  console.log('  4. Import award winners and festival selections');
}

main().catch(console.error);