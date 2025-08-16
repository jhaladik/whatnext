// Page Diagnostic Script - Check why movies aren't displaying
// Run this AFTER running the test script that gets recommendations

console.log('%c🔍 Page Content Diagnostic', 'color: yellow; font-size: 16px; font-weight: bold');
console.log('=====================================');

// Check if we have data
if (!window.debugSession || !window.debugSession.recommendations) {
  console.log('%c⚠️ No debug data found. Run the test script first!', 'color: orange; font-weight: bold');
} else {
  console.log('%c✅ Debug data found with ' + window.debugSession.recommendations.length + ' movies', 'color: green');
}

// Look for movie-related elements
console.log('\n%c1. Searching for Movie Elements...', 'color: cyan; font-weight: bold');
const allElements = document.querySelectorAll('*');
const movieElements = Array.from(allElements).filter(function(el) {
  const className = String(el.className || '');
  const id = String(el.id || '');
  return className.includes('movie') || className.includes('Movie') || 
         className.includes('card') || className.includes('Card') ||
         id.includes('movie') || id.includes('Movie');
});

console.log('Found ' + movieElements.length + ' movie-related elements:');
if (movieElements.length > 0) {
  movieElements.slice(0, 5).forEach(function(el) {
    console.log('  - ' + el.tagName + '.' + el.className);
  });
}

// Check for loading states
console.log('\n%c2. Checking Loading States...', 'color: cyan; font-weight: bold');
const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
console.log('Found ' + loadingElements.length + ' loading elements');
if (loadingElements.length > 0) {
  console.log('%c⚠️ Page may be stuck in loading state', 'color: orange');
}

// Check page text content
console.log('\n%c3. Checking Page Content...', 'color: cyan; font-weight: bold');
const bodyText = document.body.innerText || document.body.textContent || '';
if (window.debugSession && window.debugSession.recommendations && window.debugSession.recommendations[0]) {
  const firstMovieTitle = window.debugSession.recommendations[0].title;
  console.log('Page contains "' + firstMovieTitle + '"? ' + bodyText.includes(firstMovieTitle));
}
console.log('Page contains "recommendations"? ' + bodyText.toLowerCase().includes('recommend'));
console.log('Page contains "loading"? ' + bodyText.toLowerCase().includes('loading'));
console.log('Page contains "error"? ' + bodyText.toLowerCase().includes('error'));

// Check for containers
console.log('\n%c4. Checking Container Elements...', 'color: cyan; font-weight: bold');
const containers = document.querySelectorAll('[class*="container"], [class*="Container"], main, section');
console.log('Found ' + containers.length + ' container elements');

// Check for grid layouts
const grids = document.querySelectorAll('[class*="grid"], [class*="Grid"]');
console.log('Found ' + grids.length + ' grid elements');

// Look for Next.js error boundary
console.log('\n%c5. Checking for Errors...', 'color: cyan; font-weight: bold');
const errorBoundary = document.querySelector('#__next-error__');
if (errorBoundary) {
  console.log('%c❌ Next.js Error Boundary Active!', 'color: red; font-weight: bold');
} else {
  console.log('No Next.js error boundary found');
}

// Check for error messages
const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
if (errorElements.length > 0) {
  console.log('%c⚠️ Found ' + errorElements.length + ' error elements', 'color: orange');
  errorElements.forEach(function(el) {
    if (el.textContent) {
      console.log('  Error text: ' + el.textContent.substring(0, 100));
    }
  });
}

// Check storage
console.log('\n%c6. Storage Check...', 'color: cyan; font-weight: bold');
console.log('localStorage has debug_recommendations? ' + (localStorage.getItem('debug_recommendations') ? 'Yes' : 'No'));
console.log('localStorage has debug_sessionId? ' + (localStorage.getItem('debug_sessionId') ? 'Yes' : 'No'));
console.log('sessionStorage has recommendations_data? ' + (sessionStorage.getItem('recommendations_data') ? 'Yes' : 'No'));
console.log('sessionStorage has session_id? ' + (sessionStorage.getItem('session_id') ? 'Yes' : 'No'));

// Check URL
console.log('\n%c7. URL Check...', 'color: cyan; font-weight: bold');
console.log('Current URL: ' + window.location.href);
console.log('Pathname: ' + window.location.pathname);
console.log('Search params: ' + window.location.search);

// Manual injection test
console.log('\n%c8. Manual Injection Test...', 'color: cyan; font-weight: bold');
if (window.debugSession && window.debugSession.recommendations) {
  // Remove any existing test container
  const existingTest = document.getElementById('manual-test-container');
  if (existingTest) {
    existingTest.remove();
  }
  
  const testContainer = document.createElement('div');
  testContainer.id = 'manual-test-container';
  testContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: #333; color: white; z-index: 99999; max-height: 200px; overflow-y: auto;';
  
  const header = document.createElement('h3');
  header.style.cssText = 'margin: 0 0 10px 0; color: #00ff00;';
  header.textContent = '✅ Manual Test: Your ' + window.debugSession.recommendations.length + ' movies are:';
  testContainer.appendChild(header);
  
  const movieList = document.createElement('div');
  movieList.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';
  
  window.debugSession.recommendations.forEach(function(movie) {
    const movieDiv = document.createElement('div');
    movieDiv.style.cssText = 'padding: 5px 10px; background: #555; border-radius: 5px;';
    movieDiv.textContent = movie.title + ' (' + movie.year + ')';
    movieList.appendChild(movieDiv);
  });
  
  testContainer.appendChild(movieList);
  
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #ff0000; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = function() { testContainer.remove(); };
  testContainer.appendChild(closeBtn);
  
  document.body.appendChild(testContainer);
  console.log('%c✅ Test movies injected at bottom of page', 'color: green');
  console.log('If you see the movie list at the bottom, the data is correct but not being rendered by React');
} else {
  console.log('%c⚠️ No movie data to test with', 'color: orange');
}

// Check React Fiber
console.log('\n%c9. React Component Check...', 'color: cyan; font-weight: bold');
const reactRoot = document.getElementById('__next') || document.getElementById('root');
if (reactRoot) {
  console.log('React root element found: #' + reactRoot.id);
  console.log('Root element has children? ' + (reactRoot.children.length > 0 ? 'Yes (' + reactRoot.children.length + ')' : 'No'));
  
  // Check if React DevTools is available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('%c✅ React DevTools detected - check Components tab for state', 'color: green');
  } else {
    console.log('React DevTools not detected');
  }
}

// Summary
console.log('\n%c==================== SUMMARY ====================', 'color: yellow; font-size: 14px; font-weight: bold');

if (window.debugSession && window.debugSession.recommendations) {
  console.log('%c✅ API Data: Available (' + window.debugSession.recommendations.length + ' movies)', 'color: green');
} else {
  console.log('%c❌ API Data: Not available', 'color: red');
}

if (movieElements.length > 0) {
  console.log('%c✅ Movie Elements: Found (' + movieElements.length + ')', 'color: green');
} else {
  console.log('%c❌ Movie Elements: Not found', 'color: red');
}

if (loadingElements.length > 0) {
  console.log('%c⚠️ Loading State: Active', 'color: orange');
} else {
  console.log('%c✅ Loading State: Not active', 'color: green');
}

if (errorElements.length > 0 || errorBoundary) {
  console.log('%c❌ Errors: Found', 'color: red');
} else {
  console.log('%c✅ Errors: None detected', 'color: green');
}

console.log('\n%c💡 DIAGNOSIS:', 'color: cyan; font-size: 14px; font-weight: bold');
if (window.debugSession && window.debugSession.recommendations && movieElements.length === 0) {
  console.log('The API returns data correctly, but the React components are not rendering it.');
  console.log('Possible issues:');
  console.log('1. The recommendations page is not receiving the data from the API response');
  console.log('2. The component state is not being updated with the recommendations');
  console.log('3. There is a conditional rendering issue preventing display');
  console.log('4. The page expects data in a different format or location');
}

console.log('\n%c📝 To remove test overlay: document.getElementById("manual-test-container").remove()', 'color: gray');