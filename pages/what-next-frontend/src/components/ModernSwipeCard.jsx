import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const ModernSwipeCard = ({ question, onSwipe, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [hoveredOption, setHoveredOption] = useState(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Color transforms for swipe feedback
  const leftGlow = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const rightGlow = useTransform(x, [0, 50, 200], [0, 0.5, 1]);
  
  useEffect(() => {
    if (question) {
      console.log('New question received:', question.id, question.text);
      setStartTime(Date.now());
    }
  }, [question?.id]);
  
  const handleDragStart = () => {
    setIsDragging(true);
    if (!startTime) setStartTime(Date.now());
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
      
      onSwipe(question.id, choice, responseTime);
    } else {
      x.set(0);
    }
  };
  
  const handleButtonClick = (choice) => {
    if (!choice || !question.options || isLoading) return;
    const responseTime = startTime ? Date.now() - startTime : 1000;
    
    onSwipe(question.id, choice, responseTime);
  };
  
  if (!question || !question.options || question.options.length < 2) {
    return (
      <div className="relative w-full max-w-md mx-auto h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full">
      {/* Swipe indicators - hidden on mobile, visible on larger screens */}
      <motion.div 
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-20 pointer-events-none z-20"
        style={{ opacity: leftGlow }}
      >
        <div className="text-6xl opacity-50">👈</div>
        <p className="text-purple-400 text-sm mt-2 text-center">Swipe left</p>
      </motion.div>
      
      <motion.div 
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-20 pointer-events-none z-20"
        style={{ opacity: rightGlow }}
      >
        <div className="text-6xl opacity-50">👉</div>
        <p className="text-pink-400 text-sm mt-2 text-center">Swipe right</p>
      </motion.div>
      
      {/* Main Card */}
      <motion.div
        key={question.id}
        className="relative w-full cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        initial={{ x: 0, rotate: 0, opacity: 0, scale: 0.9 }}
        animate={{ x: 0, rotate: 0, opacity: 1, scale: 1 }}
        exit={{ x: -300, opacity: 0, scale: 0.8 }}
        style={{ x, rotate, opacity }}
        whileTap={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Card glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl" />
        
        {/* Card content */}
        <div className="relative bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 p-4 sm:p-5 lg:p-6 shadow-2xl">
          {/* Question header */}
          <div className="text-center mb-4 sm:mb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                       rounded-full mb-2 sm:mb-3 backdrop-blur-md border border-purple-500/30"
            >
              <span className="text-xs text-purple-300 uppercase tracking-wider">
                {question.category || 'Preference'}
              </span>
            </motion.div>
            
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
              {question.text || question.question_text}
            </h2>
            
            {question.description && (
              <p className="text-gray-400 text-xs sm:text-sm">{question.description}</p>
            )}
          </div>
          
          {/* Options */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Left Option */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setHoveredOption(0)}
              onHoverEnd={() => setHoveredOption(null)}
              className={`relative group cursor-pointer`}
              onClick={() => handleButtonClick(question.options[0].id)}
            >
              {/* Option glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br from-purple-600/30 to-purple-400/30 
                            rounded-2xl blur-lg transition-opacity ${hoveredOption === 0 ? 'opacity-100' : 'opacity-0'}`} />
              
              <div className={`relative p-3 sm:p-4 lg:p-5 rounded-2xl border-2 transition-all
                ${isDragging && x.get() < -50 
                  ? 'border-purple-500 bg-purple-500/20' 
                  : hoveredOption === 0
                    ? 'border-purple-400/50 bg-white/10'
                    : 'border-white/20 bg-white/5'}`}
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3 text-center filter drop-shadow-lg">
                  {question.options[0].emoji}
                </div>
                <p className="text-center text-white font-medium text-sm sm:text-base">
                  {question.options[0].text}
                </p>
                
                {/* Hover indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredOption === 0 ? 1 : 0 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 hidden sm:block"
                >
                  <div className="px-3 py-1 bg-purple-500 rounded-full text-xs text-white whitespace-nowrap">
                    Press A or ←
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Right Option */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setHoveredOption(1)}
              onHoverEnd={() => setHoveredOption(null)}
              className={`relative group cursor-pointer`}
              onClick={() => handleButtonClick(question.options[1].id)}
            >
              {/* Option glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br from-pink-600/30 to-pink-400/30 
                            rounded-2xl blur-lg transition-opacity ${hoveredOption === 1 ? 'opacity-100' : 'opacity-0'}`} />
              
              <div className={`relative p-3 sm:p-4 lg:p-5 rounded-2xl border-2 transition-all
                ${isDragging && x.get() > 50 
                  ? 'border-pink-500 bg-pink-500/20' 
                  : hoveredOption === 1
                    ? 'border-pink-400/50 bg-white/10'
                    : 'border-white/20 bg-white/5'}`}
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3 text-center filter drop-shadow-lg">
                  {question.options[1].emoji}
                </div>
                <p className="text-center text-white font-medium text-sm sm:text-base">
                  {question.options[1].text}
                </p>
                
                {/* Hover indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredOption === 1 ? 1 : 0 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 hidden sm:block"
                >
                  <div className="px-3 py-1 bg-pink-500 rounded-full text-xs text-white whitespace-nowrap">
                    Press D or →
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          {/* Swipe hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-3 sm:mt-4"
          >
            <p className="text-gray-500 text-xs sm:text-sm">
              Swipe or click to choose • Press A/D or ←/→
            </p>
          </motion.div>
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ModernSwipeCard;