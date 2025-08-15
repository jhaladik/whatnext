# 🎨 WhatNext Component Library
## Production-Ready React Components for Movie Recommendations

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   ├── questions/page.tsx    # Question flow
│   │   ├── recommendations/page.tsx # Results
│   │   └── api/                  # API routes if needed
│   ├── components/
│   │   ├── welcome/              # Welcome & flow selection
│   │   ├── questions/            # Question components
│   │   ├── recommendations/      # Movie display
│   │   ├── feedback/             # Validation & feedback
│   │   ├── ui/                   # Reusable UI elements
│   │   └── layout/               # Layout components
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # API & external services
│   ├── store/                    # Zustand stores
│   ├── styles/                   # Global styles & themes
│   ├── types/                    # TypeScript definitions
│   └── utils/                    # Utility functions
├── public/                       # Static assets
├── tests/                        # Test files
└── package.json
```

---

## 🎯 Core Page Components

### 1. Main App Layout

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { Providers } from '@/components/providers/Providers';
import { Navigation } from '@/components/layout/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhatNext - Find Your Perfect Movie',
  description: 'AI-powered movie recommendations that understand your mood',
  manifest: '/manifest.json',
  themeColor: '#a855f7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
        <Providers>
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Home Page

```tsx
// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { useRecommendationStore } from '@/store/recommendations';

export default function HomePage() {
  const router = useRouter();
  const { sessionId, reset } = useRecommendationStore();

  useEffect(() => {
    // Reset if coming back to home
    if (sessionId) {
      reset();
    }
  }, []);

  const handleFlowSelected = () => {
    router.push('/questions');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <WelcomeScreen onFlowSelected={handleFlowSelected} />
    </div>
  );
}
```

### 3. Questions Page

```tsx
// src/app/questions/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionFlow } from '@/components/questions/QuestionFlow';
import { useRecommendationStore } from '@/store/recommendations';
import { CreativeLoader } from '@/components/ui/CreativeLoader';

export default function QuestionsPage() {
  const router = useRouter();
  const { sessionId, recommendations, isLoading } = useRecommendationStore();

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
    }
  }, [sessionId]);

  useEffect(() => {
    if (recommendations.length > 0) {
      router.push('/recommendations');
    }
  }, [recommendations]);

  if (isLoading) {
    return <CreativeLoader />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <QuestionFlow />
    </div>
  );
}
```

### 4. Recommendations Page

```tsx
// src/app/recommendations/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecommendationsView } from '@/components/recommendations/RecommendationsView';
import { useRecommendationStore } from '@/store/recommendations';

export default function RecommendationsPage() {
  const router = useRouter();
  const { recommendations, sessionId } = useRecommendationStore();

  useEffect(() => {
    if (!sessionId || recommendations.length === 0) {
      router.push('/');
    }
  }, [sessionId, recommendations]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <RecommendationsView />
    </div>
  );
}
```

---

## 🧩 Component Implementations

### Enhanced Question Flow Component

```tsx
// src/components/questions/QuestionFlow.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionCard } from './QuestionCard';
import { VisualQuestionCard } from './VisualQuestionCard';
import { CreativeQuestionCard } from './CreativeQuestionCard';
import { useRecommendationStore } from '@/store/recommendations';
import { useQuestionTimer } from '@/hooks/useQuestionTimer';

export function QuestionFlow() {
  const { 
    questions, 
    currentQuestionIndex, 
    submitAnswer,
    questionFlow 
  } = useRecommendationStore();
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { startTimer, stopTimer, getElapsedTime } = useQuestionTimer();

  const currentQuestion = questions[currentQuestionIndex];
  const progress = {
    current: currentQuestionIndex + 1,
    total: questions.length
  };

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentQuestionIndex]);

  const handleAnswer = async (answerId: string) => {
    const responseTime = getElapsedTime();
    setIsTransitioning(true);
    
    await submitAnswer(currentQuestion.id, answerId, responseTime);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const getQuestionComponent = () => {
    switch (currentQuestion?.type) {
      case 'visual':
        return (
          <VisualQuestionCard
            question={currentQuestion}
            progress={progress}
            onAnswer={handleAnswer}
          />
        );
      case 'creative':
        return (
          <CreativeQuestionCard
            question={currentQuestion}
            progress={progress}
            onAnswer={handleAnswer}
          />
        );
      default:
        return (
          <QuestionCard
            question={currentQuestion}
            progress={progress}
            onAnswer={handleAnswer}
          />
        );
    }
  };

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
            {getQuestionComponent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Visual Question Card

```tsx
// src/components/questions/VisualQuestionCard.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

interface VisualQuestionCardProps {
  question: {
    id: string;
    text: string;
    options: Array<{
      id: string;
      image: string;
      alt: string;
      vector?: Record<string, number>;
    }>;
  };
  progress: { current: number; total: number };
  onAnswer: (answerId: string) => void;
}

export function VisualQuestionCard({ question, progress, onAnswer }: VisualQuestionCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    setSelectedId(optionId);
    setTimeout(() => onAnswer(optionId), 500);
  };

  return (
    <div className="p-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Visual Selection</span>
          <span>{progress.current} / {progress.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-center mb-12"
      >
        {question.text}
      </motion.h2>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {question.options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setHoveredId(option.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleSelect(option.id)}
            className={`
              relative aspect-video rounded-2xl overflow-hidden
              ring-4 transition-all duration-300
              ${selectedId === option.id 
                ? 'ring-purple-500 ring-offset-4' 
                : hoveredId === option.id
                ? 'ring-purple-300 ring-offset-2'
                : 'ring-transparent'
              }
            `}
          >
            <Image
              src={option.image}
              alt={option.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            
            {/* Overlay on hover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredId === option.id ? 1 : 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4"
            >
              <p className="text-white font-semibold">{option.alt}</p>
            </motion.div>

            {/* Selected checkmark */}
            {selectedId === option.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

### Recommendations View with All Features

```tsx
// src/components/recommendations/RecommendationsView.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MovieGrid } from './MovieGrid';
import { MomentSummary } from './MomentSummary';
import { RefinementBar } from './RefinementBar';
import { ValidationPrompt } from '../feedback/ValidationPrompt';
import { FeedbackDrawer } from '../feedback/FeedbackDrawer';
import { useRecommendationStore } from '@/store/recommendations';
import confetti from 'canvas-confetti';

export function RecommendationsView() {
  const {
    recommendations,
    moment,
    validation,
    quickAdjust,
    refineRecommendations,
    validateMoment,
    trackInteraction
  } = useRecommendationStore();

  const [showMoment, setShowMoment] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [movieReactions, setMovieReactions] = useState<Record<string, string>>({});

  useEffect(() => {
    // Show validation after moment summary
    if (!showMoment) {
      setTimeout(() => setShowValidation(true), 1000);
    }
  }, [showMoment]);

  useEffect(() => {
    // Celebration animation on first load
    if (recommendations.length > 0 && showMoment) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);
    }
  }, [recommendations]);

  const handleMovieReaction = (movieId: string, reaction: string) => {
    setMovieReactions(prev => ({ ...prev, [movieId]: reaction }));
    trackInteraction(movieId, reaction);
  };

  const handleRefine = () => {
    const feedback = Object.entries(movieReactions).map(([movieId, reaction]) => ({
      movieId,
      reaction: reaction as any
    }));
    refineRecommendations(feedback);
  };

  const handleValidation = (response: any) => {
    validateMoment(response);
    setShowValidation(false);
    
    if (response.score < 3) {
      setShowFeedback(true);
    }
  };

  return (
    <div className="relative">
      {/* Moment Summary Modal */}
      <AnimatePresence>
        {showMoment && moment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full"
            >
              <MomentSummary
                moment={moment}
                onDismiss={() => setShowMoment(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Prompt */}
      <AnimatePresence>
        {showValidation && (
          <ValidationPrompt
            validation={validation}
            onFeedback={handleValidation}
            onDismiss={() => setShowValidation(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Quick Refinement Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <RefinementBar onAdjust={quickAdjust} />
        </motion.div>

        {/* Movie Grid */}
        <MovieGrid
          recommendations={recommendations}
          onMovieReaction={handleMovieReaction}
          movieReactions={movieReactions}
        />

        {/* Refine Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <button
            onClick={handleRefine}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            Get More Recommendations
          </button>
        </motion.div>
      </div>

      {/* Feedback Drawer */}
      <FeedbackDrawer
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={(feedback) => {
          refineRecommendations(feedback);
          setShowFeedback(false);
        }}
      />
    </div>
  );
}
```

---

## 🪝 Custom Hooks

### useQuestionTimer Hook

```tsx
// src/hooks/useQuestionTimer.tsx
import { useState, useRef } from 'react';

export function useQuestionTimer() {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    const now = Date.now();
    setStartTime(now);
    
    intervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - now);
    }, 100);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getElapsedTime = () => {
    return elapsedTime;
  };

  const reset = () => {
    stopTimer();
    setStartTime(null);
    setElapsedTime(0);
  };

  return {
    startTimer,
    stopTimer,
    getElapsedTime,
    reset,
    elapsedTime
  };
}
```

### useAnimatedText Hook

```tsx
// src/hooks/useAnimatedText.tsx
import { useState, useEffect } from 'react';

export function useAnimatedText(texts: string[], interval = 2000) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState(texts[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [texts, interval]);

  useEffect(() => {
    setDisplayText(texts[currentIndex]);
  }, [currentIndex, texts]);

  return { displayText, isAnimating };
}
```

### useLocalStorage Hook

```tsx
// src/hooks/useLocalStorage.tsx
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue] as const;
}
```

---

## 🎨 UI Components

### Animated Progress Bar

```tsx
// src/components/ui/ProgressBar.tsx
import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  color?: string;
  height?: string;
}

export function ProgressBar({ 
  current, 
  total, 
  showPercentage = true,
  color = 'from-purple-500 to-pink-500',
  height = 'h-2'
}: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`bg-gradient-to-r ${color} ${height} rounded-full`}
        />
      </div>
    </div>
  );
}
```

### Animated Button

```tsx
// src/components/ui/AnimatedButton.tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false
}: AnimatedButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    secondary: 'bg-white text-purple-600 border-2 border-purple-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-full font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
```

---

## 🎭 Feedback Components

### Validation Prompt

```tsx
// src/components/feedback/ValidationPrompt.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ValidationPromptProps {
  validation: {
    message: {
      type: string;
      title: string;
      subtitle: string;
      emoji: string;
    };
    overallScore: number;
  };
  onFeedback: (response: any) => void;
  onDismiss: () => void;
}

export function ValidationPrompt({ validation, onFeedback, onDismiss }: ValidationPromptProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'perfect', emoji: '🎯', text: 'Nailed it!', score: 5 },
    { id: 'good', emoji: '👍', text: 'Pretty good', score: 4 },
    { id: 'okay', emoji: '🤔', text: 'Not quite', score: 2 },
    { id: 'miss', emoji: '😅', text: 'Way off', score: 1 }
  ];

  const handleSelect = (option: any) => {
    setSelected(option.id);
    setTimeout(() => {
      onFeedback({ id: option.id, score: option.score });
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-8 right-8 bg-white rounded-2xl shadow-2xl p-6 max-w-sm z-40"
    >
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{validation.message.emoji}</div>
        <h3 className="font-bold text-lg">{validation.message.title}</h3>
        <p className="text-sm text-gray-600">{validation.message.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(option)}
            className={`
              p-3 rounded-xl border-2 transition-all
              ${selected === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
              }
            `}
          >
            <div className="text-2xl mb-1">{option.emoji}</div>
            <div className="text-xs font-medium">{option.text}</div>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onDismiss}
        className="mt-4 text-xs text-gray-500 hover:text-gray-700 w-full"
      >
        Skip feedback
      </button>
    </motion.div>
  );
}
```

---

## 📱 PWA Configuration

```javascript
// public/manifest.json
{
  "name": "WhatNext - Movie Recommendations",
  "short_name": "WhatNext",
  "description": "AI-powered movie recommendations that understand your mood",
  "theme_color": "#a855f7",
  "background_color": "#faf5ff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🚀 Complete Package.json

```json
{
  "name": "whatnext-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.16.16",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.48.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "recharts": "^2.10.3",
    "lucide-react": "^0.303.0",
    "canvas-confetti": "^1.9.2",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@types/canvas-confetti": "^1.6.4",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.0.4",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@vitejs/plugin-react": "^4.2.1"
  }
}
```

This complete component library provides production-ready React components that fully utilize all features of your enhanced movie-recommendations worker!