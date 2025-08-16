# Run Browser Console Test

Go to https://whatnext-frontend.pages.dev/ and open the browser console (F12), then paste this entire script:

```javascript
// Fixed Browser Console Test Script for WhatNext Frontend
// Copy and paste this entire script into the browser console

console.log('%c🎬 WhatNext Frontend Diagnostic Test (Fixed)', 'color: #00ff00; font-size: 20px; font-weight: bold');
console.log('%c==========================================', 'color: #00ff00');

// Store session data globally for debugging
window.debugSession = {};

// Test with standard flow instead of quick flow
console.log('\n%c[TEST 1] Starting Standard Session...', 'color: yellow; font-weight: bold');

fetch('/api/movies/start', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    domain: 'movies',
    questionFlow: 'standard',  // Using standard flow
    context: {
      timeOfDay: 'evening',
      dayOfWeek: 'Friday',
      season: 'winter'
    }
  })
})
.then(r => r.json())
.then(session => {
  console.log('%c✅ Session Started!', 'color: #00ff00');
  console.log('Session ID:', session.sessionId);
  console.log('First Question:', session.question?.text);
  console.log('Question ID:', session.question?.id);
  
  window.debugSession.sessionId = session.sessionId;
  window.debugSession.session = session;
  
  // Function to answer a question based on the response
  function answerQuestion(response, questionNumber) {
    if (response.type === 'recommendations') {
      console.log('%c✅ RECOMMENDATIONS RECEIVED!', 'color: #00ff00; font-size: 16px; font-weight: bold');
      handleRecommendations(response);
      return Promise.resolve(response);
    }
    
    if (!response.question) {
      console.log('%c❌ No question in response', 'color: red');
      return Promise.resolve(response);
    }
    
    const questionId = response.question.id;
    const questionText = response.question.text;
    console.log(`\n%c[Q${questionNumber}] ${questionText}`, 'color: cyan');
    console.log(`Question ID: ${questionId}`);
    
    // Map answers based on question ID or text content
    let answer = 'moderate'; // default
    
    // Try to match by ID first
    const answerMap = {
      'cognitive_load': 'easy',
      'emotional_tone': 'uplifting',
      'personal_context': 'escaping',
      'attention_level': 'moderate',
      'discovery_mode': 'familiar',
      'mood_check': 'relaxed',
      'time_commitment': 'standard',
      'surprise_me': 'familiar'
    };
    
    if (answerMap[questionId]) {
      answer = answerMap[questionId];
    } else if (response.question.options && response.question.options.length > 0) {
      // Pick first available option if we don't recognize the question
      answer = response.question.options[0].id;
      console.log('Using first available option:', answer);
    }
    
    console.log(`Answering with: ${answer}`);
    
    return fetch(`/api/movies/answer/${session.sessionId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        questionId: questionId,
        answer: answer,
        responseTime: 2000
      })
    })
    .then(r => r.json())
    .then(nextResponse => {
      console.log('Response received:', {
        type: nextResponse.type,
        hasQuestion: !!nextResponse.question,
        hasRecommendations: !!nextResponse.recommendations
      });
      
      // Recursively answer next question
      if (nextResponse.question || nextResponse.type === 'recommendations') {
        return answerQuestion(nextResponse, questionNumber + 1);
      }
      return nextResponse;
    });
  }
  
  // Start answering questions
  console.log('\n%c[TEST 2] Answering Questions...', 'color: yellow; font-weight: bold');
  
  // Start with the first question from the session
  return answerQuestion(session, 1);
})
.catch(error => {
  console.error('%c❌ Error:', 'color: red; font-weight: bold', error);
});

function handleRecommendations(response) {
  window.debugSession.recommendations = response.recommendations;
  window.debugSession.fullResponse = response;
  
  console.log('Number of movies:', response.recommendations?.length || 0);
  
  if (response.recommendations && response.recommendations.length > 0) {
    console.log('\n%c📽️ MOVIE RECOMMENDATIONS:', 'color: #00ff00; font-size: 16px; font-weight: bold');
    
    // Display all movies with their details
    response.recommendations.forEach((movie, index) => {
      console.log(`\n%c${index + 1}. ${movie.title} (${movie.year})`, 'color: cyan; font-size: 14px; font-weight: bold');
      console.log(`   Rating: ⭐ ${movie.rating?.toFixed(1)}`);
      console.log(`   Genres: ${movie.genres?.join(', ')}`);
      console.log(`   Runtime: ${movie.runtime} min`);
      if (movie.isSurprise) {
        console.log(`   %c🎯 SURPRISE PICK!`, 'color: yellow');
      }
    });
    
    const firstMovie = response.recommendations[0];
    
    console.log('\n%c📊 First Movie Details:', 'color: cyan; font-weight: bold');
    console.table({
      movieId: firstMovie.movieId,
      title: firstMovie.title,
      year: firstMovie.year,
      rating: firstMovie.rating,
      runtime: firstMovie.runtime,
      genres: firstMovie.genres?.join(', '),
      hasPoster: !!firstMovie.poster
    });
    
    // Check required fields
    const requiredFields = ['movieId', 'title', 'year', 'rating', 'genres', 'overview'];
    const missingFields = requiredFields.filter(field => !firstMovie[field]);
    
    if (missingFields.length > 0) {
      console.log('%c⚠️ Missing Required Fields:', 'color: orange; font-weight: bold');
      console.log(missingFields);
    } else {
      console.log('%c✅ All Required Fields Present!', 'color: #00ff00');
    }
    
    // Save to storage
    localStorage.setItem('debug_recommendations', JSON.stringify(response));
    localStorage.setItem('debug_sessionId', window.debugSession.sessionId);
    sessionStorage.setItem('recommendations_data', JSON.stringify(response));
    sessionStorage.setItem('session_id', window.debugSession.sessionId);
    
    console.log('\n%c💾 Data saved to storage', 'color: #00ff00');
    
    // Test poster
    if (firstMovie.poster) {
      const img = new Image();
      img.onload = () => console.log('%c✅ Poster loads successfully!', 'color: #00ff00');
      img.onerror = () => console.log('%c❌ Poster failed to load', 'color: red');
      img.src = firstMovie.poster;
    }
  }
  
  console.log('\n%c========== SUMMARY ==========', 'color: #00ff00; font-size: 14px; font-weight: bold');
  console.log('%c✅ API Working', 'color: #00ff00');
  console.log('%c✅ Data Structure Correct', 'color: #00ff00');
  console.log(`%c✅ ${response.recommendations?.length || 0} Movies Received`, 'color: #00ff00');
  
  console.log('\n%c📝 Debug Commands:', 'color: yellow; font-weight: bold');
  console.log('window.debugSession - All debug data');
  console.log('window.testMovieCard() - Show test overlay');
  console.log('window.navigateWithData() - Go to recommendations');
}

// Helper functions
window.testMovieCard = function() {
  if (!window.debugSession.recommendations) {
    console.log('No data yet. Run the test first.');
    return;
  }
  
  const movie = window.debugSession.recommendations[0];
  const testDiv = document.createElement('div');
  testDiv.id = 'test-movie-card';
  testDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: white; padding: 20px; border: 3px solid #00ff00; border-radius: 10px; z-index: 99999; color: black; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 300px;';
  testDiv.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #00ff00;">✅ Test Movie Card</h3>
    <img src="${movie.poster}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">
    <p style="margin: 5px 0;"><strong>${movie.title}</strong> (${movie.year})</p>
    <p style="margin: 5px 0;">⭐ ${movie.rating?.toFixed(1)} | ⏱️ ${movie.runtime}min</p>
    <p style="margin: 5px 0; font-size: 12px;">${movie.genres?.join(', ')}</p>
    <button onclick="document.getElementById('test-movie-card').remove()" style="margin-top: 10px; padding: 5px 10px; background: #ff0000; color: white; border: none; border-radius: 3px; cursor: pointer;">Close</button>
  `;
  document.body.appendChild(testDiv);
  console.log('%c✅ Test card shown (top-right)', 'color: #00ff00');
};

window.navigateWithData = function() {
  if (!window.debugSession.fullResponse) {
    console.log('No data yet. Run the test first.');
    return;
  }
  window.location.href = '/recommendations';
};

console.log('%c🚀 Test starting...', 'color: cyan; font-size: 14px');
```

After running this, tell me what movies it recommends!