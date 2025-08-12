#!/usr/bin/env node

// scripts/test-domain-movies.js
// Test movie domain functionality

const API_URL = process.env.API_URL || 'http://localhost:8787';

async function testMovieDomain() {
  console.log('🎬 Testing Movie Domain Functionality\n');
  
  try {
    // Step 1: Get available domains
    console.log('1️⃣ Getting available domains...');
    const domainsResponse = await fetch(`${API_URL}/api/domains`);
    const domains = await domainsResponse.json();
    console.log('Available domains:', domains.domains.map(d => d.name).join(', '));
    
    // Step 2: Start a new session with movie domain
    console.log('\n2️⃣ Starting session with movie domain...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: 'movies'
      })
    });
    
    const startData = await startResponse.json();
    const sessionId = startData.sessionId;
    console.log('Session ID:', sessionId);
    console.log('First question:', startData.question?.text);
    console.log('Question ID:', startData.question?.id);
    
    // Verify it's a movie question
    if (startData.question?.id !== 'movie_mood') {
      console.warn('⚠️ Expected movie_mood question, got:', startData.question?.id);
    }
    
    // Step 3: Answer movie questions
    console.log('\n3️⃣ Answering movie questions...');
    
    const movieChoices = [
      { questionId: 'movie_mood', choice: 'uplifting' },
      { questionId: 'movie_genre_light', choice: 'comedy' },
      { questionId: 'movie_era_modern', choice: 'recent' },
      { questionId: 'movie_commitment_light', choice: 'quick' }
    ];
    
    let currentQuestion = startData.question;
    let questionCount = 0;
    
    while (currentQuestion && questionCount < 6) {
      const choice = movieChoices.find(c => c.questionId === currentQuestion.id);
      const selectedChoice = choice?.choice || currentQuestion.options[0].id;
      
      console.log(`\nQ${questionCount + 1}: ${currentQuestion.text}`);
      console.log(`Answer: ${selectedChoice}`);
      
      const swipeResponse = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          choice: selectedChoice,
          responseTime: Math.random() * 3000 + 1000
        })
      });
      
      const swipeData = await swipeResponse.json();
      
      if (swipeData.type === 'question') {
        currentQuestion = swipeData.question;
        questionCount++;
      } else if (swipeData.type === 'recommendations') {
        console.log('\n✅ Got recommendations!');
        console.log('Number of recommendations:', swipeData.recommendations?.length);
        
        // Display movie recommendations
        if (swipeData.recommendations?.length > 0) {
          console.log('\n🎬 Movie Recommendations:');
          swipeData.recommendations.forEach((movie, i) => {
            console.log(`\n${i + 1}. ${movie.title} (${movie.year})`);
            console.log(`   Genre: ${movie.genre}`);
            console.log(`   Runtime: ${movie.runtime}`);
            console.log(`   Where to watch: ${movie.where_to_watch}`);
            console.log(`   Reason: ${movie.reason}`);
            
            // Check if TMDB enrichment worked
            if (movie.poster_url) {
              console.log(`   ✅ TMDB enrichment successful`);
            }
          });
        }
        
        break;
      }
    }
    
    // Step 4: Test domain selection endpoint
    console.log('\n4️⃣ Testing domain selection endpoint...');
    const newSessionResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const newSession = await newSessionResponse.json();
    const newSessionId = newSession.sessionId;
    
    const domainSelectResponse = await fetch(`${API_URL}/api/domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: newSessionId,
        domain: 'movies'
      })
    });
    
    const domainSelectData = await domainSelectResponse.json();
    console.log('Domain selection successful:', domainSelectData.success);
    console.log('First movie question:', domainSelectData.firstQuestion?.text);
    
    console.log('\n✨ Movie domain test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMovieDomain();