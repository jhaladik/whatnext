// Debug script to see what's happening with questions
console.log('%c🔍 Debug Question Flow', 'color: #00ff00; font-size: 16px; font-weight: bold');

// Start session
fetch('/api/movies/start', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    domain: 'movies',
    questionFlow: 'standard'
  })
})
.then(r => r.json())
.then(async (session) => {
  console.log('Session:', session.sessionId);
  console.log('First question:', session.question);
  
  const sessionId = session.sessionId;
  
  // Show available options for first question
  if (session.question && session.question.options) {
    console.log('\n%cFirst Question Details:', 'color: yellow; font-weight: bold');
    console.log('ID:', session.question.id);
    console.log('Text:', session.question.text);
    console.log('Available options:');
    session.question.options.forEach(opt => {
      console.log(`  - ${opt.id}: ${opt.text}`);
    });
  }
  
  // Try answering with the actual option from the question
  const firstAnswer = session.question.options[0].id;
  console.log(`\n%cAnswering with: ${firstAnswer}`, 'color: cyan');
  
  const result = await fetch(`/api/movies/answer/${sessionId}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      questionId: session.question.id,
      answer: firstAnswer,
      responseTime: 1000
    })
  });
  
  const response = await result.json();
  console.log('\n%cResponse after first answer:', 'color: yellow; font-weight: bold');
  console.log('Type:', response.type);
  console.log('Has recommendations?', !!response.recommendations);
  console.log('Has next question?', !!response.question);
  
  if (response.question) {
    console.log('Next question ID:', response.question.id);
    console.log('Next question text:', response.question.text);
    
    // Check if it's the same question
    if (response.question.id === session.question.id) {
      console.log('%c⚠️ WARNING: Got the same question again!', 'color: red; font-weight: bold');
      console.log('This means the answer was not accepted');
      
      // Try with different answer format
      console.log('\n%cTrying different answer format...', 'color: cyan');
      
      const result2 = await fetch(`/api/movies/answer/${sessionId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          questionId: session.question.id,
          answer: session.question.options[1]?.id || 'moderate',
          responseTime: 1000
        })
      });
      
      const response2 = await result2.json();
      console.log('Response after second try:', response2.question?.id);
    }
  }
  
  if (response.recommendations) {
    console.log('\n%c✅ Got recommendations immediately!', 'color: #00ff00; font-size: 16px; font-weight: bold');
    console.log('Movies:', response.recommendations.map(m => m.title));
  }
  
  // Save session for manual testing
  window.testSession = {
    sessionId: sessionId,
    lastQuestion: response.question || session.question,
    response: response
  };
  
  console.log('\n%c💾 Session saved to window.testSession', 'color: green');
  console.log('You can manually test answers with:');
  console.log(`fetch('/api/movies/answer/${sessionId}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      questionId: window.testSession.lastQuestion.id,
      answer: 'YOUR_ANSWER_HERE'
    })
  }).then(r => r.json()).then(console.log)`);
})
.catch(error => {
  console.error('Error:', error);
});