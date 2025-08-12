#!/usr/bin/env node

// scripts/test-both-paths.js
// Test both cognitive paths

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

async function testPath(pathName, firstChoice) {
  console.log(`\n🧪 Testing ${pathName} Path`);
  console.log('=' . repeat(50));
  
  try {
    // Start session
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const sessionData = await startResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`✅ Session started: ${sessionId}`);
    
    // Submit first choice
    const choice1Response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'cognitive_engagement',
        choice: firstChoice,
        responseTime: 2000
      })
    });
    
    let currentData = await choice1Response.json();
    console.log(`✅ First choice (${firstChoice}) submitted`);
    
    // Continue answering questions
    let questionCount = 1;
    const questionsAsked = ['cognitive_engagement'];
    
    while (currentData.type === 'question' && questionCount < 6) {
      questionCount++;
      const questionId = currentData.question.id;
      questionsAsked.push(questionId);
      
      const options = currentData.question.options || [];
      const choice = options[Math.floor(Math.random() * options.length)]?.id || 'yes';
      
      console.log(`  Q${questionCount}: ${currentData.question.text.substring(0, 50)}...`);
      console.log(`  → Choosing: ${choice}`);
      
      const response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          choice: choice,
          responseTime: 1500 + Math.random() * 2000
        })
      });
      
      currentData = await response.json();
    }
    
    // Display results
    if (currentData.type === 'recommendations') {
      console.log(`\n✅ Got ${currentData.recommendations?.length || 0} recommendations after ${questionCount} questions`);
      console.log('Questions asked:', questionsAsked.join(' → '));
      console.log('Session stats:', currentData.sessionStats);
      console.log('Source:', currentData.source || 'unknown');
      
      currentData.recommendations?.slice(0, 2).forEach((rec, i) => {
        console.log(`\n  Rec ${i + 1}: ${rec.title}`);
        console.log(`    Type: ${rec.type}, Duration: ${rec.duration}`);
        console.log(`    Match: ${rec.matchReason}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${pathName} path:`, error.message);
  }
}

async function runTests() {
  console.log('🎯 Testing What Next Recommendation Engine - Both Paths\n');
  
  // Test high cognitive path
  await testPath('HIGH COGNITIVE', 'challenge');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test low cognitive path
  await testPath('LOW COGNITIVE', 'entertain');
  
  console.log('\n' + '=' . repeat(50));
  console.log('✅ All tests completed!');
}

runTests();