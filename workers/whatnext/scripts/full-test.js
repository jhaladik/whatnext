#!/usr/bin/env node

// Full automated test of What Next production deployment

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

// Different test scenarios
const TEST_SCENARIOS = {
  feelGoodComedy: {
    name: "Feel-Good Comedy Lover",
    answers: [
      { questionId: 'movie_mood', choice: 'uplifting' },
      { questionId: 'movie_genre_light', choice: 'comedy' },
      { questionId: 'movie_era_modern', choice: 'recent' },
      { questionId: 'movie_reality_light', choice: 'realistic' },
      { questionId: 'movie_commitment_light', choice: 'quick' },
      { questionId: 'movie_solo_social', choice: 'group' }
    ]
  },
  intenseThriller: {
    name: "Intense Thriller Fan",
    answers: [
      { questionId: 'movie_mood', choice: 'intense' },
      { questionId: 'movie_genre_intense', choice: 'thriller' },
      { questionId: 'movie_pace', choice: 'fast' },
      { questionId: 'movie_stakes', choice: 'personal' },
      { questionId: 'movie_violence', choice: 'realistic' },
      { questionId: 'movie_ending', choice: 'satisfying' }
    ]
  },
  sciFiEpic: {
    name: "Sci-Fi Epic Enthusiast",
    answers: [
      { questionId: 'movie_mood', choice: 'intense' },
      { questionId: 'movie_genre_intense', choice: 'scifi' },
      { questionId: 'movie_pace', choice: 'slow' },
      { questionId: 'movie_stakes', choice: 'global' },
      { questionId: 'movie_violence', choice: 'stylized' },
      { questionId: 'movie_ending', choice: 'ambiguous' }
    ]
  }
};

async function testScenario(scenario, scenarioName) {
  console.log(`\n🎭 Testing: ${scenarioName}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Start session
    console.log('📱 Starting movie session...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'movies' })
    });
    
    if (!startResponse.ok) {
      throw new Error(`Start failed: ${startResponse.status}`);
    }
    
    const startData = await startResponse.json();
    const sessionId = startData.sessionId;
    console.log(`✅ Session ID: ${sessionId}\n`);
    
    // Answer questions
    console.log('💭 Answering questions:');
    let currentQuestion = startData.question;
    let questionCount = 0;
    
    for (const answer of scenario.answers) {
      if (!currentQuestion) break;
      
      const questionText = currentQuestion.text || currentQuestion.question_text;
      const questionId = currentQuestion.id || currentQuestion.question_id;
      
      // Find the matching answer for this question
      const plannedAnswer = scenario.answers.find(a => a.questionId === questionId);
      const choice = plannedAnswer?.choice || currentQuestion.options?.[0]?.id || 'yes';
      
      console.log(`   Q${questionCount + 1}: ${questionText}`);
      console.log(`   → ${choice}`);
      
      const swipeResponse = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          choice: choice,
          responseTime: Math.random() * 2000 + 500
        })
      });
      
      if (!swipeResponse.ok) {
        throw new Error(`Swipe failed: ${swipeResponse.status}`);
      }
      
      const swipeData = await swipeResponse.json();
      
      if (swipeData.type === 'recommendations') {
        console.log(`\n🎬 Received ${swipeData.recommendations.length} recommendations!\n`);
        
        // Display recommendations
        swipeData.recommendations.forEach((movie, i) => {
          console.log(`${i + 1}. ${movie.title} (${movie.year})`);
          console.log(`   📊 Genre: ${movie.genre}`);
          console.log(`   ⏱️  Runtime: ${movie.runtime}`);
          console.log(`   📺 Watch on: ${movie.where_to_watch}`);
          
          if (movie.vote_average) {
            console.log(`   ⭐ TMDB Rating: ${movie.vote_average}/10`);
          }
          
          if (movie.poster_url) {
            console.log(`   🖼️  Has poster: ✅`);
          }
          
          if (movie.trailer_url) {
            console.log(`   ▶️  Has trailer: ✅`);
          }
          
          console.log(`   💭 ${movie.reason}\n`);
        });
        
        // Show TMDB enrichment status
        const enrichedCount = swipeData.recommendations.filter(r => r.tmdb_id).length;
        console.log(`📊 TMDB Enrichment: ${enrichedCount}/${swipeData.recommendations.length} movies enriched`);
        
        if (swipeData.reasoning) {
          console.log(`\n💡 AI Strategy: ${swipeData.reasoning}`);
        }
        
        return true;
      }
      
      currentQuestion = swipeData.question;
      questionCount++;
    }
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    return false;
  }
}

async function runFullTest() {
  console.log('\n🎬 ═══════════════════════════════════════════════════════════');
  console.log('   WHAT NEXT - Full Production Test');
  console.log('   Testing URL: ' + API_URL);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Test 1: API Health
  console.log('🏥 Testing API Health...');
  try {
    const healthResponse = await fetch(`${API_URL}/api/domains`);
    if (healthResponse.ok) {
      console.log('✅ API is responding\n');
    } else {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    return;
  }
  
  // Test 2: Different user scenarios
  console.log('🎭 Testing Different User Preferences:');
  console.log('─────────────────────────────────────────────────────────────');
  
  const results = [];
  
  for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
    const success = await testScenario(scenario, scenario.name);
    results.push({ name: scenario.name, success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length} scenarios passed`);
  
  if (successCount === results.length) {
    console.log('\n🎉 All tests passed! The What Next engine is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run the test
runFullTest().catch(console.error);