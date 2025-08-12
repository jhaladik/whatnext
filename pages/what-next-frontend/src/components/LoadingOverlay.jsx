import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const LoadingOverlay = ({ show, type = 'recommendations' }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = type === 'recommendations' ? [
    "Analyzing your preferences...",
    "Searching through thousands of movies...",
    "Finding perfect matches...",
    "Almost there...",
    "Preparing your recommendations..."
  ] : [
    "Finding more great movies...",
    "Excluding what you've already seen...",
    "Matching your taste profile...",
    "Almost ready..."
  ];

  useEffect(() => {
    if (!show) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [show, messages.length]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            {/* AI Brain Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                {/* Outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-primary-200"
                >
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary-600 rounded-full" />
                </motion.div>
                
                {/* Middle ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-4 border-primary-300"
                >
                  <div className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full" />
                </motion.div>
                
                {/* Inner core */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-4 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
                >
                  {/* AI Icon */}
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Message */}
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {messages[messageIndex]}
              </h3>
            </motion.div>

            {/* Progress dots */}
            <div className="flex justify-center space-x-2 mt-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === messageIndex ? [1, 1.5, 1] : 1,
                    opacity: i <= messageIndex ? 1 : 0.3
                  }}
                  transition={{ duration: 0.5 }}
                  className={`w-2 h-2 rounded-full ${
                    i <= messageIndex ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Fun fact or tip */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-gray-500 text-center mt-4"
            >
              💡 Tip: Our AI analyzes over 50 movie attributes to find your perfect match!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;