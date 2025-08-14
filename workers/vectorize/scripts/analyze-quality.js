#!/usr/bin/env node

/**
 * Analyze database quality and identify movies to remove
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';

// Sample a range of movie IDs to analyze quality
async function sampleMovies(count = 100) {
  const movies = [];
  const randomIds = [];
  
  // Generate random movie IDs to sample
  for (let i = 0; i < count; i++) {
    // Sample from different ID ranges
    if (i < 20) {
      randomIds.push(Math.floor(Math.random() * 1000) + 1); // Early IDs (classics)
    } else if (i < 40) {
      randomIds.push(Math.floor(Math.random() * 10000) + 1000); // Mid-range
    } else if (i < 60) {
      randomIds.push(Math.floor(Math.random() * 100000) + 10000); // Later releases
    } else if (i < 80) {
      randomIds.push(Math.floor(Math.random() * 500000) + 100000); // Recent
    } else {
      randomIds.push(Math.floor(Math.random() * 1000000) + 500000); // Very recent
    }
  }
  
  for (const movieId of randomIds) {
    try {
      const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
      const data = await response.json();
      
      if (data.movie) {
        movies.push(data.movie);
      }
    } catch (error) {
      // Skip
    }
  }
  
  return movies;
}

function analyzeMovies(movies) {
  const analysis = {
    byYear: {},
    byRating: {
      excellent: [], // 8.0+
      good: [],      // 7.0-7.9
      decent: [],    // 6.0-6.9
      poor: [],      // below 6.0
      noRating: []   // undefined
    },
    byVotes: {
      blockbuster: [], // 10000+
      popular: [],     // 5000-9999
      known: [],       // 1000-4999
      niche: [],       // 100-999
      obscure: [],     // below 100
      noVotes: []      // undefined
    },
    toRemove: []
  };
  
  for (const movie of movies) {
    // Parse year
    const year = movie.year || (movie.release_date ? new Date(movie.release_date).getFullYear() : 0);
    const decade = year ? `${Math.floor(year/10)*10}s` : 'Unknown';
    
    if (!analysis.byYear[decade]) {
      analysis.byYear[decade] = [];
    }
    analysis.byYear[decade].push(movie);
    
    // Categorize by rating
    const rating = movie.vote_average;
    if (!rating) {
      analysis.byRating.noRating.push(movie);
    } else if (rating >= 8.0) {
      analysis.byRating.excellent.push(movie);
    } else if (rating >= 7.0) {
      analysis.byRating.good.push(movie);
    } else if (rating >= 6.0) {
      analysis.byRating.decent.push(movie);
    } else {
      analysis.byRating.poor.push(movie);
      analysis.toRemove.push(movie); // Mark for removal
    }
    
    // Categorize by votes
    const votes = movie.vote_count;
    if (!votes) {
      analysis.byVotes.noVotes.push(movie);
      analysis.toRemove.push(movie); // Mark for removal
    } else if (votes >= 10000) {
      analysis.byVotes.blockbuster.push(movie);
    } else if (votes >= 5000) {
      analysis.byVotes.popular.push(movie);
    } else if (votes >= 1000) {
      analysis.byVotes.known.push(movie);
    } else if (votes >= 100) {
      analysis.byVotes.niche.push(movie);
    } else {
      analysis.byVotes.obscure.push(movie);
      
      // Mark recent movies with low votes for removal
      if (year >= 2020) {
        analysis.toRemove.push(movie);
      }
    }
    
    // Additional removal criteria
    const age = new Date().getFullYear() - year;
    
    // Remove very recent movies (2024-2025)
    if (year >= 2024) {
      if (!analysis.toRemove.includes(movie)) {
        analysis.toRemove.push(movie);
      }
    }
    
    // Remove movies that don't meet era-specific criteria
    if (year >= 2023 && votes < 50000) {
      if (!analysis.toRemove.includes(movie)) {
        analysis.toRemove.push(movie);
      }
    } else if (year >= 2016 && year < 2023 && votes < 20000) {
      if (!analysis.toRemove.includes(movie)) {
        analysis.toRemove.push(movie);
      }
    }
  }
  
  return analysis;
}

async function main() {
  console.log('='.repeat(70));
  console.log('📊 DATABASE QUALITY ANALYSIS');
  console.log('='.repeat(70));
  
  console.log('\n🔍 Sampling 100 random movies from database...\n');
  
  const movies = await sampleMovies(100);
  console.log(`  Sampled ${movies.length} movies`);
  
  const analysis = analyzeMovies(movies);
  
  console.log('\n' + '='.repeat(70));
  console.log('📈 SAMPLE ANALYSIS');
  console.log('='.repeat(70));
  
  console.log('\n🗓️ By Decade:');
  for (const [decade, decadeMovies] of Object.entries(analysis.byYear)) {
    console.log(`  ${decade}: ${decadeMovies.length} movies`);
  }
  
  console.log('\n⭐ By Rating:');
  console.log(`  Excellent (8.0+): ${analysis.byRating.excellent.length}`);
  console.log(`  Good (7.0-7.9): ${analysis.byRating.good.length}`);
  console.log(`  Decent (6.0-6.9): ${analysis.byRating.decent.length}`);
  console.log(`  Poor (<6.0): ${analysis.byRating.poor.length}`);
  console.log(`  No Rating: ${analysis.byRating.noRating.length}`);
  
  console.log('\n👥 By Popularity:');
  console.log(`  Blockbuster (10k+): ${analysis.byVotes.blockbuster.length}`);
  console.log(`  Popular (5k-10k): ${analysis.byVotes.popular.length}`);
  console.log(`  Known (1k-5k): ${analysis.byVotes.known.length}`);
  console.log(`  Niche (100-1k): ${analysis.byVotes.niche.length}`);
  console.log(`  Obscure (<100): ${analysis.byVotes.obscure.length}`);
  console.log(`  No Votes: ${analysis.byVotes.noVotes.length}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('🗑️ MOVIES TO REMOVE');
  console.log('='.repeat(70));
  
  // Remove duplicates from toRemove list
  const uniqueToRemove = [...new Map(analysis.toRemove.map(m => [m.tmdb_id, m])).values()];
  
  console.log(`\n❌ Found ${uniqueToRemove.length} movies that don't meet quality criteria:\n`);
  
  for (const movie of uniqueToRemove.slice(0, 20)) {
    const year = movie.year || 'Unknown';
    const rating = movie.vote_average || 'N/A';
    const votes = movie.vote_count || 0;
    console.log(`  • ${movie.title} (${year})`);
    console.log(`    Rating: ${rating}/10, Votes: ${votes}`);
    console.log(`    Reason: ${getReason(movie)}`);
  }
  
  if (uniqueToRemove.length > 20) {
    console.log(`\n  ... and ${uniqueToRemove.length - 20} more`);
  }
  
  // Extrapolate to full database
  const sampleRate = movies.length / 4722;
  const estimatedBadMovies = Math.round(uniqueToRemove.length / sampleRate);
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  console.log(`\n📊 Based on this sample:`);
  console.log(`  • ${((uniqueToRemove.length / movies.length) * 100).toFixed(1)}% don't meet quality criteria`);
  console.log(`  • Estimated ${estimatedBadMovies} movies to remove from full database`);
  
  console.log('\n🎯 Suggested Actions:');
  console.log('  1. Remove all 2024-2025 releases');
  console.log('  2. Remove movies with <100 votes');
  console.log('  3. Remove movies with <6.0 rating');
  console.log('  4. Apply strict era-specific criteria');
  console.log('  5. Focus on proven classics and beloved films');
  
  console.log('\n✨ Target Database:');
  console.log('  • 10,000-15,000 high-quality films');
  console.log('  • Average rating >7.5');
  console.log('  • Average votes >10,000');
  console.log('  • Balanced decade representation');
}

function getReason(movie) {
  const year = movie.year || 0;
  const votes = movie.vote_count || 0;
  const rating = movie.vote_average || 0;
  
  if (year >= 2024) return 'Too recent (2024-2025)';
  if (votes < 100) return 'Insufficient votes (<100)';
  if (rating < 6.0) return 'Low rating (<6.0)';
  if (year >= 2023 && votes < 50000) return '2023+ needs 50k+ votes';
  if (year >= 2016 && year < 2023 && votes < 20000) return '2016-2022 needs 20k+ votes';
  return 'Does not meet quality criteria';
}

main().catch(console.error);