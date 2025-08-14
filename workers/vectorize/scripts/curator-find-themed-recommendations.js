#!/usr/bin/env node

/**
 * Find themed high-quality movies to add to the database
 * Focuses on specific categories like animation, studio collections, etc.
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';

// Themed search categories
const THEMED_SEARCHES = {
  animation: [
    // Disney Classics
    { 
      name: 'Disney Golden Age', 
      with_companies: '2', // Disney
      year_min: 1937, 
      year_max: 1960,
      with_genres: '16', // Animation
      vote_avg_min: 7.0 
    },
    { 
      name: 'Disney Renaissance', 
      with_companies: '2',
      year_min: 1989, 
      year_max: 1999,
      with_genres: '16',
      vote_avg_min: 7.0 
    },
    { 
      name: 'Modern Disney Classics', 
      with_companies: '2',
      year_min: 2010, 
      year_max: 2023,
      with_genres: '16',
      vote_avg_min: 7.0 
    },
    
    // Pixar
    { 
      name: 'Pixar Masterpieces', 
      with_companies: '3', // Pixar
      with_genres: '16',
      vote_avg_min: 7.5,
      vote_count_min: 5000 
    },
    
    // Studio Ghibli
    { 
      name: 'Studio Ghibli Collection', 
      with_companies: '10342', // Studio Ghibli
      vote_avg_min: 7.0 
    },
    
    // DreamWorks Animation
    { 
      name: 'DreamWorks Animation', 
      with_companies: '521', // DreamWorks Animation
      with_genres: '16',
      vote_avg_min: 7.0,
      vote_count_min: 2000 
    },
    
    // Sony Pictures Animation
    { 
      name: 'Sony Animation (Spider-Verse)', 
      with_companies: '2251', // Sony Pictures Animation
      with_genres: '16',
      vote_avg_min: 7.0 
    },
    
    // Laika
    { 
      name: 'Laika Stop-Motion', 
      with_companies: '11537', // Laika
      vote_avg_min: 7.0 
    },
    
    // Classic Animation Studios
    { 
      name: 'Don Bluth Films', 
      with_crew: '13950', // Don Bluth
      with_genres: '16',
      vote_avg_min: 6.5 
    },
    
    // International Animation
    { 
      name: 'French Animation', 
      with_origin_country: 'FR',
      with_genres: '16',
      vote_avg_min: 7.0,
      vote_count_min: 1000 
    },
    { 
      name: 'Japanese Anime Films', 
      with_origin_country: 'JP',
      with_genres: '16',
      vote_avg_min: 7.5,
      vote_count_min: 2000,
      year_min: 1980 
    },
    
    // Award-Winning Animation
    { 
      name: 'Oscar-Nominated Animation', 
      with_genres: '16',
      vote_avg_min: 7.5,
      vote_count_min: 5000,
      year_min: 2000 
    },
    
    // Adult Animation
    { 
      name: 'Adult Animation Classics', 
      with_genres: '16',
      certification_country: 'US',
      certification: 'R',
      vote_avg_min: 7.0,
      vote_count_min: 1000 
    }
  ],
  
  classics: [
    // Musical Classics
    { 
      name: 'Classic Movie Musicals', 
      with_genres: '10402', // Music
      year_min: 1940,
      year_max: 1970,
      vote_avg_min: 7.5,
      vote_count_min: 1000 
    },
    
    // Family Classics
    { 
      name: 'Family Adventure Classics', 
      with_genres: '10751,12', // Family, Adventure
      year_min: 1960,
      year_max: 1990,
      vote_avg_min: 7.0,
      vote_count_min: 2000 
    },
    
    // Fantasy Epics
    { 
      name: 'Fantasy Epics', 
      with_genres: '14', // Fantasy
      runtime_min: 120,
      vote_avg_min: 7.5,
      vote_count_min: 5000 
    },
    
    // Superhero Origins
    { 
      name: 'Early Superhero Films', 
      with_keywords: '849|9715', // Superhero keywords
      year_max: 2005,
      vote_avg_min: 7.0 
    }
  ],
  
  international: [
    // Bollywood
    { 
      name: 'Bollywood Classics', 
      with_origin_country: 'IN',
      vote_avg_min: 8.0,
      vote_count_min: 1000,
      year_min: 1970 
    },
    
    // Chinese Cinema
    { 
      name: 'Chinese Wuxia & Drama', 
      with_origin_country: 'CN|HK',
      vote_avg_min: 7.5,
      vote_count_min: 1000 
    },
    
    // European Arthouse
    { 
      name: 'European Arthouse', 
      with_origin_country: 'FR|IT|DE|ES',
      vote_avg_min: 7.5,
      vote_count_min: 1000,
      year_min: 1960,
      year_max: 2000 
    }
  ]
};

async function searchTMDBWithParams(params, name) {
  const baseParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    sort_by: params.sort_by || 'vote_average.desc',
    include_adult: false,
    page: 1
  });
  
  // Add all parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'name' && value !== undefined && value !== null) {
      if (key.includes('year_min')) {
        baseParams.append('primary_release_date.gte', `${value}-01-01`);
      } else if (key.includes('year_max')) {
        baseParams.append('primary_release_date.lte', `${value}-12-31`);
      } else if (key === 'vote_avg_min') {
        baseParams.append('vote_average.gte', value.toString());
      } else if (key === 'vote_count_min') {
        baseParams.append('vote_count.gte', value.toString());
      } else if (key === 'runtime_min') {
        baseParams.append('with_runtime.gte', value.toString());
      } else if (key === 'with_origin_country') {
        baseParams.append('with_origin_country', value);
      } else if (key === 'with_companies') {
        baseParams.append('with_companies', value);
      } else if (key === 'with_genres') {
        baseParams.append('with_genres', value);
      } else if (key === 'with_keywords') {
        baseParams.append('with_keywords', value);
      } else if (key === 'with_crew') {
        baseParams.append('with_crew', value);
      } else if (key === 'certification_country') {
        baseParams.append('certification_country', value);
      } else if (key === 'certification') {
        baseParams.append('certification', value);
      }
    }
  });
  
  const url = `https://api.themoviedb.org/3/discover/movie?${baseParams}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  API error for ${name}: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`  ❌ Error searching ${name}:`, error.message);
    return [];
  }
}

async function evaluateWithCurator(movie, source) {
  try {
    const response = await fetch(`${WORKER_URL}/curator/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        movieData: movie,
        source: source
      })
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error evaluating ${movie.title}:`, error.message);
    return null;
  }
}

async function searchCategory(categoryName, searches) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎬 ${categoryName.toUpperCase()}`);
  console.log('='.repeat(80));
  
  const categoryResults = {
    highPriority: [],
    mediumPriority: [],
    alreadyHave: [],
    rejected: []
  };
  
  for (const search of searches) {
    console.log(`\n🔍 Searching: ${search.name}...`);
    
    const movies = await searchTMDBWithParams(search, search.name);
    
    if (movies.length === 0) {
      console.log('   No movies found');
      continue;
    }
    
    console.log(`   Found ${movies.length} movies, evaluating top candidates...`);
    
    // Evaluate top movies
    const topMovies = movies.slice(0, 8);
    let foundNew = 0;
    
    for (const movie of topMovies) {
      // Skip if low quality
      if (movie.vote_average < 6.0 || movie.vote_count < 100) {
        continue;
      }
      
      const decision = await evaluateWithCurator(movie, search.name);
      
      if (!decision) continue;
      
      const movieInfo = {
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown',
        rating: movie.vote_average,
        votes: movie.vote_count,
        score: decision.score,
        category: search.name,
        overview: movie.overview
      };
      
      if (decision.action === 'duplicate') {
        categoryResults.alreadyHave.push(movieInfo);
      } else if (decision.action === 'accept') {
        if (decision.score >= 80) {
          categoryResults.highPriority.push(movieInfo);
          foundNew++;
          console.log(`   ⭐ HIGH PRIORITY: ${movie.title} (${movieInfo.year}) - Score: ${decision.score}`);
        } else if (decision.score >= 70) {
          categoryResults.mediumPriority.push(movieInfo);
          foundNew++;
          console.log(`   ✅ Medium Priority: ${movie.title} (${movieInfo.year}) - Score: ${decision.score}`);
        }
      } else if (decision.action === 'reject') {
        categoryResults.rejected.push({ ...movieInfo, reason: decision.reason });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    if (foundNew === 0 && categoryResults.alreadyHave.length > 0) {
      console.log(`   ✓ Already have ${categoryResults.alreadyHave.length} movies from this category`);
    }
  }
  
  return categoryResults;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🎭 THEMED CURATOR RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('\nSearching for high-quality movies in specific themes...\n');
  
  const allRecommendations = {
    highPriority: [],
    mediumPriority: [],
    alreadyHave: [],
    rejected: []
  };
  
  // Search each category
  for (const [categoryName, searches] of Object.entries(THEMED_SEARCHES)) {
    const results = await searchCategory(categoryName, searches);
    
    // Merge results
    allRecommendations.highPriority.push(...results.highPriority);
    allRecommendations.mediumPriority.push(...results.mediumPriority);
    allRecommendations.alreadyHave.push(...results.alreadyHave);
    allRecommendations.rejected.push(...results.rejected);
  }
  
  // Sort by score
  allRecommendations.highPriority.sort((a, b) => b.score - a.score);
  allRecommendations.mediumPriority.sort((a, b) => b.score - a.score);
  
  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RECOMMENDATIONS REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Coverage Analysis:`);
  console.log(`  Already in database: ${allRecommendations.alreadyHave.length} movies`);
  console.log(`  New discoveries: ${allRecommendations.highPriority.length + allRecommendations.mediumPriority.length} movies`);
  console.log(`  Rejected: ${allRecommendations.rejected.length} movies`);
  
  if (allRecommendations.highPriority.length > 0) {
    console.log(`\n⭐ HIGH PRIORITY ADDITIONS (Score 80+):`);
    console.log('-'.repeat(80));
    
    allRecommendations.highPriority.slice(0, 20).forEach(m => {
      console.log(`\n${m.title} (${m.year})`);
      console.log(`  Category: ${m.category}`);
      console.log(`  TMDB: ${m.rating}/10 with ${m.votes.toLocaleString()} votes`);
      console.log(`  Curator Score: ${m.score}/100`);
      console.log(`  ID: ${m.id}`);
      if (m.overview) {
        console.log(`  Synopsis: ${m.overview.substring(0, 100)}...`);
      }
    });
  }
  
  if (allRecommendations.mediumPriority.length > 0) {
    console.log(`\n✅ MEDIUM PRIORITY ADDITIONS (Score 70-79):`);
    console.log('-'.repeat(80));
    
    allRecommendations.mediumPriority.slice(0, 10).forEach(m => {
      console.log(`  ${m.title} (${m.year}) - Score: ${m.score} - Category: ${m.category}`);
    });
  }
  
  // Category analysis
  console.log(`\n📂 CATEGORY BREAKDOWN:`);
  console.log('-'.repeat(80));
  
  const categoryStats = {};
  [...allRecommendations.highPriority, ...allRecommendations.mediumPriority].forEach(m => {
    if (!categoryStats[m.category]) {
      categoryStats[m.category] = { count: 0, movies: [] };
    }
    categoryStats[m.category].count++;
    categoryStats[m.category].movies.push(m.title);
  });
  
  Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.count} new movies`);
      console.log(`    Examples: ${stats.movies.slice(0, 3).join(', ')}`);
    });
  
  // Action items
  if (allRecommendations.highPriority.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 RECOMMENDED ACTIONS');
    console.log('='.repeat(80));
    
    const topIds = allRecommendations.highPriority.slice(0, 10).map(m => m.id);
    
    console.log('\n1. Add top 10 HIGH PRIORITY movies to queue:');
    console.log(`   Movie IDs: [${topIds.join(', ')}]`);
    
    console.log('\n2. Run this command to add them:');
    console.log(`   curl -X POST ${WORKER_URL}/add-to-queue \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"adminKey": "${ADMIN_KEY}", "movieIds": [${topIds.join(', ')}], "priority": 10}'`);
    
    console.log('\n3. Then process them:');
    console.log(`   curl -X POST ${WORKER_URL}/process-queue \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"adminKey": "${ADMIN_KEY}", "batchSize": 1, "maxMovies": 10}'`);
  } else {
    console.log('\n✨ Your database has excellent coverage!');
    console.log('   No high-priority additions found in the searched categories.');
  }
  
  console.log('\n✅ Themed recommendation search complete!');
}

main().catch(console.error);