import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CompactFeedbackButtons } from './FeedbackButtons';

const ModernRecommendationCard = ({ recommendation, index, onFeedback, feedbackState }) => {
  const [localFeedback, setLocalFeedback] = useState(feedbackState || null);
  const [imageError, setImageError] = useState(false);
  const [showFullCast, setShowFullCast] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Reset feedback state when recommendation changes
  useEffect(() => {
    setLocalFeedback(feedbackState || null);
    setImageError(false);
    setShowFullCast(false);
    setIsExpanded(false);
  }, [recommendation.title, feedbackState]);
  
  const handleFeedback = (title, type) => {
    setLocalFeedback(type);
    onFeedback(title, type);
  };
  
  // Extract all the details
  const posterUrl = recommendation.poster_url;
  const rating = recommendation.vote_average || recommendation.rating;
  const voteCount = recommendation.vote_count;
  const year = recommendation.release_date ? new Date(recommendation.release_date).getFullYear() : recommendation.year;
  const runtime = recommendation.runtime;
  const director = recommendation.director || (recommendation.crew && recommendation.crew.find(c => c.job === 'Director')?.name);
  const cast = recommendation.cast || [];
  const genres = recommendation.genres || [];
  const overview = recommendation.overview || recommendation.description || '';
  const tagline = recommendation.tagline;
  const streaming = recommendation.streaming;
  const trailerUrl = recommendation.trailer_url || recommendation.trailerUrl;
  const imdbId = recommendation.imdb_id;
  const tmdbId = recommendation.tmdb_id || recommendation.id;
  
  // Series-specific fields
  const seasons = recommendation.number_of_seasons || recommendation.seasons;
  const episodes = recommendation.number_of_episodes || recommendation.episodes;
  const episodeLength = recommendation.episode_run_time || recommendation.episode_length;
  const status = recommendation.status;
  const networks = recommendation.networks;
  
  // Documentary-specific fields
  const topic = recommendation.topic;
  const style = recommendation.style;
  
  // Determine content type
  const contentType = recommendation.type || 'movie';
  const isSeries = contentType === 'series';
  const isDocumentary = contentType === 'documentary';
  
  // Format rating to always show one decimal
  const formatRating = (rating) => {
    if (rating === undefined || rating === null) return 'N/A';
    const numRating = parseFloat(rating);
    return isNaN(numRating) ? 'N/A' : numRating.toFixed(1);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      {/* Card glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Main card */}
      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Poster Section */}
          <div className="md:w-48 h-72 md:h-auto relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
            {posterUrl && !imageError ? (
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                src={posterUrl}
                alt={recommendation.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl opacity-50">
                  {isSeries ? '📺' : isDocumentary ? '🎥' : '🎬'}
                </span>
              </div>
            )}
            
            {/* Rating badge */}
            {rating && rating > 0 && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md rounded-lg px-3 py-1 border border-yellow-500/50">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-white font-semibold">{formatRating(rating)}</span>
                </div>
              </div>
            )}
            
            {/* Rank badge */}
            <div className="absolute top-4 left-4 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
              #{index + 1}
            </div>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 p-6">
            {/* Title and Tagline */}
            <div className="mb-3">
              <h3 className="text-2xl font-bold text-white mb-1">
                {recommendation.title}
              </h3>
              {tagline && (
                <p className="text-sm italic text-purple-300 mb-2">"{tagline}"</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                {year && <span className="font-medium text-white">{year}</span>}
                {rating && rating > 0 && (
                  <span className="flex items-center text-yellow-400">
                    ⭐ {formatRating(rating)}/10
                    {voteCount && <span className="ml-1 text-xs text-gray-500">({voteCount.toLocaleString()} votes)</span>}
                  </span>
                )}
                
                {/* Movie runtime */}
                {!isSeries && runtime && (
                  <span className="flex items-center gap-1">
                    <span className="text-purple-400">⏱️</span> 
                    {typeof runtime === 'number' ? `${runtime} min` : 
                     typeof runtime === 'string' && runtime.includes('min') ? runtime :
                     typeof runtime === 'string' && runtime.includes('episode') ? runtime :
                     `${runtime} min`}
                  </span>
                )}
                
                {/* Series info */}
                {isSeries && (
                  <>
                    {seasons && (
                      <span className="flex items-center gap-1">
                        <span className="text-blue-400">📺</span> {seasons} season{seasons > 1 ? 's' : ''}
                      </span>
                    )}
                    {episodes && (
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">📝</span> {episodes} episodes
                      </span>
                    )}
                    {episodeLength && (
                      <span className="flex items-center gap-1">
                        <span className="text-purple-400">⏱️</span> {episodeLength}
                      </span>
                    )}
                    {status && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        status === 'Completed' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      }`}>
                        {status}
                      </span>
                    )}
                  </>
                )}
                
                {/* Documentary info */}
                {isDocumentary && topic && (
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs border border-cyan-500/30">
                    {topic}
                  </span>
                )}
                
                {recommendation.certification && (
                  <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-xs font-medium border border-white/20">
                    {recommendation.certification}
                  </span>
                )}
              </div>
            </div>
            
            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {genres.map((genre, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs border border-purple-500/30">
                    {typeof genre === 'string' ? genre : genre.name}
                  </span>
                ))}
              </div>
            )}
            
            {/* Director/Creator */}
            {(director || recommendation.creator) && (
              <div className="text-sm text-gray-300 mb-3">
                <span className="font-semibold text-purple-400">
                  {isSeries ? 'Creator' : 'Director'}:
                </span> {recommendation.creator || director}
              </div>
            )}
            
            {/* Documentary Style */}
            {isDocumentary && style && (
              <div className="text-sm text-gray-300 mb-3">
                <span className="font-semibold text-cyan-400">Style:</span> {style}
              </div>
            )}
            
            {/* Match reason */}
            {(recommendation.match_reason || recommendation.reason) && (
              <div className="mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                  <span className="text-green-400">🎯</span>
                  <span className="text-xs text-green-300">
                    {recommendation.match_reason || recommendation.reason}
                  </span>
                </div>
              </div>
            )}
            
            {/* Overview */}
            <div className="mb-4">
              <p className={`text-gray-300 text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {overview}
              </p>
              {overview.length > 200 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-purple-400 hover:text-purple-300 text-xs mt-1"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
            
            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-400">Cast:</span>
                  {cast.length > 3 && (
                    <button
                      onClick={() => setShowFullCast(!showFullCast)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {showFullCast ? 'Show less' : `Show all ${cast.length}`}
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-300">
                  {(showFullCast ? cast : cast.slice(0, 3)).map((actor, i) => {
                    const actorName = typeof actor === 'string' ? actor : actor.name;
                    const character = typeof actor === 'object' ? actor.character : null;
                    return (
                      <span key={i}>
                        {actorName}
                        {character && <span className="text-gray-500"> as {character}</span>}
                        {i < (showFullCast ? cast.length : Math.min(3, cast.length)) - 1 && ', '}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Streaming Availability */}
            {((streaming?.available_on && streaming.available_on.length > 0) || recommendation.where_to_watch) && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-purple-400 mb-2">Watch on:</p>
                <div className="flex flex-wrap gap-2">
                  {recommendation.where_to_watch ? (
                    <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm border border-pink-500/30">
                      {recommendation.where_to_watch}
                    </span>
                  ) : (
                    streaming.available_on.map((provider, i) => (
                      <span key={i} className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm border border-pink-500/30">
                        {provider}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {/* Watch Trailer */}
              {trailerUrl && (
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium text-sm hover:from-purple-500 hover:to-purple-400 transition"
                >
                  Watch Trailer ▶️
                </motion.a>
              )}
              
              {/* IMDB Link */}
              {imdbId && (
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={`https://www.imdb.com/title/${imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg font-medium text-sm hover:bg-yellow-500/30 transition border border-yellow-500/30"
                >
                  IMDb
                </motion.a>
              )}
              
              {/* TMDB Link */}
              {tmdbId && (
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={`https://www.themoviedb.org/${isSeries ? 'tv' : 'movie'}/${tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg font-medium text-sm hover:bg-blue-500/30 transition border border-blue-500/30"
                >
                  TMDB
                </motion.a>
              )}
              
              {/* Feedback buttons */}
              <div className="ml-auto">
                <CompactFeedbackButtons 
                  itemTitle={recommendation.title}
                  onFeedback={handleFeedback}
                  initialState={localFeedback}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ModernRecommendationCard;