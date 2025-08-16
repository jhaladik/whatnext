import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronRight, SkipForward } from 'lucide-react';
import { Question } from '@/services/api/client';

interface QuestionCardProps {
  question: Question;
  progress: {
    current: number;
    total: number;
  };
  onAnswer: (answerId: string) => void;
}

export function QuestionCard({ question, progress, onAnswer }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    setIsSubmitting(true);
    
    // Smooth transition before submitting
    setTimeout(() => {
      onAnswer(optionId);
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-2xl mx-auto p-8"
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {progress.current} of {progress.total}</span>
          <span>{Math.round((progress.current / progress.total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full gradient-purple-pink rounded-full"
          />
        </div>
      </div>

      {/* Question Text */}
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-bold mb-8 text-center text-gray-800"
      >
        {question.text}
      </motion.h2>

      {/* Options Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`grid gap-4 ${
          question.type === 'visual' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
        }`}
      >
        {question.options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionSelect(option.id)}
            disabled={isSubmitting}
            className={`
              relative p-6 rounded-xl border-2 transition-all duration-300
              ${selectedOption === option.id 
                ? 'border-purple-500 bg-purple-50 shadow-lg' 
                : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-md'
              }
              ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Visual option */}
            {question.type === 'visual' && option.image ? (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                <img 
                  src={option.image} 
                  alt={option.text || ''} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  {/* Emoji if present */}
                  {option.emoji && (
                    <span className="text-3xl mr-4">{option.emoji}</span>
                  )}
                  
                  {/* Text content */}
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-800">{option.text}</p>
                  </div>
                </div>
                
                {/* Arrow indicator */}
                <ChevronRight 
                  className={`w-5 h-5 transition-all ${
                    selectedOption === option.id 
                      ? 'text-purple-500 translate-x-1' 
                      : 'text-gray-400'
                  }`}
                />
              </div>
            )}

            {/* Selected indicator */}
            <AnimatePresence>
              {selectedOption === option.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-2 right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </motion.div>

      {/* Skip Option */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => handleOptionSelect('skip')}
        disabled={isSubmitting}
        className="mt-6 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 w-full transition-colors"
      >
        <SkipForward className="w-4 h-4 mr-1" />
        Skip this question
      </motion.button>
    </motion.div>
  );
}