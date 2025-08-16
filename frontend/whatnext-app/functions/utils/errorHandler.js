// src/utils/errorHandler.js

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session has expired') {
    super(message, 'SESSION_EXPIRED', 401);
    this.name = 'SessionExpiredError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, originalError) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      { service, originalError: originalError.message }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Async handler wrapper for routes
 */
export function asyncHandler(fn) {
  return async (request, env, ctx) => {
    try {
      return await fn(request, env, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Global error handler
 */
export function handleError(error) {
  console.error('Error:', error);
  
  if (error instanceof AppError) {
    return Response.json({
      error: error.message,
      code: error.code,
      details: error.details
    }, {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Handle fetch errors
  if (error.name === 'FetchError' || error.name === 'AbortError') {
    return Response.json({
      error: 'Network error occurred',
      code: 'NETWORK_ERROR'
    }, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Default error response
  return Response.json({
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  }, {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Validate environment and return health check response
 */
export function createHealthResponse(env, detailed = false) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  if (detailed) {
    health.services = {
      database: !!env.DB,
      kvStorage: !!env.USER_SESSIONS,
      vectorSearch: !!env.VECTORIZE_WORKER_URL,
      tmdb: !!env.TMDB_API_KEY,
      openai: !!env.OPENAI_API_KEY,
      claude: !!env.CLAUDE_API_KEY
    };
    
    health.configuration = {
      maxQuestions: env.MAX_QUESTIONS_PER_SESSION || 5,
      sessionTimeout: env.SESSION_TIMEOUT_SECONDS || 3600,
      rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE || 60,
      claudeFallback: env.ENABLE_CLAUDE_FALLBACK || false
    };
  }
  
  return Response.json(health, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context
  };
  
  console.error('Error Log:', JSON.stringify(errorLog));
}

/**
 * Create error response with proper formatting
 */
export function createErrorResponse(error, requestId = null) {
  const response = {
    error: {
      message: error.message || 'An error occurred',
      code: error.code || 'UNKNOWN_ERROR'
    }
  };
  
  if (requestId) {
    response.requestId = requestId;
  }
  
  if (error.details) {
    response.error.details = error.details;
  }
  
  return Response.json(response, {
    status: error.statusCode || 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Request-Id': requestId || crypto.randomUUID()
    }
  });
}

/**
 * Wrap errors from external services
 */
export function wrapExternalError(service, error) {
  if (error.response) {
    // HTTP error from fetch
    return new ExternalServiceError(service, {
      message: `HTTP ${error.response.status}: ${error.response.statusText}`,
      status: error.response.status
    });
  }
  
  return new ExternalServiceError(service, error);
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(env) {
  const errors = [];
  const warnings = [];
  
  // Critical requirements
  if (!env.DB) {
    errors.push('Database binding (DB) is required');
  }
  
  if (!env.USER_SESSIONS) {
    errors.push('User sessions KV namespace is required');
  }
  
  // Warnings for optional but recommended configs
  if (!env.VECTORIZE_WORKER_URL) {
    warnings.push('Vector search disabled - VECTORIZE_WORKER_URL not configured');
  }
  
  if (!env.TMDB_API_KEY) {
    warnings.push('Movie enrichment limited - TMDB_API_KEY not configured');
  }
  
  if (!env.OPENAI_API_KEY && !env.CLAUDE_API_KEY) {
    warnings.push('Using fallback vector generation - no AI API keys configured');
  }
  
  if (warnings.length > 0) {
    console.warn('Environment warnings:', warnings);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}