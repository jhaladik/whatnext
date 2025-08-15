# 🎬 WhatNext Frontend Implementation Guide
## Complete Modern Frontend for Enhanced Movie Recommendations Worker

### Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [API Integration Layer](#api-integration-layer)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [UI/UX Flows](#uiux-flows)
7. [Responsive Design](#responsive-design)
8. [Animation & Interactions](#animation--interactions)
9. [Implementation Phases](#implementation-phases)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend App                          │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Pages     │ │  Components  │ │   Layouts    │        │
│  └─────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │    Zustand  │ │   Contexts   │ │    Hooks     │        │
│  └─────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  API Client │ │   WebSocket  │ │    Cache     │        │
│  └─────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Movie Recommendations Worker
```

---

## 💻 Technology Stack

```javascript
// Core Framework
const techStack = {
  framework: 'Next.js 14',      // App Router, Server Components
  ui: 'React 18',               // With Suspense & Transitions
  styling: 'Tailwind CSS',      // Utility-first CSS
  animations: 'Framer Motion',  // Smooth animations
  state: 'Zustand',            // Lightweight state management
  forms: 'React Hook Form',     // Form handling
  validation: 'Zod',           // Schema validation
  charts: 'Recharts',          // Data visualization
  icons: 'Lucide React',       // Modern icons
  images: 'Next/Image',        // Optimized images
  pwa: 'next-pwa',            // Progressive Web App
  testing: 'Vitest + RTL'      // Testing
};
```

---

## 🔌 API Integration Layer

### API Client Service

```typescript
// src/services/api/client.ts
import { z } from 'zod';

class MovieRecommendationAPI {
  private baseURL: string;
  private sessionId: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://movie-rec.workers.dev';
  }

  // Session Management
  async startSession(options?: {
    domain?: 'movies' | 'tv-series';
    questionFlow?: 'standard' | 'quick' | 'deep' | 'surprise' | 'visual';
    context?: Record<string, any>;
  }) {
    const response = await fetch(`${this.baseURL}/api/movies/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    
    const data = await response.json();
    this.sessionId = data.sessionId;
    return data;
  }

  // Answer submission
  async submitAnswer(questionId: string, answer: string, responseTime?: number) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/answer/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer, responseTime })
      }
    );
    
    return response.json();
  }

  // Refinement
  async refineRecommendations(feedback: Array<{
    movieId: string;
    reaction: 'like' | 'dislike' | 'neutral';
  }>, action?: string) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/refine/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, action })
      }
    );
    
    return response.json();
  }

  // Quick adjustments
  async quickAdjust(adjustmentType: 'lighter' | 'deeper' | 'weirder' | 'safer' | 'shorter' | 'longer') {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/adjust/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentType })
      }
    );
    
    return response.json();
  }

  // Validation & Feedback
  async validateMoment(feedbackType: string, userResponse: any) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/validate/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType, response: userResponse })
      }
    );
    
    return response.json();
  }

  // Get moment summary
  async getMomentSummary() {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/moment/${this.sessionId}`
    );
    
    return response.json();
  }

  // Track interaction
  async trackInteraction(movieId: string, interactionType: string, metadata?: any) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/interaction/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, interactionType, metadata })
      }
    );
    
    return response.json();
  }

  // Get movie details
  async getMovieDetails(movieId: string) {
    const response = await fetch(`${this.baseURL}/api/movies/${movieId}`);
    return response.json();
  }

  // Analytics endpoints
  async getAnalytics(type: 'questions' | 'sessions' | 'clusters' | 'temporal' | 'recommendations' | 'drift' | 'insights') {
    const response = await fetch(`${this.baseURL}/api/analytics/${type}`);
    return response.json();
  }
}

export const api = new MovieRecommendationAPI();
```

---

## 🧩 Component Architecture

### Core Components Structure

```typescript
// src/components/structure.ts
const componentStructure = {
  // Layout Components
  layouts: {
    'AppLayout': 'Main app wrapper with navigation',
    'QuestionLayout': 'Question flow container',
    'RecommendationLayout': 'Results display container'
  },

  // Question Flow Components
  questionFlow: {
    'WelcomeScreen': 'Time-aware greeting and flow selection',
    'QuestionCard': 'Individual question display',
    'QuestionOptions': 'Answer options (standard, visual, emoji)',
    'ProgressIndicator': 'Question progress visualization',
    'FlowSelector': 'Choose question flow type'
  },

  // Recommendation Components
  recommendations: {
    'MovieCard': 'Individual movie display',
    'MovieGrid': 'Responsive grid layout',
    'SurpriseIndicator': 'Highlight surprise picks',
    'QuickReactions': 'Micro-feedback buttons',
    'MomentSummary': 'Emotional profile visualization',
    'RefinementBar': 'Quick adjustment controls'
  },

  // Feedback Components
  feedback: {
    'ValidationPrompt': 'How did we do?',
    'MoodAdjuster': 'Quick mood shift buttons',
    'FeedbackModal': 'Detailed feedback collection',
    'MomentVisualization': 'Radar chart of emotional state'
  },

  // UI Elements
  elements: {
    'AnimatedButton': 'Framer Motion enhanced buttons',
    'LoadingState': 'Creative loading animations',
    'TransitionWrapper': 'Page transitions',
    'TooltipWithReason': 'Why we picked this movie'
  }
};
```

### 1. Welcome Screen Component

```tsx
// src/components/welcome/WelcomeScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { api } from '@/services/api/client';
import { useRecommendationStore } from '@/store/recommendations';

export function WelcomeScreen() {
  const [greeting, setGreeting] = useState('');
  const [timeContext, setTimeContext] = useState<'morning' | 'afternoon' | 'evening' | 'lateNight'>('afternoon');
  const { startSession } = useRecommendationStore();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeContext('morning');
      setGreeting('Good morning! Ready to find your perfect watch?');
    } else if (hour >= 12 && hour < 17) {
      setTimeContext('afternoon');
      setGreeting('Good afternoon! What are you in the mood for?');
    } else if (hour >= 17 && hour < 22) {
      setTimeContext('evening');
      setGreeting('Good evening! Let\'s find something perfect for tonight');
    } else {
      setTimeContext('lateNight');
      setGreeting('Late night viewing? Let\'s find something perfect');
    }
  }, []);

  const flowOptions = [
    {
      id: 'standard',
      title: 'Standard',
      description: '5 thoughtful questions',
      icon: '🎯',
      time: '30 seconds'
    },
    {
      id: 'quick',
      title: 'Quick Pick',
      description: '3 quick questions',
      icon: '⚡',
      time: '15 seconds'
    },
    {
      id: 'deep',
      title: 'Deep Dive',
      description: '7 detailed questions',
      icon: '🌊',
      time: '1 minute'
    },
    {
      id: 'surprise',
      title: 'Surprise Me',
      description: 'Creative questions',
      icon: '🎲',
      time: '30 seconds'
    },
    {
      id: 'visual',
      title: 'Visual Mood',
      description: 'Choose by images',
      icon: '🎨',
      time: '10 seconds'
    }
  ];

  const handleFlowSelection = async (flowType: string) => {
    await startSession({
      questionFlow: flowType as any,
      context: { timeOfDay: timeContext }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-8"
    >
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-6xl font-bold mb-4 text-center"
      >
        {greeting}
      </motion.h1>

      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-gray-600 mb-12 text-center"
      >
        Choose how you'd like to find your next movie
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
      >
        {flowOptions.map((option, index) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            onClick={() => handleFlowSelection(option.id)}
            className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-3">{option.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{option.description}</p>
            <p className="text-xs text-gray-400">{option.time}</p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
```

### 2. Enhanced Question Component

```tsx
// src/components/questions/QuestionCard.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRecommendationStore } from '@/store/recommendations';

interface QuestionProps {
  question: {
    id: string;
    text: string;
    type: 'standard' | 'visual' | 'creative' | 'quick';
    options: Array<{
      id: string;
      text?: string;
      emoji?: string;
      image?: string;
      vector?: Record<string, number>;
    }>;
    order: number;
  };
  progress: {
    current: number;
    total: number;
  };
  onAnswer: (answerId: string) => void;
}

export function QuestionCard({ question, progress, onAnswer }: QuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState(0);
  const startTime = Date.now();

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    const timeTaken = Date.now() - startTime;
    setResponseTime(timeTaken);
    
    // Smooth transition before submitting
    setTimeout(() => {
      onAnswer(optionId);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-2xl mx-auto p-8"
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {progress.current} of {progress.total}</span>
          <span>{Math.round((progress.current / progress.total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Question Text */}
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-bold mb-8 text-center"
      >
        {question.text}
      </motion.h2>

      {/* Options Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`
          grid gap-4
          ${question.type === 'visual' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}
        `}
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
            className={`
              ${question.type === 'visual' ? 'p-2' : 'p-6'}
              rounded-xl border-2 transition-all
              ${selectedOption === option.id 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            {question.type === 'visual' && option.image ? (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                <img 
                  src={option.image} 
                  alt={option.text || ''} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center">
                {option.emoji && (
                  <span className="text-3xl mr-4">{option.emoji}</span>
                )}
                <div className="text-left flex-1">
                  <p className="font-semibold">{option.text}</p>
                  {option.examples && (
                    <p className="text-sm text-gray-600 mt-1">{option.examples}</p>
                  )}
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Skip Option */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => handleOptionSelect('skip')}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700 text-center w-full"
      >
        Skip this question →
      </motion.button>
    </motion.div>
  );
}
```

### 3. Movie Recommendations Grid

```tsx
// src/components/recommendations/MovieGrid.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { MovieCard } from './MovieCard';
import { MomentSummary } from './MomentSummary';
import { RefinementBar } from './RefinementBar';
import { ValidationPrompt } from '../feedback/ValidationPrompt';

interface Movie {
  movieId: string;
  title: string;
  poster: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  isSurprise: boolean;
  surpriseReason?: string;
  streamingOn?: Array<{ name: string; logo: string }>;
}

interface MovieGridProps {
  recommendations: Movie[];
  moment: any;
  validation: any;
  onRefine: (feedback: any) => void;
  onQuickAdjust: (type: string) => void;
}

export function MovieGrid({ 
  recommendations, 
  moment, 
  validation, 
  onRefine, 
  onQuickAdjust 
}: MovieGridProps) {
  const [showMoment, setShowMoment] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 md:p-8"
    >
      {/* Moment Summary - Shows first */}
      <AnimatePresence>
        {showMoment && moment && (
          <MomentSummary 
            moment={moment}
            onDismiss={() => setShowMoment(false)}
          />
        )}
      </AnimatePresence>

      {/* Validation Prompt */}
      {!feedbackGiven && (
        <ValidationPrompt
          validation={validation}
          onFeedback={(response) => {
            setFeedbackGiven(true);
            // Handle feedback
          }}
        />
      )}

      {/* Quick Refinement Bar */}
      <RefinementBar onAdjust={onQuickAdjust} />

      {/* Movie Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
      >
        <AnimatePresence>
          {recommendations.map((movie, index) => (
            <MovieCard
              key={movie.movieId}
              movie={movie}
              index={index}
              onReaction={(reaction) => {
                // Handle individual movie reaction
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Load More / Refine */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <button
          onClick={() => onRefine({})}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:shadow-lg transition-shadow"
        >
          Show me more like these
        </button>
      </motion.div>
    </motion.div>
  );
}
```

### 4. Individual Movie Card

```tsx
// src/components/recommendations/MovieCard.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, Eye, X, Info, Play, Plus } from 'lucide-react';

interface MovieCardProps {
  movie: {
    movieId: string;
    title: string;
    poster: string;
    year: number;
    rating: number;
    genres: string[];
    overview: string;
    isSurprise: boolean;
    surpriseReason?: string;
    streamingOn?: Array<{ name: string; logo: string }>;
  };
  index: number;
  onReaction: (reaction: string) => void;
}

export function MovieCard({ movie, index, onReaction }: MovieCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const handleReaction = (type: string) => {
    setReaction(type);
    onReaction(type);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="relative group"
    >
      {/* Surprise Badge */}
      {movie.isSurprise && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className="absolute -top-2 -right-2 z-10"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            ✨ Surprise Pick
          </div>
        </motion.div>
      )}

      {/* Movie Poster */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay on Hover */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col justify-end"
        >
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReaction('love')}
              className={`p-2 rounded-full ${
                reaction === 'love' ? 'bg-red-500' : 'bg-white/20 backdrop-blur'
              }`}
            >
              <Heart className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReaction('seen')}
              className="p-2 bg-white/20 backdrop-blur rounded-full"
            >
              <Eye className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReaction('not_interested')}
              className="p-2 bg-white/20 backdrop-blur rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 bg-white/20 backdrop-blur rounded-full ml-auto"
            >
              <Info className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          {/* Movie Info */}
          <h3 className="text-white font-bold text-lg mb-1">{movie.title}</h3>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span>{movie.year}</span>
            <span>•</span>
            <span>⭐ {movie.rating.toFixed(1)}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {movie.genres.slice(0, 3).map(genre => (
              <span key={genre} className="px-2 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white">
                {genre}
              </span>
            ))}
          </div>

          {/* Streaming Platforms */}
          {movie.streamingOn && movie.streamingOn.length > 0 && (
            <div className="flex gap-2 mt-3">
              {movie.streamingOn.map(platform => (
                <img
                  key={platform.name}
                  src={platform.logo}
                  alt={platform.name}
                  className="w-8 h-8 rounded"
                  title={platform.name}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Surprise Reason Tooltip */}
      {movie.isSurprise && movie.surpriseReason && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute -bottom-2 left-0 right-0 mx-2"
        >
          <div className="bg-black/90 text-white text-xs p-2 rounded-lg">
            💡 {movie.surpriseReason}
          </div>
        </motion.div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-white rounded-xl p-4 shadow-xl z-20"
          >
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-2 right-2 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg mb-2">{movie.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{movie.overview}</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-semibold">
                <Play className="w-4 h-4 inline mr-1" />
                Watch Now
              </button>
              <button className="flex-1 py-2 border border-purple-500 text-purple-500 rounded-lg font-semibold">
                <Plus className="w-4 h-4 inline mr-1" />
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### 5. Moment Visualization Component

```tsx
// src/components/recommendations/MomentSummary.tsx
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface MomentSummaryProps {
  moment: {
    description: string;
    emoji: string;
    confidence: number;
    visualization: {
      dimensions: Array<{ axis: string; value: number }>;
      color: string;
    };
  };
  onDismiss: () => void;
}

export function MomentSummary({ moment, onDismiss }: MomentSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 mb-8 text-white"
    >
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Text Summary */}
        <div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-6xl mb-4"
          >
            {moment.emoji}
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Your Moment</h2>
          <p className="text-lg opacity-90 mb-4">{moment.description}</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${moment.confidence}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="bg-white h-2 rounded-full"
              />
            </div>
            <span className="text-sm">{moment.confidence}% match</span>
          </div>
        </div>

        {/* Right: Visualization */}
        <div className="bg-white/10 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={moment.visualization.dimensions}>
              <PolarGrid stroke="rgba(255,255,255,0.3)" />
              <PolarAngleAxis 
                dataKey="axis" 
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <Radar
                dataKey="value"
                stroke="white"
                fill="rgba(255,255,255,0.5)"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDismiss}
        className="mt-6 px-6 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-semibold"
      >
        Got it, show me movies!
      </motion.button>
    </motion.div>
  );
}
```

### 6. Quick Refinement Bar

```tsx
// src/components/recommendations/RefinementBar.tsx
import { motion } from 'framer-motion';
import { Sun, Waves, Theater, Home, Clock, Film } from 'lucide-react';

interface RefinementBarProps {
  onAdjust: (type: string) => void;
}

export function RefinementBar({ onAdjust }: RefinementBarProps) {
  const adjustments = [
    { id: 'lighter', label: 'Lighter', icon: Sun, color: 'from-yellow-400 to-orange-400' },
    { id: 'deeper', label: 'Deeper', icon: Waves, color: 'from-blue-400 to-indigo-400' },
    { id: 'weirder', label: 'Weirder', icon: Theater, color: 'from-purple-400 to-pink-400' },
    { id: 'safer', label: 'Safer', icon: Home, color: 'from-green-400 to-teal-400' },
    { id: 'shorter', label: 'Shorter', icon: Clock, color: 'from-gray-400 to-gray-600' },
    { id: 'longer', label: 'Epic', icon: Film, color: 'from-red-400 to-rose-400' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-3 justify-center mb-8"
    >
      <span className="text-gray-600 self-center mr-2">Quick adjust:</span>
      {adjustments.map((adj, index) => {
        const Icon = adj.icon;
        return (
          <motion.button
            key={adj.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdjust(adj.id)}
            className={`px-4 py-2 bg-gradient-to-r ${adj.color} text-white rounded-full flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow`}
          >
            <Icon className="w-4 h-4" />
            {adj.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
```

---

## 🎯 State Management

### Zustand Store

```typescript
// src/store/recommendations.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { api } from '@/services/api/client';

interface Question {
  id: string;
  text: string;
  type: string;
  options: any[];
  order: number;
}

interface Movie {
  movieId: string;
  title: string;
  poster: string;
  // ... other properties
}

interface RecommendationState {
  // Session
  sessionId: string | null;
  domain: 'movies' | 'tv-series';
  questionFlow: string;
  
  // Questions
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  
  // Recommendations
  recommendations: Movie[];
  moment: any;
  validation: any;
  emotionalProfile: any;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startSession: (options?: any) => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
  refineRecommendations: (feedback: any) => Promise<void>;
  quickAdjust: (type: string) => Promise<void>;
  validateMoment: (feedback: any) => Promise<void>;
  trackInteraction: (movieId: string, type: string) => Promise<void>;
  reset: () => void;
}

export const useRecommendationStore = create<RecommendationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sessionId: null,
        domain: 'movies',
        questionFlow: 'standard',
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        recommendations: [],
        moment: null,
        validation: null,
        emotionalProfile: null,
        isLoading: false,
        error: null,

        // Start new session
        startSession: async (options = {}) => {
          set({ isLoading: true, error: null });
          try {
            const response = await api.startSession(options);
            set({
              sessionId: response.sessionId,
              questions: response.questions || [],
              currentQuestionIndex: 0,
              domain: response.domain,
              questionFlow: response.flowType,
              isLoading: false
            });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        // Submit answer
        submitAnswer: async (questionId: string, answer: string) => {
          set({ isLoading: true });
          try {
            const response = await api.submitAnswer(questionId, answer);
            const { answers, currentQuestionIndex } = get();
            
            set({
              answers: { ...answers, [questionId]: answer },
              currentQuestionIndex: currentQuestionIndex + 1,
              isLoading: false
            });

            // Check if we have recommendations
            if (response.type === 'recommendations') {
              set({
                recommendations: response.recommendations,
                moment: response.moment,
                validation: response.validation
              });
            }
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        // Refine recommendations
        refineRecommendations: async (feedback) => {
          set({ isLoading: true });
          try {
            const response = await api.refineRecommendations(feedback);
            set({
              recommendations: response.recommendations,
              isLoading: false
            });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        // Quick adjust
        quickAdjust: async (type) => {
          set({ isLoading: true });
          try {
            const response = await api.quickAdjust(type);
            set({
              recommendations: response.recommendations,
              isLoading: false
            });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        // Validate moment
        validateMoment: async (feedback) => {
          try {
            await api.validateMoment('overall_impression', feedback);
          } catch (error) {
            console.error('Failed to validate moment:', error);
          }
        },

        // Track interaction
        trackInteraction: async (movieId, type) => {
          try {
            await api.trackInteraction(movieId, type);
          } catch (error) {
            console.error('Failed to track interaction:', error);
          }
        },

        // Reset
        reset: () => {
          set({
            sessionId: null,
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            recommendations: [],
            moment: null,
            validation: null,
            emotionalProfile: null,
            isLoading: false,
            error: null
          });
        }
      }),
      {
        name: 'recommendation-storage',
        partialize: (state) => ({
          sessionId: state.sessionId,
          answers: state.answers,
          recommendations: state.recommendations
        })
      }
    )
  )
);
```

---

## 🎨 UI/UX Flows

### User Journey Map

```typescript
// src/flows/userJourney.ts
const userJourney = {
  1: {
    stage: 'Welcome',
    components: ['WelcomeScreen'],
    actions: ['Choose question flow', 'View time-aware greeting'],
    duration: '5-10 seconds'
  },
  2: {
    stage: 'Question Flow',
    components: ['QuestionCard', 'ProgressIndicator'],
    actions: ['Answer questions', 'Skip if needed', 'See progress'],
    duration: '15-60 seconds'
  },
  3: {
    stage: 'Processing',
    components: ['LoadingAnimation'],
    actions: ['Watch creative loading', 'Build anticipation'],
    duration: '2-3 seconds'
  },
  4: {
    stage: 'Moment Reveal',
    components: ['MomentSummary', 'ValidationPrompt'],
    actions: ['See emotional profile', 'Validate accuracy'],
    duration: '5-10 seconds'
  },
  5: {
    stage: 'Recommendations',
    components: ['MovieGrid', 'MovieCard', 'RefinementBar'],
    actions: ['Browse movies', 'React to picks', 'Quick adjust'],
    duration: '2-5 minutes'
  },
  6: {
    stage: 'Refinement',
    components: ['FeedbackModal', 'RefinementBar'],
    actions: ['Provide feedback', 'Request changes', 'Get new picks'],
    duration: '30 seconds'
  }
};
```

---

## 📱 Responsive Design

### Breakpoint System

```scss
// src/styles/breakpoints.scss
$breakpoints: (
  'xs': 375px,   // Mobile S
  'sm': 640px,   // Mobile L
  'md': 768px,   // Tablet
  'lg': 1024px,  // Desktop
  'xl': 1280px,  // Desktop L
  '2xl': 1536px  // Desktop XL
);

// Responsive grid layouts
.movie-grid {
  display: grid;
  gap: 1.5rem;
  
  @media (min-width: 375px) {
    grid-template-columns: 1fr;
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## ✨ Animation & Interactions

### Animation Presets

```typescript
// src/utils/animations.ts
export const animations = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3 }
  },

  // Card animations
  cardEntry: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 100 }
  },

  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },

  // Hover effects
  hoverScale: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  },

  // Loading pulse
  loadingPulse: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity
    }
  }
};
```

### Loading States

```tsx
// src/components/loading/CreativeLoader.tsx
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function CreativeLoader() {
  const [message, setMessage] = useState('Finding your perfect matches...');
  
  const messages = [
    'Finding your perfect matches...',
    'Consulting the movie spirits...',
    'Analyzing your mood...',
    'Discovering hidden gems...',
    'Almost there...'
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <motion.div
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="relative w-24 h-24 mb-8"
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="absolute inset-0"
            style={{
              transform: `rotate(${i * 45}deg)`
            }}
          >
            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
          </motion.div>
        ))}
      </motion.div>
      
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-lg text-gray-600"
      >
        {message}
      </motion.p>
    </div>
  );
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Setup (Week 1)
```bash
# Setup
- Initialize Next.js 14 project
- Install dependencies
- Setup Tailwind CSS
- Configure environment variables
- Create API client service
- Setup Zustand store
- Implement basic routing
```

### Phase 2: Question Flow (Week 2)
```bash
# Components
- WelcomeScreen with flow selection
- QuestionCard with all types
- ProgressIndicator
- Visual question support
- Creative question variants
- Response time tracking
```

### Phase 3: Recommendations Display (Week 3)
```bash
# Components
- MovieGrid responsive layout
- MovieCard with interactions
- SurpriseIndicator
- MomentSummary visualization
- ValidationPrompt
- Quick reaction buttons
```

### Phase 4: Refinement System (Week 4)
```bash
# Features
- RefinementBar
- Quick adjustments
- Feedback collection
- Session persistence
- Analytics tracking
- Error handling
```

### Phase 5: Polish & PWA (Week 5)
```bash
# Enhancements
- Animations & transitions
- Loading states
- PWA configuration
- Performance optimization
- Accessibility
- Testing
```

---

## 📊 Analytics Integration

```typescript
// src/services/analytics.ts
export class Analytics {
  static track(event: string, properties?: any) {
    // Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, properties);
    }
    
    // Mixpanel
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.track(event, properties);
    }
  }

  static events = {
    SESSION_START: 'session_start',
    QUESTION_ANSWERED: 'question_answered',
    RECOMMENDATIONS_VIEWED: 'recommendations_viewed',
    MOVIE_INTERACTED: 'movie_interacted',
    REFINEMENT_REQUESTED: 'refinement_requested',
    QUICK_ADJUST_USED: 'quick_adjust_used',
    MOMENT_VALIDATED: 'moment_validated'
  };
}
```

---

## 🎯 Performance Optimizations

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Image optimization
import Image from 'next/image';

<Image
  src={movie.poster}
  alt={movie.title}
  width={300}
  height={450}
  loading="lazy"
  placeholder="blur"
  blurDataURL={movie.posterBlur}
/>

// Code splitting
const MovieDetails = dynamic(() => import('./MovieDetails'), {
  loading: () => <MovieDetailsSkeleton />,
  ssr: false
});
```

---

## 🔒 Security Considerations

```typescript
// src/utils/security.ts
export const security = {
  // Sanitize user input
  sanitizeInput: (input: string) => {
    return DOMPurify.sanitize(input);
  },

  // Validate session
  validateSession: async (sessionId: string) => {
    // Implement session validation
    return true;
  },

  // Rate limiting on client
  clientRateLimit: new Map(),

  // CSP headers
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "https://image.tmdb.org"],
  }
};
```

---

## 🧪 Testing Strategy

```typescript
// src/__tests__/components/QuestionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from '@/components/questions/QuestionCard';

describe('QuestionCard', () => {
  it('renders question text', () => {
    const question = {
      id: 'test',
      text: 'Test question?',
      options: [{ id: '1', text: 'Option 1' }]
    };
    
    render(<QuestionCard question={question} />);
    expect(screen.getByText('Test question?')).toBeInTheDocument();
  });

  it('handles option selection', () => {
    const onAnswer = jest.fn();
    const question = {
      id: 'test',
      text: 'Test?',
      options: [{ id: '1', text: 'Option 1' }]
    };
    
    render(<QuestionCard question={question} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText('Option 1'));
    
    expect(onAnswer).toHaveBeenCalledWith('1');
  });
});
```

---

## 🎨 Design System

```typescript
// src/styles/design-tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: '#faf5ff',
      500: '#a855f7',
      900: '#581c87'
    },
    secondary: {
      50: '#fdf2f8',
      500: '#ec4899',
      900: '#831843'
    }
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  },
  
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  },
  
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px'
  }
};
```

---

## 📦 Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

This comprehensive guide provides everything needed to build a modern, engaging frontend that fully utilizes all the capabilities of your enhanced movie-recommendations worker!