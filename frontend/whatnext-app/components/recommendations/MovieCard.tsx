import { motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, Eye, X, Info, Star, Sparkles, Play, Users, Clock, Calendar, DollarSign, TrendingUp, RotateCw } from 'lucide-react';
import { Movie } from '@/services/api/client';

interface MovieCardProps {
  movie: Movie;
  index: number;
  reaction?: string;
  onReaction: (reaction: string) => void;
}

export function MovieCard({ movie, index, reaction, onReaction }: MovieCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleReaction = (type: string) => {
    onReaction(type);
  };

  const formatMoney = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
      style={{ perspective: '1000px' }}
    >
      {/* Surprise Badge */}
      {movie.isSurprise && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className="absolute -top-2 -right-2 z-20"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            Surprise Pick
          </div>
        </motion.div>
      )}

      {/* Flip Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsFlipped(!isFlipped)}
        className="absolute top-2 right-2 z-20 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 transition-colors"
      >
        <RotateCw className={`w-4 h-4 text-white ${isFlipped ? 'rotate-180' : ''} transition-transform`} />
      </motion.button>

      {/* Card Container */}
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of Card */}
        <div 
          className={`w-full h-full ${isFlipped ? 'invisible' : ''}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
            {/* Placeholder gradient if no poster */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              {!movie.poster && (
                <div className="text-white text-center p-4">
                  <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                  </svg>
                  <p className="text-sm font-medium">{movie.title}</p>
                </div>
              )}
            </div>
            
            {movie.poster && (
              <img
                src={movie.poster}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Failed to load poster for ${movie.title}:`, movie.poster);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            
            {/* Overlay on Hover */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col justify-end z-10"
            >
              {/* Quick Actions */}
              <div className="flex gap-2 mb-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleReaction('love'); }}
                  className={`p-2 rounded-full transition-colors ${
                    reaction === 'love' 
                      ? 'bg-red-500' 
                      : 'bg-white/20 backdrop-blur hover:bg-white/30'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${reaction === 'love' ? 'text-white fill-white' : 'text-white'}`} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleReaction('seen'); }}
                  className={`p-2 rounded-full transition-colors ${
                    reaction === 'seen' 
                      ? 'bg-blue-500' 
                      : 'bg-white/20 backdrop-blur hover:bg-white/30'
                  }`}
                >
                  <Eye className={`w-5 h-5 ${reaction === 'seen' ? 'text-white' : 'text-white'}`} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleReaction('not_interested'); }}
                  className={`p-2 rounded-full transition-colors ${
                    reaction === 'not_interested' 
                      ? 'bg-gray-500' 
                      : 'bg-white/20 backdrop-blur hover:bg-white/30'
                  }`}
                >
                  <X className={`w-5 h-5 ${reaction === 'not_interested' ? 'text-white' : 'text-white'}`} />
                </motion.button>
                {movie.trailer_key && (
                  <motion.a
                    href={`https://youtube.com/watch?v=${movie.trailer_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-red-600 rounded-full ml-auto hover:bg-red-700"
                  >
                    <Play className="w-5 h-5 text-white" />
                  </motion.a>
                )}
              </div>

              {/* Movie Info */}
              <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{movie.title}</h3>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <span>{movie.year}</span>
                <span>•</span>
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
                </div>
                {movie.runtime && (
                  <>
                    <span>•</span>
                    <span>{movie.runtime} min</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {movie.genres?.slice(0, 3).map(genre => (
                  <span key={genre} className="px-2 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white">
                    {genre}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Movie Title (always visible) */}
          <div className="mt-3 px-1 relative z-0">
            <h4 className="font-semibold text-gray-800 line-clamp-1">{movie.title}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{movie.year}</span>
              <span>•</span>
              <div className="flex items-center">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of Card - Detailed Info */}
        <div 
          className={`absolute inset-0 w-full h-full ${!isFlipped ? 'invisible' : ''}`}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="mb-3">
                <h3 className="font-bold text-lg mb-1">{movie.title}</h3>
                {movie.tagline && (
                  <p className="text-sm text-gray-300 italic">"{movie.tagline}"</p>
                )}
              </div>

              {/* Overview */}
              <div className="mb-3 flex-shrink">
                <p className="text-xs text-gray-300 line-clamp-4">{movie.overview}</p>
              </div>

              {/* Director & Cast */}
              {(movie.director || movie.cast) && (
                <div className="mb-3">
                  {movie.director && (
                    <p className="text-xs mb-1">
                      <span className="text-gray-400">Director:</span> {movie.director}
                    </p>
                  )}
                  {movie.cast && movie.cast.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cast:</p>
                      <div className="flex flex-wrap gap-1">
                        {movie.cast.slice(0, 3).map((actor, i) => (
                          <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded">
                            {actor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                {movie.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{movie.runtime} min</span>
                  </div>
                )}
                {movie.voteCount && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span>{movie.voteCount.toLocaleString()} votes</span>
                  </div>
                )}
                {movie.releaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>{new Date(movie.releaseDate).getFullYear()}</span>
                  </div>
                )}
                {movie.popularity && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-gray-400" />
                    <span>{movie.popularity.toFixed(0)} popularity</span>
                  </div>
                )}
              </div>

              {/* Budget & Revenue */}
              {(movie.budget || movie.revenue) && (
                <div className="mb-3 text-xs">
                  {movie.budget && movie.budget > 0 && (
                    <p className="mb-1">
                      <span className="text-gray-400">Budget:</span> {formatMoney(movie.budget)}
                    </p>
                  )}
                  {movie.revenue && movie.revenue > 0 && (
                    <p>
                      <span className="text-gray-400">Revenue:</span> {formatMoney(movie.revenue)}
                    </p>
                  )}
                </div>
              )}

              {/* Streaming Platforms */}
              {movie.streaming_providers && movie.streaming_providers.length > 0 && (
                <div className="mt-auto">
                  <p className="text-xs text-gray-400 mb-1">Available on:</p>
                  <div className="flex flex-wrap gap-1">
                    {movie.streaming_providers.slice(0, 4).map((provider: any, i: number) => (
                      <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded">
                        {typeof provider === 'string' ? provider : provider.provider_name || 'Unknown'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto pt-3">
                {movie.trailer_key && (
                  <a
                    href={`https://youtube.com/watch?v=${movie.trailer_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-red-600 hover:bg-red-700 py-2 px-3 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Trailer
                  </a>
                )}
                <button
                  onClick={() => setIsFlipped(false)}
                  className="flex-1 bg-white/20 hover:bg-white/30 py-2 px-3 rounded-lg text-xs font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Surprise Reason Tooltip */}
      {movie.isSurprise && movie.surpriseReason && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="mt-2 pointer-events-none"
        >
          <div className="bg-black/90 text-white text-xs p-2 rounded-lg">
            💡 {movie.surpriseReason}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}