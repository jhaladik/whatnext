import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const SwipeCard = ({ question, onSwipe, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startTime, setStartTime] = useState(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Log when new question is received
  useEffect(() => {
    if (question) {
      console.log('New question received:', question.id, question.text);
    }
  }, [question?.id]);
  
  const handleDragStart = () => {
    setIsDragging(true);
    setStartTime(Date.now());
  };
  
  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const responseTime = startTime ? Date.now() - startTime : 2000;
    
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      const choice = direction === 'right' ? 
        question.options?.[1]?.id : 
        question.options?.[0]?.id;
      
      if (!choice) return;
      
      // Immediately call onSwipe - the key prop will handle the reset
      onSwipe(question.id, choice, responseTime);
    } else {
      // Snap back to center
      x.set(0);
    }
  };
  
  const handleButtonClick = (choice) => {
    if (!choice || !question.options) return;
    const responseTime = 1000;
    
    // Immediately call onSwipe - the key prop will handle the animation
    onSwipe(question.id, choice, responseTime);
  };
  
  if (!question || !question.options || question.options.length < 2) {
    return (
      <div className="relative w-full max-w-md mx-auto h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full max-w-md mx-auto h-[500px] flex items-center justify-center">
      <motion.div
        key={question.id}
        className="absolute w-full bg-white rounded-2xl shadow-2xl p-8 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        initial={{ x: 0, rotate: 0, opacity: 1, scale: 1 }}
        style={{ x, rotate, opacity }}
        whileTap={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Question Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {question.text || question.question_text}
          </h2>
          {question.category && (
            <span className="text-sm text-gray-500 uppercase tracking-wide">
              {question.category}
            </span>
          )}
        </div>
        
        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Option */}
          <div 
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer
              ${isDragging && x.get() < -50 ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => !isLoading && handleButtonClick(question.options[0].id)}
          >
            <div className="text-4xl mb-2 text-center">
              {question.options[0].emoji}
            </div>
            <h3 className="font-semibold text-center mb-1">
              {question.options[0].text}
            </h3>
            {question.options[0].subtitle && (
              <p className="text-sm text-gray-600 text-center">
                {question.options[0].subtitle}
              </p>
            )}
          </div>
          
          {/* Right Option */}
          <div 
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer
              ${isDragging && x.get() > 50 ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => !isLoading && handleButtonClick(question.options[1].id)}
          >
            <div className="text-4xl mb-2 text-center">
              {question.options[1].emoji}
            </div>
            <h3 className="font-semibold text-center mb-1">
              {question.options[1].text}
            </h3>
            {question.options[1].subtitle && (
              <p className="text-sm text-gray-600 text-center">
                {question.options[1].subtitle}
              </p>
            )}
          </div>
        </div>
        
        {/* Swipe Hints */}
        <div className="flex justify-between mt-6 text-sm text-gray-400">
          <span>← Swipe for {question.options[0].text}</span>
          <span>Swipe for {question.options[1].text} →</span>
        </div>
      </motion.div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
};

export default SwipeCard;