import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MovieGrid } from './MovieGrid';
import { MomentSummary } from './MomentSummary';
import { RefinementBar } from './RefinementBar';
import { useRecommendationStore } from '@/store/recommendations';
import confetti from 'canvas-confetti';

export function RecommendationsView() {
  const {
    recommendations,
    moment,
    quickAdjust,
    refineRecommendations,
    trackInteraction
  } = useRecommendationStore();

  const [showMoment, setShowMoment] = useState(true);
  const [movieReactions, setMovieReactions] = useState<Record<string, string>>({});

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
  }, [recommendations, showMoment]);

  const handleMovieReaction = (movieId: string, reaction: string) => {
    setMovieReactions(prev => ({ ...prev, [movieId]: reaction }));
    trackInteraction(movieId, reaction);
  };

  const handleRefine = () => {
    const feedback = Object.entries(movieReactions).map(([movieId, reaction]) => ({
      movieId,
      reaction: reaction as 'like' | 'dislike' | 'neutral'
    }));
    refineRecommendations(feedback);
  };

  return (
    <div className="relative min-h-screen">
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Your Perfect Matches
          </h1>
          <p className="text-gray-600">
            Based on your mood and preferences
          </p>
        </motion.div>

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
          className="text-center pb-12"
        >
          <button
            onClick={handleRefine}
            className="px-8 py-4 gradient-purple-pink text-white rounded-full font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            Get More Recommendations
          </button>
        </motion.div>
      </div>
    </div>
  );
}