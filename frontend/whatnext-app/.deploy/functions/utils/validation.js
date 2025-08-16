// src/utils/validation.js

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate start request
 */
export function validateStartRequest(data) {
  const errors = [];
  
  if (data.domain && !['movies', 'tv-series', 'documentaries', 'kids'].includes(data.domain)) {
    errors.push('Invalid domain specified');
  }
  
  if (data.context && typeof data.context !== 'object') {
    errors.push('Context must be an object');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate answer request
 */
export function validateAnswerRequest(data) {
  const errors = [];
  
  if (!data.questionId) {
    errors.push('Question ID is required');
  }
  
  if (!data.answer) {
    errors.push('Answer is required');
  }
  
  if (data.responseTime && typeof data.responseTime !== 'number') {
    errors.push('Response time must be a number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate refine request
 */
export function validateRefineRequest(data) {
  const errors = [];
  
  if (!data.feedback || !Array.isArray(data.feedback)) {
    errors.push('Feedback must be an array');
  } else {
    data.feedback.forEach((item, index) => {
      if (!item.movieId) {
        errors.push(`Feedback item ${index} missing movieId`);
      }
      if (!item.reaction || !['like', 'dislike', 'neutral'].includes(item.reaction)) {
        errors.push(`Feedback item ${index} has invalid reaction`);
      }
    });
  }
  
  if (!data.action || !['more_like_this', 'try_different', 'adjust_mood'].includes(data.action)) {
    errors.push('Invalid refinement action');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(env) {
  const errors = [];
  const warnings = [];
  
  // Required configurations
  if (!env.DB) {
    errors.push('Database binding (DB) is missing');
  }
  
  if (!env.USER_SESSIONS) {
    errors.push('User sessions KV namespace is missing');
  }
  
  // Optional but recommended
  if (!env.OPENAI_API_KEY && !env.ENABLE_CLAUDE_FALLBACK) {
    warnings.push('No OpenAI API key and Claude fallback disabled - using weighted vectors only');
  }
  
  if (!env.TMDB_API_KEY) {
    warnings.push('TMDB API key not configured - movie enrichment will be limited');
  }
  
  if (!env.VECTORIZE_WORKER_URL) {
    warnings.push('Vectorize worker URL not configured - vector search disabled');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove any HTML tags
  return input
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate movie filters
 */
export function validateMovieFilters(filters) {
  const validated = {};
  
  // Year validation
  if (filters.minYear) {
    const year = parseInt(filters.minYear);
    if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear()) {
      validated.minYear = year;
    }
  }
  
  if (filters.maxYear) {
    const year = parseInt(filters.maxYear);
    if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear()) {
      validated.maxYear = year;
    }
  }
  
  // Rating validation
  if (filters.minRating) {
    const rating = parseFloat(filters.minRating);
    if (!isNaN(rating) && rating >= 0 && rating <= 10) {
      validated.minRating = rating;
    }
  }
  
  // Runtime validation
  if (filters.minRuntime) {
    const runtime = parseInt(filters.minRuntime);
    if (!isNaN(runtime) && runtime >= 0 && runtime <= 500) {
      validated.minRuntime = runtime;
    }
  }
  
  if (filters.maxRuntime) {
    const runtime = parseInt(filters.maxRuntime);
    if (!isNaN(runtime) && runtime >= 0 && runtime <= 500) {
      validated.maxRuntime = runtime;
    }
  }
  
  // Genre validation
  if (filters.includeGenres && Array.isArray(filters.includeGenres)) {
    validated.includeGenres = filters.includeGenres.slice(0, 10); // Limit to 10 genres
  }
  
  if (filters.excludeGenres && Array.isArray(filters.excludeGenres)) {
    validated.excludeGenres = filters.excludeGenres.slice(0, 10);
  }
  
  return validated;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params) {
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  
  return {
    page: Math.max(1, Math.min(page, 100)),
    limit: Math.max(1, Math.min(limit, 100)),
    offset: (page - 1) * limit
  };
}