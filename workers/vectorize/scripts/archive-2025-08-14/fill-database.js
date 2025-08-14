#!/usr/bin/env node

/**
 * Master script to fill database with high-quality movies
 * Run this to populate WhatNext with curated films
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Configuration
const CONFIG = {
  targetTotal: 5000,        // Target 5000 movies for now
  batchSize: 20,           // Process 20 movies per batch
  delayBetweenMovies: 3000, // 3 seconds between movies
  delayBetweenBatches: 10000, // 10 seconds between batches
};

// Track progress
const progress = {
  processed: 0,
  added: 0,
  skipped: 0,
  failed: 0,
  startTime: Date.now()
};

// Utility functions
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCurrentStats() {
  try {
    const response = await fetch(`${WORKER_URL}/stats`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
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
    console.error(`Error processing ${movieId}:`, error.message);
    return false;
  }
}

// Fetch movies from different sources
async function fetchFromTMDB(endpoint, page = 1) {
  const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching from TMDB:`, error.message);
    return [];
  }
}

// Different strategies for different quality tiers
async function fetchTopRated(startPage = 1, endPage = 50) {
  console.log('\n📽️ FETCHING TOP RATED MOVIES');
  const movieIds = [];
  
  for (let page = startPage; page <= endPage; page++) {
    console.log(`  Page ${page}/${endPage}...`);
    const movies = await fetchFromTMDB('/movie/top_rated', page);
    
    for (const movie of movies) {
      // Pre-filter based on our criteria
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
      const age = new Date().getFullYear() - year;
      
      // Skip too recent movies
      if (age < 2) continue;
      
      // Apply basic quality filter
      if (movie.vote_average < 7.0 || movie.vote_count < 1000) continue;
      
      movieIds.push({
        id: movie.id,
        title: movie.title,
        year: year,
        rating: movie.vote_average,
        votes: movie.vote_count
      });
    }
    
    await wait(2000); // Rate limiting
  }
  
  return movieIds;
}

async function fetchByDecade(decade, pages = 5) {
  console.log(`\n📽️ FETCHING ${decade}s MOVIES`);
  const movieIds = [];
  
  for (let page = 1; page <= pages; page++) {
    const endpoint = `/discover/movie`;
    const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}` +
      `&primary_release_date.gte=${decade}-01-01` +
      `&primary_release_date.lte=${decade + 9}-12-31` +
      `&sort_by=vote_average.desc` +
      `&vote_count.gte=1000` +
      `&vote_average.gte=7.0` +
      `&page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      
      for (const movie of data.results || []) {
        movieIds.push({
          id: movie.id,
          title: movie.title,
          year: new Date(movie.release_date).getFullYear(),
          rating: movie.vote_average,
          votes: movie.vote_count
        });
      }
    } catch (error) {
      console.error(`Error fetching ${decade}s movies:`, error.message);
    }
    
    await wait(2000);
  }
  
  return movieIds;
}

async function fetchByGenre(genreId, genreName, pages = 5) {
  console.log(`\n📽️ FETCHING ${genreName.toUpperCase()} MOVIES`);
  const movieIds = [];
  
  for (let page = 1; page <= pages; page++) {
    const endpoint = `/discover/movie`;
    const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}` +
      `&with_genres=${genreId}` +
      `&sort_by=vote_average.desc` +
      `&vote_count.gte=5000` +
      `&vote_average.gte=7.5` +
      `&page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      
      for (const movie of data.results || []) {
        const year = new Date(movie.release_date).getFullYear();
        const age = new Date().getFullYear() - year;
        
        // Skip too recent
        if (age < 2) continue;
        
        movieIds.push({
          id: movie.id,
          title: movie.title,
          year: year,
          rating: movie.vote_average,
          votes: movie.vote_count
        });
      }
    } catch (error) {
      console.error(`Error fetching ${genreName} movies:`, error.message);
    }
    
    await wait(2000);
  }
  
  return movieIds;
}

async function processMovieBatch(movies) {
  console.log(`\n🎬 Processing batch of ${movies.length} movies`);
  
  for (const movie of movies) {
    progress.processed++;
    
    // Check if exists
    const exists = await checkMovieExists(movie.id);
    if (exists) {
      console.log(`  [${progress.processed}] ⏭️ Skipped: ${movie.title} (${movie.year})`);
      progress.skipped++;
      continue;
    }
    
    // Process the movie
    console.log(`  [${progress.processed}] Processing: ${movie.title} (${movie.year})`);
    const success = await processMovieSync(movie.id);
    
    if (success) {
      console.log(`    ✅ Added successfully`);
      progress.added++;
    } else {
      console.log(`    ❌ Failed quality criteria`);
      progress.failed++;
    }
    
    // Rate limiting
    await wait(CONFIG.delayBetweenMovies);
    
    // Show progress every 10 movies
    if (progress.processed % 10 === 0) {
      showProgress();
    }
  }
}

function showProgress() {
  const elapsed = (Date.now() - progress.startTime) / 1000 / 60; // minutes
  const rate = progress.processed / elapsed;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 PROGRESS: ${progress.processed} processed`);
  console.log(`  ✅ Added: ${progress.added}`);
  console.log(`  ⏭️ Skipped: ${progress.skipped}`);
  console.log(`  ❌ Failed: ${progress.failed}`);
  console.log(`  ⏱️ Rate: ${rate.toFixed(1)} movies/minute`);
  console.log('='.repeat(50) + '\n');
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 WHATNEXT DATABASE BUILDER');
  console.log('='.repeat(70));
  
  // Get initial stats
  const initialStats = await getCurrentStats();
  if (!initialStats) {
    console.error('Failed to get initial stats');
    return;
  }
  
  const currentMovies = initialStats.vectors?.completedMovies || 0;
  console.log(`\n📈 Current database: ${currentMovies} movies`);
  console.log(`🎯 Target: ${CONFIG.targetTotal} movies`);
  console.log(`📦 Need to add: ${CONFIG.targetTotal - currentMovies} more movies`);
  
  console.log('\n📋 COLLECTION STRATEGY:');
  console.log('  1. Top Rated Movies (pages 1-50)');
  console.log('  2. Best Movies by Decade (1970s-2010s)');
  console.log('  3. Genre Masterpieces');
  console.log('  4. Award Winners & Festival Films');
  
  console.log('\n⚙️ QUALITY FILTERS:');
  console.log('  • Minimum 2 years old');
  console.log('  • Rating: 7.0+ (older), 7.5+ (recent)');
  console.log('  • Votes: 1000+ (classics), 20000+ (2016+)');
  
  const allMovies = [];
  
  // Phase 1: Top Rated (most reliable source)
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: TOP RATED MOVIES');
  console.log('='.repeat(70));
  const topRated = await fetchTopRated(1, 10); // Pages 1-10 of top rated
  allMovies.push(...topRated);
  console.log(`  Found ${topRated.length} top-rated movies`);
  
  // Phase 2: Movies by Decade (limited for initial run)
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: MOVIES BY DECADE');
  console.log('='.repeat(70));
  
  const decades = [1990, 2000, 2010]; // Focus on more recent decades
  for (const decade of decades) {
    const decadeMovies = await fetchByDecade(decade, 2); // Just 2 pages per decade
    allMovies.push(...decadeMovies);
    console.log(`  Found ${decadeMovies.length} movies from ${decade}s`);
  }
  
  // Remove duplicates
  const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.id, m])).values());
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 READY TO PROCESS ${uniqueMovies.length} UNIQUE MOVIES`);
  console.log('='.repeat(70));
  
  // Process in batches
  for (let i = 0; i < uniqueMovies.length; i += CONFIG.batchSize) {
    const batch = uniqueMovies.slice(i, i + CONFIG.batchSize);
    await processMovieBatch(batch);
    
    // Check if we've reached target
    const currentStats = await getCurrentStats();
    const currentTotal = currentStats?.vectors?.completedMovies || 0;
    
    if (currentTotal >= CONFIG.targetTotal) {
      console.log(`\n🎉 Target reached! Database has ${currentTotal} movies`);
      break;
    }
    
    // Delay between batches
    if (i + CONFIG.batchSize < uniqueMovies.length) {
      console.log(`\n⏳ Waiting ${CONFIG.delayBetweenBatches / 1000} seconds before next batch...`);
      await wait(CONFIG.delayBetweenBatches);
    }
  }
  
  // Final summary
  const finalStats = await getCurrentStats();
  const finalTotal = finalStats?.vectors?.completedMovies || 0;
  const duration = (Date.now() - progress.startTime) / 1000 / 60; // minutes
  
  console.log('\n' + '='.repeat(70));
  console.log('🏆 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`  Initial database: ${currentMovies} movies`);
  console.log(`  Final database: ${finalTotal} movies`);
  console.log(`  Movies added: ${progress.added}`);
  console.log(`  Movies skipped: ${progress.skipped}`);
  console.log(`  Movies failed: ${progress.failed}`);
  console.log(`  Total time: ${duration.toFixed(1)} minutes`);
  console.log(`  Average rate: ${(progress.processed / duration).toFixed(1)} movies/minute`);
  
  if (finalStats?.today) {
    const cost = (finalStats.today.openai_tokens || 0) * 0.10 / 1000000;
    console.log(`\n💰 Cost:`);
    console.log(`  OpenAI tokens: ${finalStats.today.openai_tokens}`);
    console.log(`  Estimated cost: $${cost.toFixed(4)}`);
  }
  
  console.log('\n✅ Database building complete!');
  console.log('\n💡 Next steps:');
  console.log('  1. Run analyze-quality.js to verify database quality');
  console.log('  2. Test recommendations with actual user preferences');
  console.log('  3. Fine-tune filters based on user feedback');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Process interrupted');
  showProgress();
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Run the script
main().catch(console.error);