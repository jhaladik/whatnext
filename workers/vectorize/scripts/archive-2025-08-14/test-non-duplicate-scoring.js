#!/usr/bin/env node

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

// Movies likely NOT in database (fake IDs)
const newMovies = [
  {
    id: 99999901,
    title: "Fictional Masterpiece",
    release_date: "1975-06-15",
    vote_average: 8.8,
    vote_count: 25000,
    popularity: 95,
    genre_ids: [18]  // Drama
  },
  {
    id: 99999902,
    title: "Good Recent Film",
    release_date: "2020-03-10",
    vote_average: 7.5,
    vote_count: 8000,
    popularity: 45,
    genre_ids: [35, 18]  // Comedy, Drama
  },
  {
    id: 99999903,
    title: "Average Old Film",
    release_date: "1985-01-01",
    vote_average: 6.8,
    vote_count: 3000,
    popularity: 15,
    genre_ids: [28]  // Action
  },
  {
    id: 99999904,
    title: "Perfect Animation",
    release_date: "2000-01-01",
    vote_average: 9.2,
    vote_count: 50000,
    popularity: 120,
    genre_ids: [16]  // Animation (gets genre bonus)
  },
  {
    id: 99999905,
    title: "Mediocre Recent",
    release_date: "2022-01-01",
    vote_average: 6.0,
    vote_count: 1500,
    popularity: 20,
    genre_ids: [27]  // Horror
  }
];

async function test() {
  console.log('Testing non-duplicate movies for realistic scoring:');
  console.log('='.repeat(60));
  console.log();
  
  for (const movie of newMovies) {
    const response = await fetch(`${WORKER_URL}/curator/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        movieData: movie,
        source: 'test'
      })
    });
    
    const result = await response.json();
    const year = new Date(movie.release_date).getFullYear();
    
    console.log(`${movie.title} (${year})`);
    console.log(`  Rating: ${movie.vote_average}/10, Votes: ${movie.vote_count}`);
    console.log(`  Score: ${result.score || 'N/A'}/100`);
    console.log(`  Action: ${result.action}`);
    if (result.reason) console.log(`  Reason: ${result.reason}`);
    console.log();
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Expected scoring ranges:');
  console.log('  85-100: Masterpieces (Godfather, Shawshank level)');
  console.log('  75-84:  Excellent films');
  console.log('  65-74:  Very good films');
  console.log('  55-64:  Good films worth adding');
  console.log('  45-54:  Decent films (borderline)');
  console.log('  <45:    Generally rejected');
}

test().catch(console.error);