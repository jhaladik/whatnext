import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import SwipeCard from './components/SwipeCard';
import RecommendationCard from './components/RecommendationCard';
import DonationPrompt from './components/DonationPrompt';
import LoadingOverlay from './components/LoadingOverlay';
import { useSwipeSession } from './hooks/useSwipeSession';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);
  const [timeSaved, setTimeSaved] = useState(25);
  const [allRecommendations, setAllRecommendations] = useState([]); // Track all movies shown
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track loading state for "Find more"
  const [isWaitingForAI, setIsWaitingForAI] = useState(false); // Track AI recommendation generation
  
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

  const handleStart = async () => {
    setHasStarted(true);
    // Default to movies domain, pass excluded movies if any
    await startSession('movies', allRecommendations.map(r => r.title));
  };

  const handleSwipe = async (questionId, choice, responseTime) => {
    try {
      // Check if this might be the last question (progress >= 80%)
      if (progress >= 80) {
        setIsWaitingForAI(true);
      }
      
      await submitChoice(questionId, choice, responseTime);
    } catch (error) {
      console.error('Error in handleSwipe:', error);
    } finally {
      setIsWaitingForAI(false);
    }
  };

  const handleFeedback = async (index, feedback) => {
    await submitFeedback(index, feedback);
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
      // Call the API to get more recommendations without new questions
      await getMoreRecommendations(currentTitles);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Show donation prompt after recommendations are received
  useEffect(() => {
    if (recommendations && recommendations.length > 0 && hasStarted) {
      // Calculate time saved based on questions answered
      const minutesSaved = Math.max(15, questionsAnswered * 5);
      setTimeSaved(minutesSaved);
      
      // Show donation prompt after a delay
      const timer = setTimeout(() => {
        setShowDonationPrompt(true);
      }, 5000); // Show after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [recommendations, hasStarted, questionsAnswered]);

  // Landing Page
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        <Toaster position="top-center" />
        
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        <Toaster position="top-center" />
        
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
              {domain === 'movies' ? 'Finding Movies' : 'Finding Content'}
            </p>
            <p className="text-lg text-gray-700">
              Question {questionsAnswered + 1} of ~5
            </p>
          </div>
          
          {/* Swipe Card */}
          <SwipeCard
            question={currentQuestion}
            onSwipe={handleSwipe}
            isLoading={isLoading}
          />
        </div>
        
        {/* Loading overlay when waiting for AI recommendations */}
        <LoadingOverlay 
          show={isWaitingForAI || (isLoading && progress >= 80)} 
          type="recommendations" 
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        <Toaster position="top-center" />
        
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Perfect matches for you
            </h1>
            <p className="text-gray-600">
              Found in {sessionDuration}s • Saved you ~22 minutes of browsing
            </p>
          </motion.div>
          
          {/* Recommendations */}
          <div className="space-y-6 max-w-4xl mx-auto">
            {console.log('Mapping recommendations:', recommendations)}
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((rec, index) => {
                console.log('Rendering recommendation:', index, rec);
                return (
                  <RecommendationCard
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
            className="flex flex-col items-center gap-4 mt-12"
          >
            <div className="flex gap-4">
              <button
                onClick={handleFindMore}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                Find more movies
              </button>
              
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
              >
                Start fresh
              </button>
              
              <button
                onClick={() => setShowDonationPrompt(true)}
                className="px-6 py-3 bg-accent-pink text-white rounded-lg hover:bg-pink-600 font-semibold"
              >
                Support What Next ❤️
              </button>
            </div>
            
            <a 
              href="/terms" 
              target="_blank" 
              className="text-sm text-gray-500 hover:text-gray-700 underline mt-4"
            >
              Terms of Service
            </a>
          </motion.div>
        </div>
        
        {/* Donation Prompt Modal */}
        <DonationPrompt
          show={showDonationPrompt}
          timeSaved={timeSaved}
          sessionId={currentQuestion?.sessionId || 'anonymous'}
          onClose={() => setShowDonationPrompt(false)}
        />
        
        {/* Loading overlay when finding more movies */}
        <LoadingOverlay 
          show={isLoadingMore} 
          type="more" 
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
      <Toaster position="top-center" />
      <LoadingOverlay 
        show={true} 
        type={isLoading && hasStarted ? "recommendations" : "more"} 
      />
    </div>
  );
}

export default App;