import { motion, AnimatePresence } from 'framer-motion';
import { MovieCard } from './MovieCard';
import { Movie } from '@/services/api/client';

interface MovieGridProps {
  recommendations: Movie[];
  onMovieReaction: (movieId: string, reaction: string) => void;
  movieReactions: Record<string, string>;
}

export function MovieGrid({ 
  recommendations, 
  onMovieReaction,
  movieReactions 
}: MovieGridProps) {
  return (
    <motion.div
      layout
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <AnimatePresence>
        {recommendations.map((movie, index) => (
          <MovieCard
            key={movie.movieId}
            movie={movie}
            index={index}
            reaction={movieReactions[movie.movieId]}
            onReaction={(reaction) => onMovieReaction(movie.movieId, reaction)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}