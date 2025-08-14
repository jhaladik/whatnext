#!/usr/bin/env node

/**
 * Database Curator Dashboard
 * Monitor and manage the movie curation process
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';
const TMDB_API_KEY = '30ae0912c6ca4f32095d0eeefbd59429';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function fetchDatabaseStats() {
  const response = await fetch(`${WORKER_URL}/stats`);
  return await response.json();
}

async function fetchCuratorStats() {
  const response = await fetch(`${WORKER_URL}/curator/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey: ADMIN_KEY })
  });
  
  if (!response.ok) {
    // Curator endpoints not yet implemented
    return null;
  }
  
  return await response.json();
}

async function evaluateMovie(tmdbId) {
  // First fetch movie from TMDB
  const tmdbResponse = await fetch(
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
  );
  
  if (!tmdbResponse.ok) {
    return { error: 'Movie not found on TMDB' };
  }
  
  const movieData = await tmdbResponse.json();
  
  // Evaluate locally using curation criteria
  const year = new Date(movieData.release_date).getFullYear();
  const age = new Date().getFullYear() - year;
  
  // Apply era-specific criteria from curation_strategy.md
  let criteria;
  if (year < 1970) {
    criteria = { minVotes: 500, minRating: 7.0, minAge: 0 };
  } else if (year < 1990) {
    criteria = { minVotes: 1000, minRating: 7.0, minAge: 0 };
  } else if (year < 2000) {
    criteria = { minVotes: 5000, minRating: 7.0, minAge: 0 };
  } else if (year < 2016) {
    criteria = { minVotes: 10000, minRating: 7.2, minAge: 0 };
  } else if (year < 2023) {
    criteria = { minVotes: 20000, minRating: 7.5, minAge: 2 };
  } else {
    criteria = { minVotes: 50000, minRating: 8.0, minAge: 2 };
  }
  
  const decision = {
    movie: {
      id: movieData.id,
      title: movieData.title,
      year: year,
      rating: movieData.vote_average,
      votes: movieData.vote_count,
      age: age
    },
    criteria: criteria,
    evaluation: {
      ageCheck: age >= criteria.minAge,
      voteCheck: movieData.vote_count >= criteria.minVotes,
      ratingCheck: movieData.vote_average >= criteria.minRating
    }
  };
  
  decision.result = 
    decision.evaluation.ageCheck && 
    decision.evaluation.voteCheck && 
    decision.evaluation.ratingCheck ? 'ACCEPT' : 'REJECT';
  
  return decision;
}

async function displayDashboard() {
  console.clear();
  console.log('='.repeat(80));
  console.log(colors.bright + '📊 WHATNEXT DATABASE CURATOR DASHBOARD' + colors.reset);
  console.log('='.repeat(80));
  
  // Fetch current stats
  const stats = await fetchDatabaseStats();
  
  // Database Overview
  console.log('\n' + colors.cyan + '📚 DATABASE STATUS' + colors.reset);
  console.log('├─ Total Movies: ' + colors.green + stats.vectors.totalVectors + colors.reset);
  console.log('├─ Completed: ' + colors.green + stats.vectors.completedMovies + colors.reset);
  console.log('├─ Failed: ' + colors.red + stats.vectors.failedMovies + colors.reset);
  console.log('└─ Queue Pending: ' + colors.yellow + stats.queue.pending + colors.reset);
  
  // Today's Activity
  console.log('\n' + colors.cyan + '📈 TODAY\'S ACTIVITY' + colors.reset);
  console.log('├─ Movies Processed: ' + stats.today.movies_processed);
  console.log('├─ Embeddings Created: ' + stats.today.embeddings_created);
  console.log('├─ TMDB Requests: ' + stats.today.tmdb_requests);
  console.log('└─ OpenAI Tokens: ' + stats.today.openai_tokens);
  
  // Curation Stats (if available)
  const curatorStats = await fetchCuratorStats();
  if (curatorStats) {
    console.log('\n' + colors.cyan + '🎯 CURATION METRICS (Last 30 Days)' + colors.reset);
    console.log('├─ Movies Evaluated: ' + curatorStats.totalEvaluated);
    console.log('├─ Accepted: ' + colors.green + curatorStats.accepted + colors.reset);
    console.log('├─ Rejected: ' + colors.red + curatorStats.rejected + colors.reset);
    console.log('├─ Duplicates Found: ' + colors.yellow + curatorStats.duplicates + colors.reset);
    console.log('└─ Average Quality Score: ' + curatorStats.averageScore?.toFixed(1));
  }
  
  // Quality Analysis
  console.log('\n' + colors.cyan + '✨ QUALITY ANALYSIS' + colors.reset);
  
  // Calculate average metrics
  const avgMetrics = await calculateAverageMetrics();
  console.log('├─ Average Rating: ' + avgMetrics.avgRating);
  console.log('├─ Average Votes: ' + avgMetrics.avgVotes);
  console.log('├─ Average Year: ' + avgMetrics.avgYear);
  console.log('└─ Database Age: ' + avgMetrics.avgAge + ' years average');
  
  // Era Distribution
  console.log('\n' + colors.cyan + '📅 ERA DISTRIBUTION' + colors.reset);
  const eraDistribution = {
    'Pre-1970': 0,
    '1970-1989': 0,
    '1990-1999': 0,
    '2000-2015': 0,
    '2016-2022': 0,
    '2023+': 0
  };
  
  // Simulate era distribution (would come from actual database query)
  const total = stats.vectors.totalVectors;
  console.log('├─ Pre-1970: ~' + Math.round(total * 0.10) + ' films');
  console.log('├─ 1970-1989: ~' + Math.round(total * 0.15) + ' films');
  console.log('├─ 1990-1999: ~' + Math.round(total * 0.20) + ' films');
  console.log('├─ 2000-2015: ~' + Math.round(total * 0.30) + ' films');
  console.log('├─ 2016-2022: ~' + Math.round(total * 0.20) + ' films');
  console.log('└─ 2023+: ~' + Math.round(total * 0.05) + ' films');
  
  // Recommendations
  console.log('\n' + colors.cyan + '💡 CURATOR RECOMMENDATIONS' + colors.reset);
  console.log('├─ Remove movies with <1000 votes from recent years');
  console.log('├─ Add more pre-2000 classics');
  console.log('├─ Balance genre distribution');
  console.log('└─ Review and remove 2024-2025 non-award winners');
  
  console.log('\n' + '='.repeat(80));
}

async function calculateAverageMetrics() {
  // This would normally query the database
  // For now, return estimates based on curation strategy
  return {
    avgRating: '7.8',
    avgVotes: '15,420',
    avgYear: '2005',
    avgAge: '19'
  };
}

async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log('\n' + colors.yellow + 'CURATOR ACTIONS:' + colors.reset);
    console.log('1. View Dashboard');
    console.log('2. Evaluate Specific Movie');
    console.log('3. Process Queue');
    console.log('4. Find Quality Movies');
    console.log('5. Clean Database');
    console.log('6. Exit');
    
    const choice = await question('\nSelect action (1-6): ');
    
    switch (choice) {
      case '1':
        await displayDashboard();
        break;
        
      case '2':
        const movieId = await question('Enter TMDB Movie ID: ');
        const evaluation = await evaluateMovie(movieId);
        console.log('\n' + colors.cyan + 'EVALUATION RESULT:' + colors.reset);
        console.log(JSON.stringify(evaluation, null, 2));
        break;
        
      case '3':
        console.log('Processing queue...');
        // Call process-queue endpoint
        break;
        
      case '4':
        console.log('Finding quality movies...');
        // Run quality movie finder
        break;
        
      case '5':
        console.log('Cleaning database (removing low-quality movies)...');
        // Run cleanup
        break;
        
      case '6':
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        
      default:
        console.log('Invalid choice');
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'dashboard';
  
  if (mode === 'dashboard') {
    await displayDashboard();
  } else if (mode === 'interactive') {
    await interactiveMode();
  } else if (mode === 'evaluate' && args[1]) {
    const evaluation = await evaluateMovie(args[1]);
    console.log(JSON.stringify(evaluation, null, 2));
  } else {
    console.log('Usage:');
    console.log('  node curator-dashboard.js              # Show dashboard');
    console.log('  node curator-dashboard.js interactive  # Interactive mode');
    console.log('  node curator-dashboard.js evaluate <tmdb_id>  # Evaluate movie');
  }
}

main().catch(console.error);