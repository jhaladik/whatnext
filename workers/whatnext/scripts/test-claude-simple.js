#!/usr/bin/env node

// Simple test to check Claude API

async function testClaude() {
  const API_URL = 'https://what-next-prod.jhaladik.workers.dev';
  
  console.log('Testing Claude API...\n');
  
  // Start session
  const start = await fetch(`${API_URL}/api/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const session = await start.json();
  console.log('Session:', session.sessionId);
  
  // Answer first question
  console.log('\nAnswering:', session.question.id);
  const r1 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: 'cognitive_engagement',
      choice: 'challenge',
      responseTime: 2000
    })
  });
  const d1 = await r1.json();
  console.log('Response 1:', d1.type, d1.question?.id, 'Progress:', d1.progress);
  
  if (d1.type !== 'question') {
    console.log('Got recommendations already!');
    console.log('Source:', d1.source);
    return;
  }
  
  // Answer second question
  console.log('\nAnswering:', d1.question.id);
  const r2 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: d1.question.id,
      choice: d1.question.options[0].id,
      responseTime: 2000
    })
  });
  const d2 = await r2.json();
  console.log('Response 2:', d2.type, d2.question?.id, 'Progress:', d2.progress);
  
  // Answer third question
  if (d2.type === 'question') {
    console.log('\nAnswering:', d2.question.id);
    const r3 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: d2.question.id,
        choice: d2.question.options[0].id,
        responseTime: 2000
      })
    });
    const d3 = await r3.json();
    console.log('Response 3:', d3.type, d3.question?.id, 'Progress:', d3.progress);
    
    // Answer fourth question
    if (d3.type === 'question') {
      console.log('\nAnswering:', d3.question.id);
      const r4 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: d3.question.id,
          choice: d3.question.options[0].id,
          responseTime: 2000
        })
      });
      const d4 = await r4.json();
      console.log('Response 4:', d4.type, d4.question?.id, 'Progress:', d4.progress);
      
      // Answer fifth question
      if (d4.type === 'question') {
        console.log('\nAnswering:', d4.question.id);
        const r5 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: d4.question.id,
            choice: d4.question.options[0].id,
            responseTime: 2000
          })
        });
        const d5 = await r5.json();
        console.log('Response 5:', d5.type, d5.question?.id, 'Progress:', d5.progress);
        
        // Answer sixth question
        if (d5.type === 'question') {
          console.log('\nAnswering:', d5.question.id);
          const r6 = await fetch(`${API_URL}/api/swipe/${session.sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: d5.question.id,
              choice: d5.question.options[0].id,
              responseTime: 2000
            })
          });
          const d6 = await r6.json();
          console.log('Response 6:', d6.type, 'Progress:', d6.progress);
          
          if (d6.type === 'recommendations') {
            console.log('\n✅ GOT RECOMMENDATIONS!');
            console.log('Source:', d6.source);
            console.log('Count:', d6.recommendations?.length);
            console.log('Reasoning:', d6.reasoning?.substring(0, 100));
            
            if (d6.source === 'fallback') {
              console.log('\n⚠️ Using fallback - Claude API not working');
            } else {
              console.log('\n✅ Claude API is working!');
            }
          }
        }
      }
    }
  }
}

testClaude().catch(console.error);