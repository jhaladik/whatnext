#!/usr/bin/env node

// Test TMDB enrichment specifically

const API_URL = process.env.API_URL || 'https://what-next-prod.jhaladik.workers.dev';

async function testTMDBEnrichment() {
  console.log('🎬 Testing TMDB Enrichment\n');
  
  try {
    // Start a movie session
    console.log('Starting movie session...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'movies' })
    });
    
    const { sessionId, question } = await startResponse.json();
    console.log('Session ID:', sessionId);
    
    // Quick answers to get to recommendations
    const answers = [
      { questionId: 'movie_mood', choice: 'intense' },
      { questionId: 'movie_genre_intense', choice: 'scifi' },
      { questionId: 'movie_pace', choice: 'fast' },
      { questionId: 'movie_stakes', choice: 'global' },
      { questionId: 'movie_violence', choice: 'stylized' },
      { questionId: 'movie_ending', choice: 'satisfying' }
    ];
    
    let currentQuestion = question;
    let response;
    
    for (const answer of answers) {
      if (!currentQuestion) break;
      
      console.log(`Answering: ${currentQuestion.id || currentQuestion.question_id}`);
      
      response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id || currentQuestion.question_id,
          choice: answer.choice,
          responseTime: 1000
        })
      });
      
      const data = await response.json();
      
      if (data.type === 'recommendations') {
        console.log('\n✅ Got recommendations with potential TMDB data:\n');
        
        data.recommendations.forEach((movie, i) => {
          console.log(`${i + 1}. ${movie.title} (${movie.year})`);
          console.log(`   Genre: ${movie.genre}`);
          console.log(`   Where to watch: ${movie.where_to_watch}`);
          
          // Check for TMDB enrichment fields
          if (movie.tmdb_id) console.log(`   ✅ TMDB ID: ${movie.tmdb_id}`);
          if (movie.poster_url) console.log(`   ✅ Poster: ${movie.poster_url}`);
          if (movie.vote_average) console.log(`   ✅ Rating: ${movie.vote_average}/10`);
          if (movie.overview) console.log(`   ✅ Has overview`);
          if (movie.streaming?.available_on) console.log(`   ✅ Streaming info available`);
          
          console.log('');
        });
        
        // Show raw JSON for first movie to see all fields
        console.log('Full data for first recommendation:');
        console.log(JSON.stringify(data.recommendations[0], null, 2));
        
        break;
      }
      
      currentQuestion = data.question;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTMDBEnrichment();