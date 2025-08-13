import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackButtons = ({ itemTitle, onFeedback, initialState = null }) => {
  const [feedback, setFeedback] = useState(initialState); // 'loved', 'liked', 'disliked', null
  const [showTooltip, setShowTooltip] = useState(false);

  const handleFeedback = (type) => {
    const newFeedback = feedback === type ? null : type;
    setFeedback(newFeedback);
    onFeedback(itemTitle, newFeedback);
    
    // Show confirmation tooltip
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1500);
  };

  const buttons = [
    {
      type: 'loved',
      icon: '💖',
      activeIcon: '💖',
      label: 'Loved it!',
      color: 'from-pink-500 to-red-500',
      hoverColor: 'hover:text-pink-400'
    },
    {
      type: 'liked',
      icon: '👍',
      activeIcon: '👍',
      label: 'Liked it',
      color: 'from-blue-500 to-cyan-500',
      hoverColor: 'hover:text-blue-400'
    },
    {
      type: 'disliked',
      icon: '👎',
      activeIcon: '👎',
      label: 'Not for me',
      color: 'from-gray-500 to-gray-600',
      hoverColor: 'hover:text-gray-400'
    }
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {buttons.map((button) => (
          <motion.button
            key={button.type}
            onClick={() => handleFeedback(button.type)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative group"
          >
            {/* Active state glow */}
            {feedback === button.type && (
              <motion.div
                layoutId={`feedback-glow-${itemTitle}`}
                className={`absolute inset-0 bg-gradient-to-r ${button.color} rounded-full blur-md opacity-40`}
              />
            )}
            
            {/* Button */}
            <div className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all
              ${feedback === button.type 
                ? `bg-gradient-to-r ${button.color} text-white` 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 ' + button.hoverColor
              }
            `}>
              <span className="text-sm">
                {feedback === button.type ? button.activeIcon : button.icon}
              </span>
              <span className="text-xs font-medium">
                {button.label}
              </span>
            </div>

            {/* Tooltip on hover */}
            <AnimatePresence>
              {!feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 pointer-events-none"
                >
                  <div className="bg-black/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                    Click to mark as {button.type.replace('liked', 'loved').replace('disliked', 'not interested')}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Confirmation tooltip */}
      <AnimatePresence>
        {showTooltip && feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 text-xs px-3 py-1 rounded-full whitespace-nowrap">
              ✓ Feedback saved
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactFeedbackButtons = ({ itemTitle, onFeedback, initialState = null }) => {
  const [feedback, setFeedback] = useState(initialState);

  // Reset feedback when initialState or itemTitle changes
  useEffect(() => {
    setFeedback(initialState);
  }, [initialState, itemTitle]);

  const handleFeedback = (type) => {
    const newFeedback = feedback === type ? null : type;
    setFeedback(newFeedback);
    onFeedback(itemTitle, newFeedback);
  };

  return (
    <div className="flex items-center gap-1">
      <motion.button
        onClick={() => handleFeedback('loved')}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        className={`p-1.5 rounded-lg transition-all ${
          feedback === 'loved' 
            ? 'bg-pink-500/20 text-pink-400' 
            : 'bg-white/5 hover:bg-white/10 text-gray-500 hover:text-pink-400'
        }`}
        title="Loved it!"
      >
        <span className="text-lg">💖</span>
      </motion.button>

      <motion.button
        onClick={() => handleFeedback('liked')}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        className={`p-1.5 rounded-lg transition-all ${
          feedback === 'liked' 
            ? 'bg-blue-500/20 text-blue-400' 
            : 'bg-white/5 hover:bg-white/10 text-gray-500 hover:text-blue-400'
        }`}
        title="Liked it"
      >
        <span className="text-lg">👍</span>
      </motion.button>

      <motion.button
        onClick={() => handleFeedback('disliked')}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        className={`p-1.5 rounded-lg transition-all ${
          feedback === 'disliked' 
            ? 'bg-gray-500/20 text-gray-400' 
            : 'bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-400'
        }`}
        title="Not for me"
      >
        <span className="text-lg">👎</span>
      </motion.button>
    </div>
  );
};

export default FeedbackButtons;