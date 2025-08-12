// Test script for "Find more movies" feature
const API_BASE = 'https://what-next-prod.jhaladik.workers.dev';

async function testFindMoreMovies() {
  console.log('🔍 Testing "Find more movies" feature');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Start a session
    console.log('1️⃣ Starting session...');
    const startResponse = await fetch(`${API_BASE}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'movies' })
    });
    
    if (!startResponse.ok) {
      throw new Error(`Failed to start session: ${startResponse.status}`);
    }
    
    const sessionData = await startResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`✅ Session created: ${sessionId}`);
    
    // Step 2: Answer a few questions quickly to get recommendations
    console.log('\n2️⃣ Answering questions to get initial recommendations...');
    let currentQuestion = sessionData.question;
    let questionCount = 0;
    
    while (currentQuestion && questionCount < 8) { // Increased to 8 to ensure we get recommendations
      console.log(`   Question ${questionCount + 1}: ${currentQuestion.text}`);
      
      const swipeResponse = await fetch(`${API_BASE}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          choice: 'option_a',
          responseTime: 1000
        })
      });
      
      if (!swipeResponse.ok) {
        const errorText = await swipeResponse.text();
        throw new Error(`Failed to submit choice: ${swipeResponse.status} - ${errorText}`);
      }
      
      const swipeData = await swipeResponse.json();
      console.log(`   Response type: ${swipeData.type}, Progress: ${swipeData.progress}%`);
      
      if (swipeData.type === 'recommendations') {
        console.log(`✅ Got ${swipeData.recommendations.length} initial recommendations:`);
        const initialMovies = swipeData.recommendations.map(r => r.title);
        console.log('   Movies:', initialMovies.join(', '));
        
        // Step 3: Test "Find more movies" with excluded movies
        console.log('\n3️⃣ Testing "Find more movies" endpoint...');
        const moreResponse = await fetch(`${API_BASE}/api/more-recommendations/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            excludedMovies: initialMovies
          })
        });
        
        if (!moreResponse.ok) {
          const errorText = await moreResponse.text();
          throw new Error(`Failed to get more recommendations: ${moreResponse.status} - ${errorText}`);
        }
        
        const moreData = await moreResponse.json();
        console.log(`✅ Got ${moreData.recommendations.length} more recommendations:`);
        const moreMovies = moreData.recommendations.map(r => r.title);
        console.log('   Movies:', moreMovies.join(', '));
        
        // Check if any movies are duplicated
        const duplicates = moreMovies.filter(movie => initialMovies.includes(movie));
        if (duplicates.length > 0) {
          console.log('⚠️  Warning: Found duplicate movies:', duplicates.join(', '));
        } else {
          console.log('✅ No duplicate movies found!');
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ Test completed successfully!');
        console.log('═══════════════════════════════════════════════════════════');
        return;
      }
      
      currentQuestion = swipeData.question;
      questionCount++;
    }
    
    throw new Error('Did not receive recommendations after answering questions');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testFindMoreMovies();