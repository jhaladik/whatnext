import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRecommendationStore } from '@/store/recommendations';
import { Sparkles, Zap, Waves, Dice1, Palette, Clock } from 'lucide-react';

interface WelcomeScreenProps {
  onFlowSelected: () => void;
}

export function WelcomeScreen({ onFlowSelected }: WelcomeScreenProps) {
  const [greeting, setGreeting] = useState('');
  const [timeContext, setTimeContext] = useState<'morning' | 'afternoon' | 'evening' | 'lateNight'>('afternoon');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startSession } = useRecommendationStore();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeContext('morning');
      setGreeting('Good morning! Ready to find your perfect watch?');
    } else if (hour >= 12 && hour < 17) {
      setTimeContext('afternoon');
      setGreeting("Good afternoon! What are you in the mood for?");
    } else if (hour >= 17 && hour < 22) {
      setTimeContext('evening');
      setGreeting("Good evening! Let's find something perfect for tonight");
    } else {
      setTimeContext('lateNight');
      setGreeting("Late night viewing? Let's find something perfect");
    }
  }, []);

  const flowOptions = [
    {
      id: 'standard',
      title: 'Standard',
      description: '5 thoughtful questions',
      icon: Sparkles,
      time: '30 seconds',
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'quick',
      title: 'Quick Pick',
      description: '3 quick questions',
      icon: Zap,
      time: '15 seconds',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'deep',
      title: 'Deep Dive',
      description: '7 detailed questions',
      icon: Waves,
      time: '1 minute',
      color: 'from-blue-400 to-indigo-600'
    },
    {
      id: 'surprise',
      title: 'Surprise Me',
      description: 'Creative questions',
      icon: Dice1,
      time: '30 seconds',
      color: 'from-pink-400 to-rose-600'
    },
    {
      id: 'visual',
      title: 'Visual Mood',
      description: 'Choose by images',
      icon: Palette,
      time: '10 seconds',
      color: 'from-green-400 to-teal-600'
    }
  ];

  const handleFlowSelection = async (flowType: string) => {
    console.log('=== Starting session ===');
    console.log('Flow type:', flowType);
    console.log('Time context:', timeContext);
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Calling startSession...');
      await startSession({
        questionFlow: flowType as 'standard' | 'quick' | 'deep' | 'surprise' | 'visual',
        context: { timeOfDay: timeContext }
      });
      console.log('Session started successfully!');
      console.log('Calling onFlowSelected to navigate...');
      onFlowSelected();
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start session');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-8"
    >
      {/* Logo/Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-6xl md:text-8xl font-bold text-gradient mb-2">
          WhatNext
        </h1>
        <p className="text-center text-gray-600">
          Movie recommendations that understand you
        </p>
      </motion.div>

      {/* Greeting */}
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl md:text-3xl font-semibold mb-4 text-center text-gray-800"
      >
        {greeting}
      </motion.h2>

      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg text-gray-600 mb-12 text-center max-w-2xl"
      >
        Choose how you&apos;d like to find your next movie. Each path is designed to understand your current mood and preferences.
      </motion.p>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
        >
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </motion.div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-center"
        >
          <div className="loading-dots flex justify-center space-x-2 mb-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          </div>
          <p className="text-gray-600">Starting your session...</p>
        </motion.div>
      )}

      {/* Flow Options Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl w-full"
      >
        {flowOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              onClick={() => handleFlowSelection(option.id)}
              disabled={isLoading}
              className={`group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`mb-4 p-3 bg-gradient-to-br ${option.color} rounded-xl inline-block`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                {option.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 text-sm mb-3">
                {option.description}
              </p>
              
              {/* Time */}
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {option.time}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-16 text-center text-sm text-gray-500"
      >
        <p>Powered by AI • Personalized for you</p>
        <p className="mt-2 text-xs">Check console for debug info</p>
      </motion.div>
    </motion.div>
  );
}