#!/usr/bin/env node

/**
 * Evaluate a batch of movies with the curator
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';

async function fetchMovieFromTMDB(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return await response.json();
}

async function evaluateMovie(movieData, source = 'tmdb_discover') {
  const response = await fetch(`${WORKER_URL}/curator/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminKey: ADMIN_KEY,
      movieData: movieData,
      source: source
    })
  });
  
  return await response.json();
}

async function main() {
  console.log('='.repeat(70));
  console.log('🎯 CURATOR BATCH EVALUATION');
  console.log('='.repeat(70));
  
  // Test with a mix of movies - some that should pass, some that shouldn't
  const testMovieIds = [
    // High quality classics not in DB
    19404,  // Dilwale Dulhania Le Jayenge (1995) - already in DB
    11423,  // The Lives of Others (2006) - might not be in DB
    372058, // Your Name (2016) - anime classic
    
    // Recent high quality (should fail age requirement)
    615777, // Babylon (2022)
    
    // Low quality
    339964, // Valerian (2017) - big budget flop
    
    // Very old classic
    3078,   // Mr. Smith Goes to Washington (1939)
  ];
  
  console.log('\n📊 Evaluating Movies:\n');
  
  const results = {
    accepted: [],
    rejected: [],
    duplicates: [],
    errors: []
  };
  
  for (const movieId of testMovieIds) {
    console.log(`\nFetching movie ${movieId} from TMDB...`);
    const movieData = await fetchMovieFromTMDB(movieId);
    
    if (!movieData) {
      console.log('  ❌ Movie not found on TMDB');
      continue;
    }
    
    console.log(`\n📽️  ${movieData.title} (${new Date(movieData.release_date).getFullYear()})`);
    console.log(`  Rating: ${movieData.vote_average}/10`);
    console.log(`  Votes: ${movieData.vote_count}`);
    console.log(`  Genres: ${movieData.genres.map(g => g.name).join(', ')}`);
    
    // Evaluate with curator
    const decision = await evaluateMovie(movieData, 'test_batch');
    
    console.log(`  📋 Decision: ${decision.action.toUpperCase()}`);
    console.log(`     Reason: ${decision.reason}`);
    if (decision.score) {
      console.log(`     Score: ${decision.score.toFixed(1)}/100`);
    }
    
    // Track results
    switch(decision.action) {
      case 'accept':
        results.accepted.push({ id: movieId, title: movieData.title, score: decision.score });
        break;
      case 'reject':
        results.rejected.push({ id: movieId, title: movieData.title, reason: decision.reason });
        break;
      case 'duplicate':
        results.duplicates.push({ id: movieId, title: movieData.title });
        break;
      default:
        results.errors.push({ id: movieId, title: movieData.title, error: decision.reason });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 EVALUATION SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✅ Accepted (${results.accepted.length}):`);
  results.accepted.forEach(m => {
    console.log(`   ${m.title} - Score: ${m.score.toFixed(1)}`);
  });
  
  console.log(`\n❌ Rejected (${results.rejected.length}):`);
  results.rejected.forEach(m => {
    console.log(`   ${m.title}`);
    console.log(`      Reason: ${m.reason}`);
  });
  
  console.log(`\n🔄 Duplicates (${results.duplicates.length}):`);
  results.duplicates.forEach(m => {
    console.log(`   ${m.title}`);
  });
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors (${results.errors.length}):`);
    results.errors.forEach(m => {
      console.log(`   ${m.title}: ${m.error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (results.accepted.length > 0) {
    console.log(`   Process these ${results.accepted.length} accepted movies:`);
    console.log(`   Movie IDs: ${results.accepted.map(m => m.id).join(', ')}`);
  } else {
    console.log('   No movies passed curation criteria');
  }
  
  console.log('\n✅ Evaluation complete!');
}

main().catch(console.error);