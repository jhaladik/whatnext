import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import SwipeCard from './components/SwipeCard';
import ModernSwipeCard from './components/ModernSwipeCard';
import RecommendationCard from './components/RecommendationCard';
import ModernRecommendationCard from './components/ModernRecommendationCard';
import DonationPrompt from './components/DonationPrompt';
import ModernDonationPrompt from './components/ModernDonationPrompt';
import LoadingOverlay from './components/LoadingOverlay';
import ModernLanding from './components/ModernLanding';
import { useSwipeSession } from './hooks/useSwipeSession';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);
  const [timeSaved, setTimeSaved] = useState(25);
  const [allRecommendations, setAllRecommendations] = useState([]); // Track all movies shown
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track loading state for "Find more"
  const [isWaitingForAI, setIsWaitingForAI] = useState(false); // Track AI recommendation generation
  const [userFeedback, setUserFeedback] = useState({ loved: [], liked: [], disliked: [] }); // Track user feedback
  const [useModernDesign, setUseModernDesign] = useState(() => {
    // Load preference from localStorage, default to modern design
    const saved = localStorage.getItem('designPreference');
    return saved !== null ? saved === 'modern' : true;
  }); // Toggle for modern design
  
  const {
    currentQuestion,
    recommendations,
    progress,
    isLoading,
    error,
    domain,
    sessionId,
    sessionDuration,
    questionsAnswered,
    startSession,
    submitChoice,
    submitFeedback,
    resetSession,
    selectDomain,
    getMoreRecommendations
  } = useSwipeSession();

  const handleStart = async (domain = 'movies') => {
    setHasStarted(true);
    // Use selected domain, pass excluded movies if any
    await startSession(domain, allRecommendations.map(r => r.title));
  };

  const handleSwipe = async (questionId, choice, responseTime) => {
    try {
      // Determine if this is likely the last question before recommendations
      // Movies: typically 6 questions (index 0-5)
      // Series/Docs: typically 5 questions (index 0-4)
      const isDefinitelyLastQuestion = 
        (domain === 'movies' && questionsAnswered === 5) || // 6th question (index 5)
        (domain === 'series' && questionsAnswered === 4) || // 5th question (index 4)
        (domain === 'documentaries' && questionsAnswered === 4); // 5th question (index 4)
      
      if (isDefinitelyLastQuestion) {
        setIsWaitingForAI(true);
        // Ensure minimum animation time for better UX
        const submitPromise = submitChoice(questionId, choice, responseTime);
        const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));
        await Promise.all([submitPromise, delayPromise]);
      } else {
        await submitChoice(questionId, choice, responseTime);
      }
    } catch (error) {
      console.error('Error in handleSwipe:', error);
    } finally {
      setIsWaitingForAI(false);
    }
  };

  const handleFeedback = async (title, feedbackType) => {
    // Update local feedback state
    setUserFeedback(prev => {
      const newFeedback = { ...prev };
      
      // Remove from all arrays first
      newFeedback.loved = newFeedback.loved.filter(t => t !== title);
      newFeedback.liked = newFeedback.liked.filter(t => t !== title);
      newFeedback.disliked = newFeedback.disliked.filter(t => t !== title);
      
      // Add to appropriate array if feedback is not null
      if (feedbackType === 'loved') {
        newFeedback.loved.push(title);
      } else if (feedbackType === 'liked') {
        newFeedback.liked.push(title);
      } else if (feedbackType === 'disliked') {
        newFeedback.disliked.push(title);
      }
      
      return newFeedback;
    });
    
    // Submit to API (optional - can be done when finding more)
    if (sessionId) {
      await submitFeedback(title, feedbackType);
    }
  };

  const handleRestart = () => {
    resetSession();
    setHasStarted(false);
    setShowDonationPrompt(false);
    setAllRecommendations([]); // Clear all recommendations for fresh start
  };
  
  const handleFindMore = async () => {
    // Keep existing recommendations and find more using the same preferences
    const currentTitles = [...allRecommendations, ...recommendations].map(r => r.title);
    setAllRecommendations(prev => [...prev, ...recommendations]);
    
    // Show loading overlay
    setIsLoadingMore(true);
    
    try {
      // Call the API to get more recommendations with feedback
      await getMoreRecommendations(currentTitles, userFeedback);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Save design preference
  useEffect(() => {
    localStorage.setItem('designPreference', useModernDesign ? 'modern' : 'classic');
  }, [useModernDesign]);
  
  // Show donation prompt after recommendations are received
  useEffect(() => {
    if (recommendations && recommendations.length > 0 && hasStarted) {
      // Calculate time saved based on questions answered
      const minutesSaved = Math.max(15, questionsAnswered * 5);
      setTimeSaved(minutesSaved);
      
      // Show donation prompt after a delay
      const timer = setTimeout(() => {
        setShowDonationPrompt(true);
      }, 60000); // Show after 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, [recommendations, hasStarted, questionsAnswered]);

  // Landing Page
  if (!hasStarted) {
    // Use modern design
    if (useModernDesign) {
      return (
        <>
          <Toaster position="top-center" />
          <ModernLanding onStart={handleStart} />
          
          {/* Design toggle button */}
          <button
            onClick={() => setUseModernDesign(false)}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-sm hover:bg-white/20 transition"
          >
            Switch to Classic
          </button>
        </>
      );
    }
    
    // Classic design (original)
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        <Toaster position="top-center" />
        
        {/* Design toggle button */}
        <button
          onClick={() => setUseModernDesign(true)}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-primary-600 text-white rounded-full text-sm hover:bg-primary-700 transition shadow-lg"
        >
          Try Modern Design ✨
        </button>
        
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Skip the endless scroll.
            </h1>
            <h2 className="text-2xl md:text-3xl text-gray-600 mb-8">
              Find your perfect movie in 30 seconds.
            </h2>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="px-8 py-4 bg-primary-600 text-white text-xl font-semibold rounded-full hover:bg-primary-700 shadow-lg"
            >
              What should I watch? 🎬
            </motion.button>
            
            {/* Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-md"
              >
                <div className="text-4xl mb-3">⏱️</div>
                <h3 className="font-semibold text-lg mb-2">Save 20+ minutes</h3>
                <p className="text-gray-600">No more browsing through endless catalogs</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-md"
              >
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold text-lg mb-2">Perfect matches</h3>
                <p className="text-gray-600">AI-powered recommendations just for you</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-md"
              >
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-semibold text-lg mb-2">No accounts needed</h3>
                <p className="text-gray-600">Start swiping immediately, no signup</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Swipe Interface
  console.log('App state check:', {
    hasQuestion: !!currentQuestion,
    recommendationsLength: recommendations.length,
    recommendations: recommendations
  });
  
  if (currentQuestion && !recommendations.length) {
    console.log('Rendering SwipeCard with question:', currentQuestion);
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden">
        <Toaster position="top-center" />
        
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
        </div>
        
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800/50 z-50 backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Centered Content */}
        <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
          <div className="w-full max-w-lg -mt-8">
            {/* Header */}
            <div className="text-center mb-4">
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-purple-400 uppercase tracking-wide mb-1"
              >
                {domain === 'movies' ? '🎬 Finding Your Movie' : 'Finding Content'}
              </motion.p>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-gray-300"
              >
                Question {questionsAnswered + 1} of ~5
              </motion.p>
            </div>
            
            {/* Swipe Card */}
            <ModernSwipeCard
              question={currentQuestion}
              onSwipe={handleSwipe}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        {/* Loading overlay when waiting for AI recommendations */}
        <LoadingOverlay 
          show={isWaitingForAI} 
          type="recommendations"
          domain={domain}
        />
      </div>
    );
  }

  // Results Page
  console.log('About to check recommendations.length > 0:', recommendations.length > 0, 'length:', recommendations.length);
  if (recommendations.length > 0) {
    console.log('Rendering results page with recommendations:', recommendations);
    try {
      return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <Toaster position="top-center" />
        
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
        </div>
        
        <div className="relative z-10 py-8">
          {/* Header - Full width centered */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              <span className="text-5xl">
                {domain === 'series' ? '📺' : domain === 'documentaries' ? '🎥' : '🎬'}
              </span>
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 w-full">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Perfect Matches
              </span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg">
              Found in {sessionDuration}s • Saved you ~{timeSaved} minutes of browsing
            </p>
          </motion.div>
          
          {/* Feedback Explanation Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto mb-8 px-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-2xl border border-purple-500/20 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-1">💡</span>
                <div>
                  <h3 className="font-semibold text-purple-300 mb-1">Help us learn your taste!</h3>
                  <p className="text-sm text-gray-400">
                    Use the feedback buttons (💖 Loved it, 👍 Liked it, 👎 Not for me) on each recommendation. 
                    When you click "Find more", we'll use your feedback to suggest even better matches!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Recommendations */}
          <div className="space-y-6 max-w-4xl mx-auto px-4">
            {console.log('Mapping recommendations:', recommendations)}
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((rec, index) => {
                console.log('Rendering recommendation:', index, rec);
                return (
                  <ModernRecommendationCard
                    key={index}
                    recommendation={rec}
                    index={index}
                    onFeedback={handleFeedback}
                  />
                );
              })
            ) : (
              <div>No recommendations to display</div>
            )}
          </div>
          
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full flex flex-col items-center gap-4 mt-12"
          >
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFindMore}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
                <div className="relative bg-gradient-to-r from-purple-600 to-purple-500 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium sm:font-semibold text-sm sm:text-base">
                  Find more {domain === 'series' ? 'series' : domain === 'documentaries' ? 'documentaries' : 'movies'} 🔄
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRestart}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 font-medium sm:font-semibold border border-white/20 transition text-sm sm:text-base"
              >
                Start fresh ✨
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDonationPrompt(true)}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
                <div className="relative bg-gradient-to-r from-pink-500 to-pink-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium sm:font-semibold text-sm sm:text-base">
                  Support What Next ❤️
                </div>
              </motion.button>
            </div>
            
            <a 
              href="/terms" 
              target="_blank" 
              className="text-sm text-gray-400 hover:text-white underline mt-4 transition"
            >
              Terms of Service
            </a>
          </motion.div>
        </div>
        
        {/* Donation Prompt Modal */}
        <ModernDonationPrompt
          show={showDonationPrompt}
          timeSaved={timeSaved}
          sessionId={currentQuestion?.sessionId || 'anonymous'}
          onClose={() => setShowDonationPrompt(false)}
        />
        
        {/* Loading overlay when finding more movies */}
        <LoadingOverlay 
          show={isLoadingMore} 
          type="more"
          domain={domain}
        />
      </div>
    );
    } catch (error) {
      console.error('Error rendering results page:', error);
      return <div style={{color: 'red', fontSize: '20px'}}>Error rendering results: {error.message}</div>;
    }
  }

  // Loading state (between questions or waiting for AI)
  console.log('Falling through to loading state. Current state:', {
    currentQuestion,
    recommendations,
    hasStarted,
    isLoading
  });
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
      </div>
      
      <Toaster position="top-center" />
    </div>
  );
}

export default App;