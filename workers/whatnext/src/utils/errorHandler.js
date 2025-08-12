// src/utils/errorHandler.js

/**
 * Centralized error handling utilities
 */

/**
 * Custom error classes for different error types
 */
export class AppError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message, details) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message, retryAfter) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  constructor(message, service, originalError) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 503, { service, originalError: originalError?.message });
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session has expired') {
    super(message, 'SESSION_EXPIRED', 410);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Global error handler for the application
 */
export function createErrorHandler(env) {
  return async (error, request) => {
    console.error('Error caught:', error);
    
    // Log error to database for analytics
    await logError(env, error, request);
    
    // Handle known error types
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    
    // Handle Cloudflare-specific errors
    if (error.name === 'TypeError' && error.message.includes('KV')) {
      return createErrorResponse(
        new ExternalServiceError('Storage service error', 'KV', error)
      );
    }
    
    if (error.name === 'D1Error') {
      return createErrorResponse(
        new ExternalServiceError('Database service error', 'D1', error)
      );
    }
    
    // Handle network errors
    if (error.name === 'FetchError' || error.name === 'NetworkError') {
      return createErrorResponse(
        new ExternalServiceError('Network error', 'Network', error)
      );
    }
    
    // Default error response
    return createErrorResponse(
      new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500)
    );
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Error-Code': error.code || 'UNKNOWN_ERROR'
  };
  
  // Add retry-after header for rate limit errors
  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = error.retryAfter.toString();
  }
  
  // Don't expose internal errors in production
  const isProduction = process.env.ENVIRONMENT === 'production';
  const responseBody = error.toJSON ? error.toJSON() : {
    error: isProduction ? 'An error occurred' : error.message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(responseBody), {
    status: error.statusCode || 500,
    headers
  });
}

/**
 * Log error to database for monitoring
 */
async function logError(env, error, request) {
  try {
    const errorData = {
      timestamp: Date.now(),
      error_type: error.name || 'Unknown',
      error_code: error.code || 'UNKNOWN',
      error_message: error.message,
      stack_trace: error.stack,
      url: request?.url,
      method: request?.method,
      user_agent: request?.headers?.get('user-agent'),
      session_id: extractSessionId(request)
    };
    
    await env.DB?.prepare(
      `INSERT INTO system_metrics (metric_name, metric_value, timestamp, metadata) 
       VALUES ('error', 1, ?, ?)`
    ).bind(
      errorData.timestamp,
      JSON.stringify(errorData)
    ).run();
    
  } catch (logError) {
    // Don't throw if logging fails
    console.error('Failed to log error:', logError);
  }
}

/**
 * Extract session ID from request
 */
function extractSessionId(request) {
  if (!request?.url) return null;
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  
  // Check if it looks like a UUID
  if (lastPart?.match(/^[a-f0-9-]{36}$/)) {
    return lastPart;
  }
  
  return null;
}

/**
 * Wrap async route handlers with error handling
 */
export function asyncHandler(handler) {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      const errorHandler = createErrorHandler(env);
      return errorHandler(error, request);
    }
  };
}

/**
 * Create a timeout wrapper for operations
 */
export function withTimeout(operation, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    operation,
    new Promise((_, reject) => {
      setTimeout(() => reject(new AppError(errorMessage, 'TIMEOUT', 504)), timeoutMs);
    })
  ]);
}

/**
 * Retry logic for flaky operations
 */
export async function withRetry(
  operation,
  maxRetries = 3,
  backoffMs = 1000,
  shouldRetry = (error) => true
) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying operation (attempt ${i + 2}/${maxRetries}) after ${delay}ms`);
    }
  }
  
  throw lastError;
}

/**
 * Create a fallback wrapper for operations
 */
export function withFallback(primaryOperation, fallbackOperation) {
  return async (...args) => {
    try {
      return await primaryOperation(...args);
    } catch (error) {
      console.error('Primary operation failed, using fallback:', error);
      return await fallbackOperation(...args);
    }
  };
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(env) {
  const required = [
    'DB',
    'QUESTIONS',
    'USER_SESSIONS',
    'RECOMMENDATION_CACHE',
    'CLAUDE_API_KEY'
  ];
  
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'CONFIGURATION_ERROR',
      500
    );
  }
}

/**
 * Create health check response
 */
export function createHealthResponse(env, details = false) {
  const health = {
    status: 'healthy',
    service: 'what-next-recommendation-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    // Add detailed health information
    health.checks = {
      database: checkDatabase(env),
      kvStorage: checkKVStorage(env),
      claudeApi: checkClaudeAPI(env)
    };
  }
  
  return Response.json(health);
}

async function checkDatabase(env) {
  try {
    await env.DB.prepare('SELECT 1').first();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkKVStorage(env) {
  try {
    await env.USER_SESSIONS.get('health_check');
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkClaudeAPI(env) {
  // Don't actually call Claude API in health check
  // Just verify the key exists
  return {
    status: env.CLAUDE_API_KEY ? 'configured' : 'not_configured'
  };
}