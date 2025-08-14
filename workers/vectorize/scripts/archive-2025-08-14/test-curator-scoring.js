#!/usr/bin/env node

/**
 * Test the improved curator scoring system
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

async function testMovieScoring() {
  console.log('='.repeat(70));
  console.log('🎯 TESTING IMPROVED CURATOR SCORING');
  console.log('='.repeat(70));
  
  // Test movies with varying quality
  const testMovies = [
    // Classic masterpiece
    {
      id: 238,
      title: "The Godfather",
      release_date: "1972-03-14",
      vote_average: 8.7,
      vote_count: 21000,
      popularity: 150,
      genre_ids: [18, 80]  // Drama, Crime
    },
    
    // Good recent movie
    {
      id: 680,
      title: "Pulp Fiction",
      release_date: "1994-09-10",
      vote_average: 8.5,
      vote_count: 27000,
      popularity: 85,
      genre_ids: [53, 80]  // Thriller, Crime
    },
    
    // Decent animated movie
    {
      id: 862,
      title: "Toy Story",
      release_date: "1995-10-30",
      vote_average: 7.9,
      vote_count: 18000,
      popularity: 65,
      genre_ids: [16, 35, 10751]  // Animation, Comedy, Family
    },
    
    // Average movie
    {
      id: 1234567,
      title: "Average Movie",
      release_date: "2010-01-01",
      vote_average: 6.5,
      vote_count: 2000,
      popularity: 25,
      genre_ids: [28]  // Action
    },
    
    // Recent blockbuster
    {
      id: 872585,
      title: "Oppenheimer",
      release_date: "2023-07-19",
      vote_average: 8.1,
      vote_count: 9000,
      popularity: 120,
      genre_ids: [18, 36]  // Drama, History
    },
    
    // Old classic
    {
      id: 3078,
      title: "It Happened One Night",
      release_date: "1934-02-22",
      vote_average: 7.8,
      vote_count: 1300,
      popularity: 12,
      genre_ids: [35, 10749]  // Comedy, Romance
    },
    
    // Low quality recent
    {
      id: 999999,
      title: "Bad Recent Movie",
      release_date: "2024-01-01",
      vote_average: 4.5,
      vote_count: 150,
      popularity: 5,
      genre_ids: [27]  // Horror
    }
  ];
  
  console.log('\n📊 Movie Evaluations with New Scoring:\n');
  console.log('Score breakdown: Rating(40%) + Votes(20%) + Age(15%) + Cultural(15%) + Genre(5%) + Popularity(5%)\n');
  
  const results = [];
  
  for (const movie of testMovies) {
    const year = new Date(movie.release_date).getFullYear();
    const age = new Date().getFullYear() - year;
    
    console.log(`\n${movie.title} (${year})`);
    console.log(`  Rating: ${movie.vote_average}/10 | Votes: ${movie.vote_count.toLocaleString()} | Age: ${age} years`);
    
    try {
      const response = await fetch(`${WORKER_URL}/curator/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: ADMIN_KEY,
          movieData: movie,
          source: 'scoring_test'
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
      if (decision.score !== undefined) {
        console.log(`  📊 Score: ${decision.score}/100`);
      }
      if (decision.reason) {
        console.log(`  💭 Reason: ${decision.reason}`);
      }
      
      results.push({
        title: movie.title,
        year: year,
        score: decision.score || 0,
        action: decision.action
      });
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Sort and display summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SCORING SUMMARY (Sorted by Score)');
  console.log('='.repeat(70));
  
  results
    .filter(r => r.action !== 'duplicate')
    .sort((a, b) => b.score - a.score)
    .forEach(r => {
      const bar = '█'.repeat(Math.floor(r.score / 5));
      const emptyBar = '░'.repeat(20 - Math.floor(r.score / 5));
      console.log(`${bar}${emptyBar} ${r.score.toString().padStart(5)} - ${r.title} (${r.year})`);
    });
  
  console.log('\n✅ Scoring test complete!');
  console.log('\nScoring should now be more realistic:');
  console.log('  90-100: Absolute masterpieces');
  console.log('  80-89:  Excellent films');
  console.log('  70-79:  Very good films');
  console.log('  60-69:  Good films worth adding');
  console.log('  50-59:  Decent films (borderline)');
  console.log('  <50:    Generally rejected');
}

testMovieScoring().catch(console.error);