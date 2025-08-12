#!/usr/bin/env node

// scripts/test-api-flow.js
// Test the complete API flow from start to recommendations

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

async function testApiFlow() {
  console.log('🧪 Testing What Next API Flow\n');
  console.log('API URL:', API_URL);
  console.log('=' . repeat(50));
  
  try {
    // Step 1: Health check
    console.log('\n1️⃣ Testing health check...');
    const healthResponse = await fetch(`${API_URL}/`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Step 2: Start a new session
    console.log('\n2️⃣ Starting new session...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!startResponse.ok) {
      throw new Error(`Start session failed: ${startResponse.status}`);
    }
    
    const sessionData = await startResponse.json();
    console.log('✅ Session started:', {
      sessionId: sessionData.sessionId,
      firstQuestion: sessionData.question.id,
      questionText: sessionData.question.text
    });
    
    const sessionId = sessionData.sessionId;
    
    // Step 3: Submit first choice (cognitive_engagement)
    console.log('\n3️⃣ Submitting first choice (choosing "challenge")...');
    const choice1Response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'cognitive_engagement',
        choice: 'challenge',
        responseTime: 3500
      })
    });
    
    if (!choice1Response.ok) {
      const errorText = await choice1Response.text();
      console.log('❌ Error submitting first choice:', choice1Response.status);
      console.log('Error details:', errorText);
      
      // Try to understand the error better
      console.log('\n🔍 Debugging: Checking database for follow-up questions...');
      return;
    }
    
    const choice1Data = await choice1Response.json();
    console.log('✅ First choice submitted:', {
      type: choice1Data.type,
      nextQuestion: choice1Data.question?.id,
      progress: choice1Data.progress
    });
    
    // Step 4: Continue answering questions until we get recommendations
    let currentData = choice1Data;
    let questionCount = 1;
    
    while (currentData.type === 'question' && questionCount < 6) {
      questionCount++;
      console.log(`\n4️⃣.${questionCount} Answering question: ${currentData.question.id}`);
      
      // Pick a random choice from options
      const options = currentData.question.options || [];
      const choice = options[0]?.id || 'yes';
      
      const response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentData.question.id,
          choice: choice,
          responseTime: 2000 + Math.random() * 3000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error on question ${questionCount}:`, errorText);
        break;
      }
      
      currentData = await response.json();
      console.log(`✅ Question ${questionCount} answered, progress: ${currentData.progress}%`);
    }
    
    // Step 5: Check if we got recommendations
    if (currentData.type === 'recommendations') {
      console.log('\n5️⃣ Got recommendations!');
      console.log('Number of recommendations:', currentData.recommendations?.length || 0);
      
      currentData.recommendations?.forEach((rec, i) => {
        console.log(`\n📚 Recommendation ${i + 1}:`);
        console.log(`  Title: ${rec.title}`);
        console.log(`  Type: ${rec.type}`);
        console.log(`  Duration: ${rec.duration}`);
        console.log(`  Confidence: ${rec.confidence}`);
      });
      
      console.log('\n📊 Session Stats:');
      console.log(currentData.sessionStats);
      console.log('Time saved:', currentData.timeSaved);
    }
    
    console.log('\n' + '=' . repeat(50));
    console.log('✅ API flow test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testApiFlow();