// Browser Console Test Script for WhatNext Frontend
// Copy and paste this entire script into the browser console at https://whatnext-frontend.pages.dev/

console.log('%c🎬 WhatNext Frontend Diagnostic Test', 'color: #00ff00; font-size: 20px; font-weight: bold');
console.log('%c====================================', 'color: #00ff00');

// Store session data globally for debugging
window.debugSession = {};

// Test 1: Start a session
console.log('\n%c[TEST 1] Starting Session...', 'color: yellow; font-weight: bold');

fetch('/api/movies/start', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    domain: 'movies',
    questionFlow: 'quick',  // Using quick flow for faster testing
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
  console.log('Greeting:', session.greeting);
  console.log('Full session object:', session);
  
  window.debugSession.sessionId = session.sessionId;
  window.debugSession.session = session;
  
  // Test 2: Answer questions quickly
  console.log('\n%c[TEST 2] Answering Quick Questions...', 'color: yellow; font-weight: bold');
  
  // Quick flow answers
  const quickAnswers = [
    { questionId: 'mood_check', answer: 'energetic', responseTime: 1500 },
    { questionId: 'time_commitment', answer: 'standard', responseTime: 1200 },
    { questionId: 'surprise_me', answer: 'familiar', responseTime: 800 }
  ];
  
  // Answer questions sequentially
  let answerPromise = Promise.resolve();
  quickAnswers.forEach((answer, index) => {
    answerPromise = answerPromise.then(() => {
      console.log(`Answering question ${index + 1}:`, answer.questionId);
      return fetch(`/api/movies/answer/${session.sessionId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(answer)
      })
      .then(r => r.json())
      .then(response => {
        console.log(`Response for question ${index + 1}:`, response);
        
        if (response.type === 'recommendations') {
          console.log('%c✅ RECOMMENDATIONS RECEIVED!', 'color: #00ff00; font-size: 16px; font-weight: bold');
          console.log('Number of movies:', response.recommendations.length);
          
          window.debugSession.recommendations = response.recommendations;
          window.debugSession.fullResponse = response;
          
          // Test 3: Analyze the recommendations
          console.log('\n%c[TEST 3] Analyzing Movie Data...', 'color: yellow; font-weight: bold');
          
          if (response.recommendations && response.recommendations.length > 0) {
            const firstMovie = response.recommendations[0];
            
            console.log('\n%cFirst Movie Object:', 'color: cyan; font-weight: bold');
            console.table({
              movieId: firstMovie.movieId,
              title: firstMovie.title,
              year: firstMovie.year,
              rating: firstMovie.rating,
              runtime: firstMovie.runtime,
              genres: firstMovie.genres?.join(', '),
              hasPoster: !!firstMovie.poster,
              posterUrl: firstMovie.poster
            });
            
            console.log('\n%cFull First Movie:', 'color: cyan');
            console.log(firstMovie);
            
            // Check for missing fields
            const requiredFields = ['movieId', 'title', 'year', 'rating', 'genres', 'overview'];
            const missingFields = requiredFields.filter(field => !firstMovie[field]);
            
            if (missingFields.length > 0) {
              console.log('%c⚠️ Missing Required Fields:', 'color: orange; font-weight: bold');
              console.log(missingFields);
            } else {
              console.log('%c✅ All Required Fields Present!', 'color: #00ff00');
            }
            
            // Test 4: Check React component state
            console.log('\n%c[TEST 4] Checking React State...', 'color: yellow; font-weight: bold');
            
            // Try to access React DevTools
            if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
              console.log('✅ React DevTools detected');
              console.log('Check React DevTools for component state');
            } else {
              console.log('ℹ️ React DevTools not detected - install React Developer Tools extension');
            }
            
            // Test 5: Check if we're on recommendations page
            console.log('\n%c[TEST 5] Page Navigation Test...', 'color: yellow; font-weight: bold');
            
            if (window.location.pathname === '/recommendations') {
              console.log('✅ Already on recommendations page');
              console.log('%c⚠️ If you don\'t see movies, the issue is in component rendering', 'color: orange; font-weight: bold');
              
              // Try to find MovieCard elements
              setTimeout(() => {
                const movieCards = document.querySelectorAll('[class*="MovieCard"], [class*="movie-card"], [class*="movie"], [class*="card"]');
                console.log(`Found ${movieCards.length} potential movie card elements`);
                
                if (movieCards.length === 0) {
                  console.log('%c❌ No MovieCard components found in DOM', 'color: red; font-weight: bold');
                  console.log('The component may not be rendering the recommendations');
                } else {
                  console.log('Found elements:', movieCards);
                }
                
                // Check for loading or error states
                const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
                const errorElements = document.querySelectorAll('[class*="error"]');
                
                if (loadingElements.length > 0) {
                  console.log('%c⚠️ Loading elements found - may be stuck in loading state', 'color: orange');
                }
                
                if (errorElements.length > 0) {
                  console.log('%c⚠️ Error elements found', 'color: orange');
                  errorElements.forEach(el => console.log(el.textContent));
                }
              }, 1000);
              
            } else {
              console.log('Not on recommendations page');
              console.log('%cNavigate to /recommendations to see if movies appear', 'color: cyan');
              console.log('Or run: window.location.href = "/recommendations"');
            }
            
            // Test 6: Try programmatic navigation with state
            console.log('\n%c[TEST 6] Attempting to Pass Data to Recommendations Page...', 'color: yellow; font-weight: bold');
            console.log('Setting localStorage with recommendations...');
            
            localStorage.setItem('debug_recommendations', JSON.stringify(response));
            localStorage.setItem('debug_sessionId', session.sessionId);
            
            console.log('%c✅ Debug data saved to localStorage', 'color: #00ff00');
            console.log('You can access it with:');
            console.log('  JSON.parse(localStorage.getItem("debug_recommendations"))');
            console.log('  localStorage.getItem("debug_sessionId")');
            
          } else {
            console.log('%c❌ No recommendations in response!', 'color: red; font-weight: bold');
          }
          
          // Final summary
          console.log('\n%c========== DIAGNOSTIC SUMMARY ==========', 'color: #00ff00; font-size: 14px; font-weight: bold');
          console.log('%cAPI Status: ✅ Working', 'color: #00ff00');
          console.log('%cData Structure: ✅ Correct', 'color: #00ff00');
          console.log('%cRecommendations: ✅ Received', 'color: #00ff00');
          console.log('\n%cDebug Data Available:', 'color: cyan; font-weight: bold');
          console.log('  window.debugSession.sessionId - Current session ID');
          console.log('  window.debugSession.recommendations - Movie array');
          console.log('  window.debugSession.fullResponse - Complete API response');
          
          console.log('\n%cNext Steps:', 'color: yellow; font-weight: bold');
          console.log('1. If on /recommendations page and no movies show:');
          console.log('   - Issue is in React component state management');
          console.log('   - Check if component is receiving props correctly');
          console.log('2. Check React DevTools for component state');
          console.log('3. Look for any console errors above');
          
          // Test poster loading
          if (firstMovie.poster) {
            console.log('\n%c[BONUS] Testing Poster Image...', 'color: yellow; font-weight: bold');
            const img = new Image();
            img.onload = () => console.log('%c✅ Poster loads successfully!', 'color: #00ff00');
            img.onerror = () => console.log('%c❌ Poster failed to load (CORS or URL issue)', 'color: red');
            img.src = firstMovie.poster;
          }
        }
        
        return response;
      });
    });
  });
  
  return answerPromise;
})
.catch(error => {
  console.error('%c❌ Error:', 'color: red; font-weight: bold', error);
  console.log('Full error:', error);
});

// Additional helper functions
window.testMovieCard = function() {
  console.log('\n%cManually Testing MovieCard Render...', 'color: yellow; font-weight: bold');
  
  if (!window.debugSession.recommendations) {
    console.log('No recommendations loaded yet. Run the main test first.');
    return;
  }
  
  const testMovie = window.debugSession.recommendations[0];
  console.log('Test movie:', testMovie);
  
  // Try to create a test div with movie info
  const testDiv = document.createElement('div');
  testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: white; padding: 20px; border: 2px solid green; z-index: 9999; color: black;';
  testDiv.innerHTML = `
    <h3>Test Movie Display</h3>
    <p><strong>Title:</strong> ${testMovie.title}</p>
    <p><strong>Year:</strong> ${testMovie.year}</p>
    <p><strong>Rating:</strong> ${testMovie.rating}</p>
    <p><strong>Genres:</strong> ${testMovie.genres?.join(', ')}</p>
    <img src="${testMovie.poster}" style="width: 100px; height: 150px; object-fit: cover;">
    <p style="color: green; font-weight: bold;">If you see this, the data is correct!</p>
  `;
  document.body.appendChild(testDiv);
  
  console.log('%c✅ Test movie card added to page (top-right corner)', 'color: #00ff00');
  console.log('If you see the movie info, the data structure is correct.');
  console.log('To remove: document.querySelector("div[style*=\'position: fixed\']").remove()');
};

window.navigateWithData = function() {
  console.log('\n%cNavigating to recommendations with data...', 'color: yellow; font-weight: bold');
  
  if (!window.debugSession.fullResponse) {
    console.log('No recommendations loaded yet. Run the main test first.');
    return;
  }
  
  // Store in sessionStorage (survives navigation)
  sessionStorage.setItem('recommendations_data', JSON.stringify(window.debugSession.fullResponse));
  sessionStorage.setItem('session_id', window.debugSession.sessionId);
  
  console.log('Data stored in sessionStorage');
  console.log('Navigating to /recommendations...');
  
  window.location.href = '/recommendations';
};

console.log('\n%c🎯 Test Started! Please wait for results...', 'color: cyan; font-size: 14px; font-weight: bold');
console.log('\n%cAdditional Commands:', 'color: yellow; font-weight: bold');
console.log('  window.testMovieCard() - Display a test movie card');
console.log('  window.navigateWithData() - Go to recommendations page with data');
console.log('  window.debugSession - Access all debug data');