#!/usr/bin/env node

/**
 * Find high-quality movies to add to the database
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';

// Categories to search for quality movies
const SEARCH_CATEGORIES = [
  // Award winners
  { name: 'Oscar Best Picture Winners', query: 'oscar best picture', year_min: 1980 },
  { name: 'Cannes Palme d\'Or Winners', query: 'cannes palme d\'or', year_min: 1980 },
  { name: 'Venice Golden Lion', query: 'venice golden lion', year_min: 1980 },
  
  // Acclaimed directors' works
  { name: 'Kubrick Films', query: 'stanley kubrick', year_min: 1960 },
  { name: 'Kurosawa Films', query: 'akira kurosawa', year_min: 1950 },
  { name: 'Tarkovsky Films', query: 'andrei tarkovsky', year_min: 1960 },
  { name: 'Bergman Films', query: 'ingmar bergman', year_min: 1950 },
  { name: 'Hitchcock Films', query: 'alfred hitchcock', year_min: 1940 },
  
  // High-rated classics by decade
  { name: '1940s Classics', year_min: 1940, year_max: 1949, vote_avg_min: 7.5 },
  { name: '1950s Classics', year_min: 1950, year_max: 1959, vote_avg_min: 7.5 },
  { name: '1960s Classics', year_min: 1960, year_max: 1969, vote_avg_min: 7.5 },
  { name: '1970s Classics', year_min: 1970, year_max: 1979, vote_avg_min: 7.5 },
  { name: '1980s Classics', year_min: 1980, year_max: 1989, vote_avg_min: 7.5 },
  
  // International cinema
  { name: 'Japanese Cinema', region: 'JP', vote_avg_min: 7.5, year_min: 1950 },
  { name: 'French New Wave', region: 'FR', year_min: 1958, year_max: 1970 },
  { name: 'Italian Neorealism', region: 'IT', year_min: 1943, year_max: 1965 },
  { name: 'Korean Cinema', region: 'KR', vote_avg_min: 7.5, year_min: 2000 },
  { name: 'Indian Cinema', region: 'IN', vote_avg_min: 8.0, year_min: 1970 },
  
  // Criterion Collection overlap
  { name: 'Criterion Collection', query: 'criterion collection', vote_avg_min: 7.0 },
  
  // Film Noir
  { name: 'Film Noir Classics', with_genres: '80', year_min: 1940, year_max: 1960 },
  
  // Silent Era Masterpieces
  { name: 'Silent Era', year_max: 1929, vote_avg_min: 7.5, vote_count_min: 500 }
];

async function searchTMDB(category) {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    sort_by: 'vote_average.desc',
    'vote_count.gte': category.vote_count_min || 1000,
    'vote_average.gte': category.vote_avg_min || 7.0,
    include_adult: false,
    page: 1
  });
  
  if (category.year_min) params.append('primary_release_date.gte', `${category.year_min}-01-01`);
  if (category.year_max) params.append('primary_release_date.lte', `${category.year_max}-12-31`);
  if (category.region) params.append('region', category.region);
  if (category.with_genres) params.append('with_genres', category.with_genres);
  if (category.query) params.append('query', category.query);
  
  const endpoint = category.query ? 'search/movie' : 'discover/movie';
  const url = `https://api.themoviedb.org/3/${endpoint}?${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error searching ${category.name}:`, error.message);
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

async function main() {
  console.log('='.repeat(80));
  console.log('🎬 CURATOR MOVIE RECOMMENDATION FINDER');
  console.log('='.repeat(80));
  
  const recommendations = {
    highPriority: [],    // Score 80+, not in DB
    mediumPriority: [],  // Score 70-79, not in DB
    alreadyHave: [],     // High quality, already in DB
    rejected: []         // Didn't pass curator criteria
  };
  
  let totalSearched = 0;
  let totalEvaluated = 0;
  
  for (const category of SEARCH_CATEGORIES) {
    console.log(`\n🔍 Searching: ${category.name}...`);
    
    const movies = await searchTMDB(category);
    totalSearched += movies.length;
    
    if (movies.length === 0) {
      console.log('   No movies found');
      continue;
    }
    
    console.log(`   Found ${movies.length} movies`);
    
    // Evaluate top 5 from each category
    const topMovies = movies.slice(0, 5);
    
    for (const movie of topMovies) {
      totalEvaluated++;
      
      // Skip if low quality based on basic metrics
      if (movie.vote_average < 6.5 || movie.vote_count < 500) {
        continue;
      }
      
      const decision = await evaluateWithCurator(movie, category.name);
      
      if (!decision) continue;
      
      const movieInfo = {
        id: movie.id,
        title: movie.title,
        year: new Date(movie.release_date).getFullYear(),
        rating: movie.vote_average,
        votes: movie.vote_count,
        score: decision.score,
        category: category.name
      };
      
      if (decision.action === 'duplicate') {
        recommendations.alreadyHave.push(movieInfo);
      } else if (decision.action === 'accept') {
        if (decision.score >= 80) {
          recommendations.highPriority.push(movieInfo);
          console.log(`   ⭐ HIGH PRIORITY: ${movie.title} (${movieInfo.year}) - Score: ${decision.score}`);
        } else if (decision.score >= 70) {
          recommendations.mediumPriority.push(movieInfo);
          console.log(`   ✅ Medium Priority: ${movie.title} (${movieInfo.year}) - Score: ${decision.score}`);
        }
      } else if (decision.action === 'reject') {
        recommendations.rejected.push({ ...movieInfo, reason: decision.reason });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  
  // Sort recommendations by score
  recommendations.highPriority.sort((a, b) => b.score - a.score);
  recommendations.mediumPriority.sort((a, b) => b.score - a.score);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RECOMMENDATION SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\nTotal movies searched: ${totalSearched}`);
  console.log(`Total movies evaluated: ${totalEvaluated}`);
  
  console.log(`\n⭐ HIGH PRIORITY ADDITIONS (Score 80+): ${recommendations.highPriority.length} movies`);
  if (recommendations.highPriority.length > 0) {
    console.log('-'.repeat(80));
    recommendations.highPriority.slice(0, 20).forEach(m => {
      console.log(`  ${m.title} (${m.year})`);
      console.log(`    Category: ${m.category}`);
      console.log(`    TMDB: ${m.rating}/10 with ${m.votes.toLocaleString()} votes`);
      console.log(`    Curator Score: ${m.score}/100`);
      console.log(`    ID: ${m.id}`);
      console.log('');
    });
  }
  
  console.log(`\n✅ MEDIUM PRIORITY ADDITIONS (Score 70-79): ${recommendations.mediumPriority.length} movies`);
  if (recommendations.mediumPriority.length > 0) {
    console.log('-'.repeat(80));
    recommendations.mediumPriority.slice(0, 10).forEach(m => {
      console.log(`  ${m.title} (${m.year}) - Score: ${m.score} - ID: ${m.id}`);
    });
  }
  
  console.log(`\n📚 ALREADY IN DATABASE: ${recommendations.alreadyHave.length} movies`);
  console.log(`❌ REJECTED BY CURATOR: ${recommendations.rejected.length} movies`);
  
  // Create list of IDs to add
  const toAdd = [
    ...recommendations.highPriority.map(m => m.id),
    ...recommendations.mediumPriority.slice(0, 10).map(m => m.id)
  ];
  
  if (toAdd.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 RECOMMENDED ACTIONS');
    console.log('='.repeat(80));
    
    console.log('\n1. To add HIGH PRIORITY movies to queue:');
    console.log(`   Movie IDs: [${recommendations.highPriority.slice(0, 10).map(m => m.id).join(', ')}]`);
    
    console.log('\n2. To process them:');
    console.log('   Use /add-to-queue endpoint with the movie IDs');
    console.log('   Then use /process-queue to vectorize them');
    
    console.log('\n3. Categories needing attention:');
    const categoriesNeedingMovies = new Set();
    recommendations.highPriority.forEach(m => categoriesNeedingMovies.add(m.category));
    categoriesNeedingMovies.forEach(cat => {
      const count = recommendations.highPriority.filter(m => m.category === cat).length;
      console.log(`   - ${cat}: ${count} movies recommended`);
    });
  }
  
  console.log('\n✅ Recommendation search complete!');
}

main().catch(console.error);