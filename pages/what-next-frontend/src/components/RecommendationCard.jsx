import { motion } from 'framer-motion';
import { useState } from 'react';

const RecommendationCard = ({ recommendation, index, onFeedback }) => {
  const [imageError, setImageError] = useState(false);
  const [showFullCast, setShowFullCast] = useState(false);
  
  // Extract all data - backend now sends enriched data directly
  const posterUrl = recommendation.poster_url;
  const backdropUrl = recommendation.backdrop_url;
  const rating = Number(recommendation.vote_average || recommendation.rating || 0);
  const voteCount = recommendation.vote_count;
  const year = recommendation.release_date?.split('-')[0] || recommendation.year;
  const overview = recommendation.overview || recommendation.description || recommendation.reason;
  const genres = recommendation.genres || [];
  const runtime = recommendation.runtime;
  const tagline = recommendation.tagline;
  const cast = recommendation.cast || [];
  const director = recommendation.director;
  const streaming = recommendation.streaming;
  const trailerUrl = recommendation.trailer_url;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
    >
      <div className="flex flex-col md:flex-row">
        {/* Poster Section */}
        {posterUrl && !imageError ? (
          <div className="md:w-1/3 lg:w-1/4">
            <img 
              src={posterUrl}
              alt={recommendation.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="md:w-1/3 lg:w-1/4 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center p-8">
            <div className="text-white text-center">
              <div className="text-6xl mb-2">🎬</div>
              <p className="text-sm opacity-75">No poster available</p>
            </div>
          </div>
        )}
        
        {/* Content Section */}
        <div className="flex-1 p-6">
          {/* Title and Year */}
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {recommendation.title}
            </h3>
            {tagline && (
              <p className="text-sm italic text-gray-600 mb-2">"{tagline}"</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {year && <span className="font-medium">{year}</span>}
              {rating > 0 && (
                <span className="flex items-center">
                  ⭐ {rating.toFixed(1)}/10
                  {voteCount && <span className="ml-1 text-xs">({voteCount.toLocaleString()} votes)</span>}
                </span>
              )}
              {runtime && (
                <span>⏱️ {runtime} min</span>
              )}
              {recommendation.rating && (
                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium">
                  {recommendation.rating}
                </span>
              )}
            </div>
          </div>
          
          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {genres.map((genre, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {genre}
                </span>
              ))}
            </div>
          )}
          
          {/* Director */}
          {director && (
            <div className="text-sm text-gray-600 mb-3">
              <span className="font-semibold">Director:</span> {director}
            </div>
          )}
          
          {/* Description */}
          <p className="text-gray-700 mb-4 line-clamp-3">
            {overview}
          </p>
          
          {/* Cast */}
          {cast.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600">Cast:</span>
                {cast.length > 3 && (
                  <button
                    onClick={() => setShowFullCast(!showFullCast)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {showFullCast ? 'Show less' : `Show all ${cast.length}`}
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {(showFullCast ? cast : cast.slice(0, 3)).map((actor, i) => (
                  <span key={i}>
                    {actor.name}
                    {actor.character && <span className="text-gray-500"> as {actor.character}</span>}
                    {i < (showFullCast ? cast.length : Math.min(3, cast.length)) - 1 && ', '}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Match Reason */}
          {recommendation.reason && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Why this matches:</span> {recommendation.reason}
              </p>
            </div>
          )}
          
          {/* Streaming Availability */}
          {streaming?.available_on && streaming.available_on.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Watch on:</p>
              <div className="flex flex-wrap gap-2">
                {streaming.available_on.map((provider, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Where to Watch fallback */}
          {!streaming?.available_on && recommendation.where_to_watch && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Available on:</span> {recommendation.where_to_watch}
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {trailerUrl && (
              <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                ▶️ Watch Trailer
              </a>
            )}
            
            {streaming?.tmdb_link && (
              <a
                href={streaming.tmdb_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📺 Where to Watch
              </a>
            )}
            
            {recommendation.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${recommendation.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                🎬 IMDb
              </a>
            )}
            
            {/* Feedback Buttons */}
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => onFeedback(index, 'liked')}
                className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                title="Good recommendation"
              >
                👍
              </button>
              <button
                onClick={() => onFeedback(index, 'disliked')}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                title="Not for me"
              >
                👎
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RecommendationCard;