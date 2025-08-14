#!/usr/bin/env node

/**
 * Test the Curator Service
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';

async function testCuratorEvaluation() {
  console.log('='.repeat(70));
  console.log('🧪 CURATOR SERVICE TEST');
  console.log('='.repeat(70));
  
  // Test movies with different characteristics
  const testMovies = [
    {
      id: 872585,
      title: "Oppenheimer",
      release_date: "2023-07-19",
      vote_average: 8.1,
      vote_count: 9000,
      genre_ids: [18, 36]  // Drama, History
    },
    {
      id: 1234567,  // Fake movie
      title: "Low Quality Movie",
      release_date: "2024-01-01",
      vote_average: 5.5,
      vote_count: 100,
      genre_ids: [28]  // Action
    },
    {
      id: 19404,
      title: "Dilwale Dulhania Le Jayenge",
      release_date: "1995-10-20",
      vote_average: 8.5,
      vote_count: 4500,
      genre_ids: [35, 18, 10749]  // Comedy, Drama, Romance
    }
  ];
  
  console.log('\n📊 Testing Movie Evaluations:\n');
  
  for (const movie of testMovies) {
    console.log(`\nEvaluating: ${movie.title}`);
    console.log(`  Year: ${new Date(movie.release_date).getFullYear()}`);
    console.log(`  Rating: ${movie.vote_average}/10`);
    console.log(`  Votes: ${movie.vote_count}`);
    
    try {
      const response = await fetch(`${WORKER_URL}/curator/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: ADMIN_KEY,
          movieData: movie,
          source: 'test'
        })
      });
      
      if (!response.ok) {
        console.log(`  ❌ HTTP Error: ${response.status}`);
        continue;
      }
      
      const decision = await response.json();
      
      const emoji = decision.action === 'accept' ? '✅' : 
                    decision.action === 'reject' ? '❌' :
                    decision.action === 'duplicate' ? '🔄' : '⏸️';
      
      console.log(`  ${emoji} Decision: ${decision.action.toUpperCase()}`);
      console.log(`     Reason: ${decision.reason}`);
      if (decision.score) {
        console.log(`     Score: ${decision.score.toFixed(1)}/100`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '-'.repeat(70));
  
  // Test curator stats (though it might be empty initially)
  console.log('\n📈 Fetching Curator Stats...\n');
  
  try {
    const statsResponse = await fetch(`${WORKER_URL}/curator/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        days: 30
      })
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Last 30 Days:');
      console.log(`  Total Evaluated: ${stats.totalEvaluated}`);
      console.log(`  Accepted: ${stats.accepted}`);
      console.log(`  Rejected: ${stats.rejected}`);
      console.log(`  Duplicates: ${stats.duplicates}`);
      if (stats.averageScore) {
        console.log(`  Average Score: ${stats.averageScore.toFixed(1)}`);
      }
    } else {
      console.log('  ⚠️  Stats endpoint returned error');
    }
  } catch (error) {
    console.log(`  ❌ Error fetching stats: ${error.message}`);
  }
  
  console.log('\n' + '-'.repeat(70));
  
  // Test suggestions
  console.log('\n💡 Getting Curator Suggestions...\n');
  
  try {
    const suggestResponse = await fetch(`${WORKER_URL}/curator/suggestions`);
    
    if (suggestResponse.ok) {
      const suggestions = await suggestResponse.json();
      console.log('Suggestions:');
      console.log(`  Underrepresented Genres: ${suggestions.underrepresentedGenres.join(', ')}`);
      console.log(`  Missing Decades: ${suggestions.missingDecades.join(', ')}`);
      if (suggestions.lowQualityToRemove && suggestions.lowQualityToRemove.length > 0) {
        console.log(`  Low Quality Movies to Remove: ${suggestions.lowQualityToRemove.slice(0, 5).join(', ')}...`);
      }
    } else {
      console.log('  ⚠️  Suggestions endpoint returned error');
    }
  } catch (error) {
    console.log(`  ❌ Error fetching suggestions: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Curator test complete!');
}

testCuratorEvaluation().catch(console.error);