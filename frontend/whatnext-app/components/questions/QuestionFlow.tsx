import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionCard } from './QuestionCard';
import { useRecommendationStore } from '@/store/recommendations';

export function QuestionFlow() {
  const { 
    questions, 
    currentQuestionIndex, 
    submitAnswer,
    questionFlow 
  } = useRecommendationStore();
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const currentQuestion = questions[currentQuestionIndex];
  const progress = {
    current: currentQuestionIndex + 1,
    total: questionFlow === 'quick' ? 3 : questionFlow === 'deep' ? 7 : 5
  };

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentQuestionIndex]);

  const handleAnswer = async (answerId: string) => {
    const responseTime = Date.now() - startTime;
    setIsTransitioning(true);
    
    if (currentQuestion) {
      await submitAnswer(currentQuestion.id, answerId, responseTime);
    }
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-dots flex justify-center space-x-2 mb-4">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
          </div>
          <p className="text-gray-600">Processing your answers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {!isTransitioning && currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <QuestionCard
              question={currentQuestion}
              progress={progress}
              onAnswer={handleAnswer}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}