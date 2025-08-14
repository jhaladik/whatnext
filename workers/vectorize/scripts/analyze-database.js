#!/usr/bin/env node

/**
 * Analyze current movie database distribution
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';

async function analyzeDatabase() {
  console.log('='.repeat(70));
  console.log('📊 DATABASE ANALYSIS - MOVIE DISTRIBUTION');
  console.log('='.repeat(70));
  
  // Get stats
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log(`\n📈 Total Movies: ${stats.vectors.completedMovies}`);
  
  // Sample some movies to understand the distribution
  const sampleIds = [
    // Classics
    238, 240, 424, 389, 129, 497, 510, 13, 550, 603,
    // 2000s
    120, 121, 122, 24428, 1726, 4935, 1124, 1892,
    // 2010s  
    27205, 76341, 118340, 157336, 263115, 284053, 299536,
    // 2020s
    438631, 507086, 616037, 634649, 760161, 872585,
    // Recent 2024-2025
    533535, 912649, 1184918, 1022789, 755898, 1195631
  ];
  
  const moviesByDecade = {
    '1970s': [],
    '1980s': [],
    '1990s': [],
    '2000s': [],
    '2010s': [],
    '2020s': []
  };
  
  const moviesByRating = {
    'excellent': [], // 8.0+
    'good': [],      // 7.0-7.9
    'decent': [],    // 6.0-6.9
    'poor': []       // below 6.0
  };
  
  const moviesByVotes = {
    'blockbuster': [], // 10000+ votes
    'popular': [],     // 5000-9999 votes
    'known': [],       // 1000-4999 votes
    'niche': []        // below 1000 votes
  };
  
  console.log('\n🔍 Sampling movies for analysis...\n');
  
  for (const movieId of sampleIds) {
    try {
      const response = await fetch(`${WORKER_URL}/debug?id=${movieId}`);
      const data = await response.json();
      
      if (data.movie) {
        const movie = data.movie;
        const year = parseInt(movie.year) || new Date(movie.release_date).getFullYear();
        const rating = movie.vote_average;
        const votes = movie.vote_count;
        
        // Categorize by decade
        if (year < 1980) moviesByDecade['1970s'].push(movie);
        else if (year < 1990) moviesByDecade['1980s'].push(movie);
        else if (year < 2000) moviesByDecade['1990s'].push(movie);
        else if (year < 2010) moviesByDecade['2000s'].push(movie);
        else if (year < 2020) moviesByDecade['2010s'].push(movie);
        else moviesByDecade['2020s'].push(movie);
        
        // Categorize by rating
        if (rating >= 8.0) moviesByRating['excellent'].push(movie);
        else if (rating >= 7.0) moviesByRating['good'].push(movie);
        else if (rating >= 6.0) moviesByRating['decent'].push(movie);
        else moviesByRating['poor'].push(movie);
        
        // Categorize by popularity
        if (votes >= 10000) moviesByVotes['blockbuster'].push(movie);
        else if (votes >= 5000) moviesByVotes['popular'].push(movie);
        else if (votes >= 1000) moviesByVotes['known'].push(movie);
        else moviesByVotes['niche'].push(movie);
        
        console.log(`  ${year} - ${movie.title}: ${rating}/10 (${votes} votes)`);
      }
    } catch (error) {
      // Skip
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 DISTRIBUTION ANALYSIS');
  console.log('='.repeat(70));
  
  console.log('\n🗓️ By Decade:');
  for (const [decade, movies] of Object.entries(moviesByDecade)) {
    console.log(`  ${decade}: ${movies.length} movies`);
    if (movies.length > 0) {
      const avgRating = movies.reduce((sum, m) => sum + m.vote_average, 0) / movies.length;
      console.log(`    Average rating: ${avgRating.toFixed(1)}`);
    }
  }
  
  console.log('\n⭐ By Rating:');
  for (const [category, movies] of Object.entries(moviesByRating)) {
    console.log(`  ${category}: ${movies.length} movies`);
  }
  
  console.log('\n👥 By Popularity:');
  for (const [category, movies] of Object.entries(moviesByVotes)) {
    console.log(`  ${category}: ${movies.length} movies`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS FOR WHATNEXT DATABASE');
  console.log('='.repeat(70));
  
  console.log('\n📌 Current Issues:');
  console.log('  1. Too many recent movies with low votes');
  console.log('  2. Not enough classic films that stood the test of time');
  console.log('  3. Missing cult classics and hidden gems');
  console.log('  4. Overrepresentation of blockbusters');
  
  console.log('\n✅ Ideal Database Composition:');
  console.log('  • 30% Timeless Classics (pre-2000, 8.0+ rating, 5000+ votes)');
  console.log('  • 30% Modern Classics (2000-2015, 7.5+ rating, 10000+ votes)');
  console.log('  • 20% Hidden Gems (any era, 7.0+ rating, 1000-5000 votes)');
  console.log('  • 15% Recent Excellence (2015+, 7.5+ rating, proven popularity)');
  console.log('  • 5% Cult Favorites (polarizing but beloved by specific audiences)');
  
  console.log('\n🎯 New Filtering Criteria:');
  console.log('  1. Minimum age: 2 years (except Oscar/festival winners)');
  console.log('  2. Minimum votes: 1000 (500 for pre-1990 films)');
  console.log('  3. Minimum rating: 6.5');
  console.log('  4. Special inclusion: AFI Top 100, IMDB Top 250, Criterion Collection');
  console.log('  5. Genre balance: Ensure diverse genres, not just action/sci-fi');
  
  console.log('\n📚 Data Sources for Quality Films:');
  console.log('  • TMDB Top Rated (all pages)');
  console.log('  • IMDB Top 250 list');
  console.log('  • Letterboxd highest rated');
  console.log('  • Academy Award winners/nominees');
  console.log('  • Cannes/Venice/Berlin festival winners');
  console.log('  • Genre-specific best lists (best horror, best romance, etc.)');
  console.log('  • Director retrospectives (Kubrick, Scorsese, Nolan, etc.)');
}

analyzeDatabase().catch(console.error);