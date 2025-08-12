#!/usr/bin/env node

// Single flow test with rate limit awareness

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

async function testSingleMovieFlow() {
  console.log('\n🎬 WHAT NEXT - Single Movie Flow Test');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('⚠️  Note: Claude API has 50 requests/minute limit\n');
  
  try {
    // Step 1: Start session
    console.log('1️⃣ Starting movie session...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'movies' })
    });
    
    const startData = await startResponse.json();
    const sessionId = startData.sessionId;
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`📝 First question: ${startData.question?.question_text || startData.question?.text}\n`);
    
    // Step 2: Answer questions for a comedy preference
    console.log('2️⃣ Answering questions for feel-good comedy preference:\n');
    
    const answers = [
      { questionId: 'movie_mood', choice: 'uplifting', label: 'Mood: Uplifting' },
      { questionId: 'movie_genre_light', choice: 'comedy', label: 'Genre: Comedy' },
      { questionId: 'movie_era_modern', choice: 'recent', label: 'Era: Recent (last 5 years)' },
      { questionId: 'movie_reality_light', choice: 'fantasy', label: 'Style: Fantasy/Escapist' },
      { questionId: 'movie_commitment_light', choice: 'quick', label: 'Length: Under 2 hours' },
      { questionId: 'movie_solo_social', choice: 'group', label: 'Context: Watching with others' }
    ];
    
    let currentQuestion = startData.question;
    
    for (let i = 0; i < 6; i++) {
      if (!currentQuestion) break;
      
      const questionId = currentQuestion.id || currentQuestion.question_id;
      const plannedAnswer = answers.find(a => a.questionId === questionId);
      const choice = plannedAnswer?.choice || currentQuestion.options?.[0]?.id;
      
      console.log(`   ${plannedAnswer?.label || `Q${i+1}: ${choice}`}`);
      
      const swipeResponse = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          choice: choice,
          responseTime: 1500
        })
      });
      
      const swipeData = await swipeResponse.json();
      
      if (swipeData.type === 'recommendations') {
        console.log('\n3️⃣ Received Recommendations!\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        swipeData.recommendations.forEach((movie, i) => {
          console.log(`🎬 ${i + 1}. ${movie.title} (${movie.year})`);
          console.log(`   Genre: ${movie.genre}`);
          console.log(`   Runtime: ${movie.runtime}`);
          console.log(`   Rating: ${movie.rating}`);
          console.log(`   Where to watch: ${movie.where_to_watch}`);
          
          // Check TMDB enrichment
          if (movie.tmdb_id) {
            console.log(`   \n   📊 TMDB Data:`);
            console.log(`   • ID: ${movie.tmdb_id}`);
            if (movie.vote_average) console.log(`   • User Rating: ⭐ ${movie.vote_average}/10`);
            if (movie.poster_url) console.log(`   • Poster: ✅ Available`);
            if (movie.backdrop_url) console.log(`   • Backdrop: ✅ Available`);
            if (movie.trailer_url) console.log(`   • Trailer: ✅ ${movie.trailer_url.includes('youtube') ? 'YouTube' : 'Available'}`);
            if (movie.streaming?.available_on?.length > 0) {
              console.log(`   • Streaming: ${movie.streaming.available_on.join(', ')}`);
            }
          }
          
          console.log(`   \n   💭 Why: ${movie.reason}\n`);
          console.log('   ─────────────────────────────────────────────\n');
        });
        
        // Summary
        const enrichedCount = swipeData.recommendations.filter(r => r.tmdb_id).length;
        console.log(`📊 Summary:`);
        console.log(`   • Total recommendations: ${swipeData.recommendations.length}`);
        console.log(`   • TMDB enriched: ${enrichedCount}/${swipeData.recommendations.length}`);
        console.log(`   • Time saved: ${swipeData.timeSaved || 'N/A'}`);
        console.log(`   • Questions asked: ${i + 1}`);
        
        if (swipeData.reasoning || swipeData.explanation) {
          console.log(`\n💡 AI Strategy:`);
          console.log(`   ${swipeData.reasoning || swipeData.explanation}`);
        }
        
        break;
      }
      
      currentQuestion = swipeData.question;
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Test completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('429')) {
      console.error('   Rate limit exceeded. Wait a minute before testing again.');
    }
  }
}

// Run test
console.log('🚀 Starting test (single flow to respect rate limits)...');
testSingleMovieFlow();