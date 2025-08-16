// Quick test to see current recommendations
// Paste this in browser console at https://whatnext-frontend.pages.dev/

console.log('%c🎬 Checking Current Recommendations', 'color: #00ff00; font-size: 16px; font-weight: bold');

if (window.debugSession && window.debugSession.recommendations) {
  console.log(`\n%c📽️ Found ${window.debugSession.recommendations.length} movies:`, 'color: cyan; font-size: 14px; font-weight: bold');
  
  window.debugSession.recommendations.forEach((movie, index) => {
    console.log(`${index + 1}. ${movie.title} (${movie.year}) - ⭐ ${movie.rating?.toFixed(1)}`);
  });
} else {
  console.log('No recommendations in memory. Running full test...');
  
  // Run the full test
  fetch('/api/movies/start', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      domain: 'movies',
      questionFlow: 'standard',
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'Friday',
        season: 'winter'
      }
    })
  })
  .then(r => r.json())
  .then(session => {
    console.log('Session started:', session.sessionId);
    
    // Answer questions quickly with the same answers
    const answers = [
      { questionId: 'cognitive_load', answer: 'easy' },
      { questionId: 'emotional_tone', answer: 'uplifting' },
      { questionId: 'personal_context', answer: 'escaping' },
      { questionId: 'attention_level', answer: 'moderate' },
      { questionId: 'discovery_mode', answer: 'familiar' }
    ];
    
    function answerNext(index = 0) {
      if (index >= answers.length) return;
      
      fetch(`/api/movies/answer/${session.sessionId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          questionId: answers[index].questionId,
          answer: answers[index].answer,
          responseTime: 2000
        })
      })
      .then(r => r.json())
      .then(response => {
        if (response.type === 'recommendations') {
          console.log(`\n%c✅ Got ${response.recommendations.length} recommendations:`, 'color: #00ff00; font-size: 14px; font-weight: bold');
          response.recommendations.forEach((movie, i) => {
            console.log(`${i + 1}. ${movie.title} (${movie.year}) - ⭐ ${movie.rating?.toFixed(1)}`);
          });
          window.debugSession = { recommendations: response.recommendations };
        } else {
          answerNext(index + 1);
        }
      });
    }
    
    answerNext();
  });
}