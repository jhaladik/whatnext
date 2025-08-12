#!/usr/bin/env node

// Test full Claude integration with detailed output

async function testFullClaude() {
  const API_URL = 'https://what-next-prod.jhaladik.workers.dev';
  
  console.log('🤖 Testing Claude API Full Integration\n');
  console.log('=' . repeat(60));
  
  // Start session
  const start = await fetch(`${API_URL}/api/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const session = await start.json();
  console.log('Session ID:', session.sessionId);
  console.log('\n📝 User Journey:\n');
  
  // Define a specific user path
  const choices = [
    { question: 'cognitive_engagement', choice: 'challenge', reason: 'User wants intellectual stimulation' },
    { question: 'learning_depth', choice: 'new', reason: 'Looking to explore new topics' },
    { question: 'time_commitment', choice: 'substantial', reason: 'Has time for deep engagement' },
    { question: 'content_format', choice: 'video', reason: 'Prefers visual learning' },
    { question: 'content_length', choice: 'immersive', reason: 'Wants comprehensive content' },
    { question: 'complexity_level', choice: 'advanced', reason: 'Ready for complex material' }
  ];
  
  let currentData = session;
  let step = 0;
  
  // Answer questions
  while ((currentData.type === 'question' || (currentData.question && !currentData.type)) && step < 6) {
    const questionId = currentData.question.id;
    const plannedChoice = choices.find(c => c.question === questionId);
    const choice = plannedChoice?.choice || currentData.question.options[0].id;
    
    console.log(`${step + 1}. ${currentData.question.text}`);
    console.log(`   → Choosing: "${choice}" ${plannedChoice?.reason ? `(${plannedChoice.reason})` : ''}`);
    
    const response = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: questionId,
        choice: choice,
        responseTime: 2500
      })
    });
    
    currentData = await response.json();
    step++;
  }
  
  // Display recommendations
  if (currentData.type === 'recommendations') {
    console.log('\n' + '=' . repeat(60));
    console.log('🎯 CLAUDE RECOMMENDATIONS RECEIVED!\n');
    
    console.log('📊 Session Summary:');
    console.log('  Questions asked:', currentData.sessionStats?.questionsAsked || step);
    console.log('  Total time:', currentData.sessionStats?.totalTime, 'seconds');
    console.log('  Time saved:', currentData.timeSaved);
    console.log('  Source:', currentData.source || 'claude_api');
    
    console.log('\n💭 Claude\'s Reasoning:');
    console.log('  ' + (currentData.reasoning || 'No reasoning provided').replace(/\n/g, '\n  '));
    
    console.log('\n📚 Recommendations:\n');
    currentData.recommendations?.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.title}`);
      console.log('   ' + '-'.repeat(50));
      console.log(`   📝 ${rec.description}`);
      console.log(`   ⏱️  Duration: ${rec.duration}`);
      console.log(`   📺 Type: ${rec.type}`);
      console.log(`   🔗 Source: ${rec.source}`);
      if (rec.url) console.log(`   🌐 URL: ${rec.url}`);
      if (rec.searchTerms) console.log(`   🔍 Search: ${rec.searchTerms}`);
      console.log(`   ✨ Match Reason: ${rec.matchReason}`);
      console.log(`   📊 Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
      console.log();
    });
    
    console.log('=' . repeat(60));
    console.log('✅ Claude API Integration Successful!');
  } else {
    console.log('\n❌ Did not receive recommendations');
    console.log('Final state:', currentData);
  }
}

testFullClaude().catch(console.error);