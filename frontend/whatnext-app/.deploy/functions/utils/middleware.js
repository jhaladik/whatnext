// src/utils/middleware.js

/**
 * CORS headers
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
  'Access-Control-Max-Age': '86400'
};

/**
 * Security headers
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'"
};

/**
 * CORS middleware
 */
export function corsMiddleware(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return null;
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Request timing middleware
 */
export function timingMiddleware(request) {
  request.startTime = Date.now();
  
  request.mark = function(label) {
    const elapsed = Date.now() - request.startTime;
    console.log(`[Timing] ${label}: ${elapsed}ms`);
  };
  
  request.getElapsed = function() {
    return Date.now() - request.startTime;
  };
}

/**
 * Logging middleware factory
 */
export function createLoggingMiddleware(env) {
  const logLevel = env.LOG_LEVEL || 'info';
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(logLevel);
  
  return function loggingMiddleware(request) {
    if (currentLevel <= levels.indexOf('info')) {
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
    }
    
    // Add logging methods to request
    request.log = {
      debug: (...args) => {
        if (currentLevel <= levels.indexOf('debug')) {
          console.log('[DEBUG]', ...args);
        }
      },
      info: (...args) => {
        if (currentLevel <= levels.indexOf('info')) {
          console.log('[INFO]', ...args);
        }
      },
      warn: (...args) => {
        if (currentLevel <= levels.indexOf('warn')) {
          console.warn('[WARN]', ...args);
        }
      },
      error: (...args) => {
        if (currentLevel <= levels.indexOf('error')) {
          console.error('[ERROR]', ...args);
        }
      }
    };
  };
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(request) {
  const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
  request.requestId = requestId;
  return requestId;
}

/**
 * Response wrapper with standard headers
 */
export function wrapResponse(request, response, env) {
  const newHeaders = new Headers(response.headers);
  
  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  // Add request ID if available
  if (request.requestId) {
    newHeaders.set('X-Request-Id', request.requestId);
  }
  
  // Add timing header if available
  if (request.startTime) {
    const elapsed = Date.now() - request.startTime;
    newHeaders.set('X-Response-Time', `${elapsed}ms`);
  }
  
  // Add cache headers for appropriate responses
  if (request.method === 'GET' && response.status === 200) {
    const cacheTime = env.CACHE_TTL || 300; // 5 minutes default
    newHeaders.set('Cache-Control', `public, max-age=${cacheTime}`);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Compression middleware
 */
export function compressionMiddleware(response, request) {
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';
  
  // Check if client accepts gzip
  if (acceptEncoding.includes('gzip')) {
    // Note: Cloudflare Workers automatically handles compression
    // This is just to set the header if needed
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Content-Encoding', 'gzip');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  return response;
}

/**
 * Rate limit headers
 */
export function addRateLimitHeaders(response, rateLimitInfo) {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
  
  if (rateLimitInfo.retryAfter) {
    newHeaders.set('Retry-After', rateLimitInfo.retryAfter.toString());
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * JSON response helper
 */
export function jsonResponse(data, options = {}) {
  const { status = 200, headers = {} } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...headers
    }
  });
}

/**
 * Error response helper
 */
export function errorResponse(message, code = 'ERROR', status = 500) {
  return jsonResponse({
    error: message,
    code
  }, { status });
}

/**
 * Success response helper
 */
export function successResponse(data, message = 'Success') {
  return jsonResponse({
    success: true,
    message,
    data
  });
}

/**
 * Cache key generator
 */
export function generateCacheKey(request, prefix = 'cache') {
  const url = new URL(request.url);
  const params = Array.from(url.searchParams.entries()).sort();
  const paramsString = params.map(([k, v]) => `${k}=${v}`).join('&');
  
  return `${prefix}:${url.pathname}:${paramsString}`;
}

/**
 * Cache middleware
 */
export async function cacheMiddleware(request, env, handler) {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return handler(request, env);
  }
  
  const cacheKey = generateCacheKey(request);
  const cache = env.CACHE || caches.default;
  
  // Try to get from cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('Cache hit:', cacheKey);
    return cachedResponse;
  }
  
  // Get fresh response
  const response = await handler(request, env);
  
  // Cache successful responses
  if (response.status === 200) {
    const cacheTime = env.CACHE_TTL || 300;
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', `public, max-age=${cacheTime}`);
    
    const responseToCache = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
    
    // Store in cache
    await cache.put(request, responseToCache.clone());
  }
  
  return response;
}