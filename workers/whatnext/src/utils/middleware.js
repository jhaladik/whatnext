// src/utils/middleware.js

/**
 * Middleware utilities for request/response processing
 */

/**
 * CORS headers configuration
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Security headers for all responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; style-src 'unsafe-inline'",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

/**
 * Apply CORS middleware
 */
export function corsMiddleware(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Request logging middleware
 */
export function createLoggingMiddleware(env) {
  return async (request) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Log request
    console.log({
      type: 'request',
      requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      timestamp: new Date().toISOString()
    });
    
    // Attach request ID for tracking
    request.requestId = requestId;
    request.startTime = startTime;
  };
}

/**
 * Response logging middleware
 */
export function logResponse(request, response) {
  const duration = Date.now() - (request.startTime || Date.now());
  
  console.log({
    type: 'response',
    requestId: request.requestId,
    status: response.status,
    duration,
    timestamp: new Date().toISOString()
  });
  
  // Add request ID to response headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Request-ID', request.requestId);
  newHeaders.set('X-Response-Time', `${duration}ms`);
  
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
  request.timing = {
    start: Date.now(),
    marks: {}
  };
  
  request.mark = (name) => {
    request.timing.marks[name] = Date.now() - request.timing.start;
  };
}

/**
 * Add timing headers to response
 */
export function addTimingHeaders(request, response) {
  if (!request.timing) return response;
  
  const totalTime = Date.now() - request.timing.start;
  const newHeaders = new Headers(response.headers);
  
  // Add Server-Timing header
  const timingEntries = Object.entries(request.timing.marks)
    .map(([name, duration]) => `${name};dur=${duration}`)
    .join(', ');
  
  newHeaders.set('Server-Timing', `${timingEntries}, total;dur=${totalTime}`);
  newHeaders.set('X-Response-Time', `${totalTime}ms`);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Session validation middleware
 */
export function createSessionMiddleware(env) {
  return async (request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];
    
    // Skip for non-session endpoints
    if (!sessionId.match(/^[a-f0-9-]{36}$/)) {
      return;
    }
    
    // Check if session exists
    const sessionData = await env.USER_SESSIONS.get(sessionId);
    
    if (!sessionData) {
      return new Response(JSON.stringify({
        error: 'Session not found or expired',
        code: 'SESSION_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Attach session to request
    request.session = JSON.parse(sessionData);
    request.sessionId = sessionId;
  };
}

/**
 * Analytics tracking middleware
 */
export function createAnalyticsMiddleware(env) {
  return async (request, response) => {
    if (!env.ENABLE_ANALYTICS) return;
    
    try {
      const url = new URL(request.url);
      
      await env.DB.prepare(
        `INSERT INTO system_metrics (metric_name, metric_value, timestamp, metadata) 
         VALUES (?, ?, ?, ?)`
      ).bind(
        'api_request',
        1,
        Date.now(),
        JSON.stringify({
          path: url.pathname,
          method: request.method,
          status: response?.status,
          duration: Date.now() - request.startTime,
          userAgent: request.headers.get('user-agent'),
          sessionId: request.sessionId
        })
      ).run();
      
    } catch (error) {
      console.error('Analytics middleware error:', error);
    }
  };
}

/**
 * Content negotiation middleware
 */
export function contentNegotiationMiddleware(request) {
  const acceptHeader = request.headers.get('accept') || 'application/json';
  
  // Determine response format
  if (acceptHeader.includes('application/json')) {
    request.responseFormat = 'json';
  } else if (acceptHeader.includes('text/html')) {
    request.responseFormat = 'html';
  } else {
    request.responseFormat = 'json'; // default
  }
}

/**
 * Compression middleware
 */
export function compressionMiddleware(request, response) {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Check if client accepts compression
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br')) {
    return response;
  }
  
  // Only compress responses > 1KB
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) < 1024) {
    return response;
  }
  
  // Note: Actual compression would be handled by Cloudflare
  // This is just to set the appropriate headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Vary', 'Accept-Encoding');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Cache control middleware
 */
export function cacheControlMiddleware(request, response) {
  const url = new URL(request.url);
  const newHeaders = new Headers(response.headers);
  
  // Different cache strategies for different endpoints
  if (url.pathname === '/' || url.pathname.includes('/health')) {
    // Health checks - no cache
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (url.pathname.includes('/api/analytics')) {
    // Analytics - cache for 5 minutes
    newHeaders.set('Cache-Control', 'private, max-age=300');
  } else if (response.status === 200) {
    // Successful API responses - cache for 1 minute
    newHeaders.set('Cache-Control', 'private, max-age=60');
  } else {
    // Error responses - no cache
    newHeaders.set('Cache-Control', 'no-cache');
  }
  
  newHeaders.set('Vary', 'Accept, Accept-Encoding, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Create middleware chain
 */
export function createMiddlewareChain(...middlewares) {
  return async (request, env, ctx) => {
    let response;
    
    // Run request middlewares
    for (const middleware of middlewares) {
      if (typeof middleware === 'function') {
        const result = await middleware(request, env, ctx);
        if (result instanceof Response) {
          response = result;
          break;
        }
      }
    }
    
    return response;
  };
}

/**
 * Wrap response with all response middlewares
 */
export function wrapResponse(request, response, env) {
  let wrappedResponse = response;
  
  // Apply response middlewares in order
  wrappedResponse = applySecurityHeaders(wrappedResponse);
  wrappedResponse = logResponse(request, wrappedResponse);
  wrappedResponse = addTimingHeaders(request, wrappedResponse);
  wrappedResponse = compressionMiddleware(request, wrappedResponse);
  wrappedResponse = cacheControlMiddleware(request, wrappedResponse);
  
  return wrappedResponse;
}