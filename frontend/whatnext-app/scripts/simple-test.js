// Simple test - just answer all questions automatically
console.log('%c🎬 Starting Simple Test', 'color: #00ff00; font-size: 16px; font-weight: bold');

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
  const sessionId = session.sessionId;
  
  // Answer 5 questions in sequence
  const answers = [
    { questionId: 'cognitive_load', answer: 'easy' },
    { questionId: 'emotional_tone', answer: 'uplifting' },
    { questionId: 'personal_context', answer: 'escaping' },
    { questionId: 'attention_level', answer: 'moderate' },
    { questionId: 'discovery_mode', answer: 'familiar' }
  ];
  
  let response = session;
  let questionCount = 0;
  
  while (response.question && questionCount < 10) {
    const currentQuestionId = response.question.id;
    console.log(`Q${questionCount + 1}: ${currentQuestionId}`);
    
    // Find matching answer or use first option
    let answer = answers.find(a => a.questionId === currentQuestionId)?.answer;
    if (!answer && response.question.options) {
      answer = response.question.options[0].id;
    }
    
    if (!answer) {
      console.log('No answer found, stopping');
      break;
    }
    
    // Submit answer
    const result = await fetch(`/api/movies/answer/${sessionId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        questionId: currentQuestionId,
        answer: answer,
        responseTime: 1000
      })
    });
    
    response = await result.json();
    questionCount++;
    
    // Check if we got recommendations
    if (response.type === 'recommendations' || response.recommendations) {
      console.log('%c✅ GOT RECOMMENDATIONS!', 'color: #00ff00; font-size: 18px; font-weight: bold');
      console.log(`Total: ${response.recommendations.length} movies`);
      console.log('\n%c📽️ MOVIE LIST:', 'color: yellow; font-size: 16px; font-weight: bold');
      
      response.recommendations.forEach((movie, i) => {
        console.log(`%c${i + 1}. ${movie.title} (${movie.year})`, 'color: cyan; font-size: 14px');
        console.log(`   Rating: ⭐ ${movie.rating?.toFixed(1)}`);
        console.log(`   Genres: ${movie.genres?.join(', ')}`);
      });
      
      // Save for later access
      window.lastRecommendations = response.recommendations;
      console.log('\n%c💾 Saved to window.lastRecommendations', 'color: green');
      break;
    }
  }
  
  if (questionCount >= 10) {
    console.log('%c⚠️ Too many questions, something might be wrong', 'color: orange');
  }
})
.catch(error => {
  console.error('Error:', error);
});