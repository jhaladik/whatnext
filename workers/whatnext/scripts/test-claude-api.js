#!/usr/bin/env node

// scripts/test-claude-api.js
// Test Claude API integration directly

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

async function testClaudeAPI() {
  console.log('🤖 Testing Claude API Integration\n');
  console.log('=' . repeat(50));
  
  try {
    // Start a session
    console.log('1️⃣ Starting session...');
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const sessionData = await startResponse.json();
    const sessionId = sessionData.sessionId;
    console.log(`✅ Session ID: ${sessionId}`);
    
    // Answer questions to get to recommendations quickly
    const choices = [
      { questionId: 'cognitive_engagement', choice: 'challenge' },
      { questionId: 'learning_depth', choice: 'new' },
      { questionId: 'content_format', choice: 'video' },
      { questionId: 'time_commitment', choice: 'substantial' },
      { questionId: 'complexity_level', choice: 'advanced' },
      { questionId: 'practical_theoretical', choice: 'theoretical' }
    ];
    
    let currentData = sessionData;
    let questionNum = 0;
    
    // Answer questions until we get recommendations
    while (currentData.type === 'question' && questionNum < 6) {
      questionNum++;
      
      // Find the appropriate choice for this question
      let choiceToMake = null;
      const questionId = currentData.question?.id;
      
      // Try to find a predefined choice
      const predefinedChoice = choices.find(c => c.questionId === questionId);
      if (predefinedChoice) {
        choiceToMake = predefinedChoice.choice;
      } else {
        // Use first option if no predefined choice
        const options = currentData.question?.options || [];
        choiceToMake = options[0]?.id || 'yes';
      }
      
      console.log(`\n2️⃣ Answering question ${questionNum}: ${questionId}`);
      console.log(`   Question: ${currentData.question?.text?.substring(0, 60)}...`);
      console.log(`   Choice: ${choiceToMake}`);
      
      const response = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          choice: choiceToMake,
          responseTime: 2000
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error: ${error}`);
        break;
      }
      
      currentData = await response.json();
      console.log(`   Progress: ${currentData.progress}%`);
    }
    
    // Check if we got recommendations
    console.log('\n' + '=' . repeat(50));
    if (currentData.type === 'recommendations') {
      console.log('✅ RECOMMENDATIONS RECEIVED!');
      console.log(`Source: ${currentData.source || 'unknown'}`);
      console.log(`Number of recommendations: ${currentData.recommendations?.length || 0}`);
      console.log(`\nReasoning: ${currentData.reasoning}`);
      
      if (currentData.recommendations) {
        console.log('\n📚 Recommendations:');
        currentData.recommendations.forEach((rec, i) => {
          console.log(`\n${i + 1}. ${rec.title}`);
          console.log(`   ${rec.description}`);
          console.log(`   Type: ${rec.type} | Duration: ${rec.duration}`);
          console.log(`   Confidence: ${rec.confidence}`);
          if (rec.url) console.log(`   URL: ${rec.url}`);
          if (rec.matchReason) console.log(`   Why: ${rec.matchReason}`);
        });
      }
      
      // Check if it's from Claude or fallback
      if (currentData.source === 'fallback') {
        console.log('\n⚠️  WARNING: Using fallback recommendations!');
        console.log('This means Claude API failed. Checking why...');
        
        // Try to debug Claude API
        console.log('\n3️⃣ Debugging Claude API...');
        const debugResponse = await fetch(`${API_URL}/api/debug/claude`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        }).catch(e => null);
        
        if (debugResponse && debugResponse.ok) {
          const debug = await debugResponse.json();
          console.log('Debug info:', debug);
        }
      } else {
        console.log('\n✅ SUCCESS: Claude API is working!');
      }
    } else {
      console.log('❌ Did not reach recommendations stage');
      console.log('Current state:', currentData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClaudeAPI();