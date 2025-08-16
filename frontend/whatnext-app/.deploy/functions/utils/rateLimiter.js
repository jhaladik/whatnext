// src/utils/rateLimiter.js

export class RateLimiter {
  constructor(env, options = {}) {
    this.kv = env.RATE_LIMITS || env.USER_SESSIONS; // Fallback to sessions KV
    this.maxRequests = options.maxRequests || 60;
    this.windowSize = options.windowSize || 60000; // 1 minute in milliseconds
    this.keyPrefix = options.keyPrefix || 'rate_limit';
  }

  /**
   * Check if request is within rate limit
   * @param {string} identifier - IP address or user ID
   * @returns {Object} Rate limit status
   */
  async checkLimit(identifier) {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    try {
      // Get current rate limit data
      const data = await this.kv.get(key);
      let rateLimitData = data ? JSON.parse(data) : null;
      
      if (!rateLimitData || rateLimitData.windowStart < windowStart) {
        // New window or expired window
        rateLimitData = {
          windowStart: now,
          requests: 1,
          firstRequest: now
        };
      } else {
        // Within current window
        rateLimitData.requests++;
      }
      
      // Check if limit exceeded
      const allowed = rateLimitData.requests <= this.maxRequests;
      const remaining = Math.max(0, this.maxRequests - rateLimitData.requests);
      const reset = rateLimitData.windowStart + this.windowSize;
      
      // Store updated data
      await this.kv.put(key, JSON.stringify(rateLimitData), {
        expirationTtl: Math.ceil(this.windowSize / 1000) // Convert to seconds
      });
      
      return {
        allowed,
        limit: this.maxRequests,
        remaining,
        reset,
        retryAfter: allowed ? null : Math.ceil((reset - now) / 1000)
      };
      
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowSize,
        error: true
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier) {
    const key = `${this.keyPrefix}:${identifier}`;
    
    try {
      await this.kv.delete(key);
      return { success: true };
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier) {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    try {
      const data = await this.kv.get(key);
      
      if (!data) {
        return {
          requests: 0,
          limit: this.maxRequests,
          remaining: this.maxRequests,
          reset: now + this.windowSize
        };
      }
      
      const rateLimitData = JSON.parse(data);
      
      if (rateLimitData.windowStart < windowStart) {
        // Window has expired
        return {
          requests: 0,
          limit: this.maxRequests,
          remaining: this.maxRequests,
          reset: now + this.windowSize
        };
      }
      
      return {
        requests: rateLimitData.requests,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - rateLimitData.requests),
        reset: rateLimitData.windowStart + this.windowSize
      };
      
    } catch (error) {
      console.error('Rate limit status error:', error);
      return {
        requests: 0,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowSize,
        error: true
      };
    }
  }

  /**
   * Clean up expired rate limit entries (maintenance)
   */
  async cleanup() {
    // KV entries with TTL will auto-expire
    // This method is here for future implementation if needed
    console.log('Rate limit cleanup - using TTL auto-expiration');
    return { success: true };
  }
}

/**
 * IP-based rate limiter
 */
export class IPRateLimiter extends RateLimiter {
  constructor(env, options = {}) {
    super(env, {
      ...options,
      keyPrefix: options.keyPrefix || 'ip_rate_limit'
    });
  }

  /**
   * Extract IP from request
   */
  getIdentifier(request) {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For')?.split(',')[0] || 
           'unknown';
  }

  /**
   * Check rate limit for request
   */
  async check(request) {
    const identifier = this.getIdentifier(request);
    return this.checkLimit(identifier);
  }
}

/**
 * Session-based rate limiter
 */
export class SessionRateLimiter extends RateLimiter {
  constructor(env, options = {}) {
    super(env, {
      ...options,
      keyPrefix: options.keyPrefix || 'session_rate_limit'
    });
  }

  /**
   * Extract session ID from request
   */
  getIdentifier(request) {
    // Try to get from various sources
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Check if session ID is in path (e.g., /api/answer/:sessionId)
    const sessionIdIndex = pathParts.findIndex(part => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(part)
    );
    
    if (sessionIdIndex !== -1) {
      return pathParts[sessionIdIndex];
    }
    
    // Check headers
    return request.headers.get('X-Session-Id') || 'unknown';
  }

  /**
   * Check rate limit for request
   */
  async check(request) {
    const identifier = this.getIdentifier(request);
    return this.checkLimit(identifier);
  }
}

/**
 * Distributed rate limiter using Durable Objects (future enhancement)
 */
export class DistributedRateLimiter {
  constructor(env, options = {}) {
    this.env = env;
    this.options = options;
    // This would use Durable Objects for distributed rate limiting
    // Placeholder for future implementation
  }

  async checkLimit(identifier) {
    // Future implementation with Durable Objects
    return {
      allowed: true,
      limit: this.options.maxRequests || 60,
      remaining: this.options.maxRequests || 60,
      reset: Date.now() + 60000
    };
  }
}