// src/utils/rateLimiter.js

/**
 * Rate limiter implementation using KV storage
 * Implements sliding window algorithm for accurate rate limiting
 */
export class RateLimiter {
  constructor(env, options = {}) {
    this.env = env;
    this.windowSize = options.windowSize || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 60;   // 60 requests per minute default
    this.keyPrefix = options.keyPrefix || 'rate_limit';
  }

  /**
   * Check if request should be rate limited
   * @param {string} identifier - Unique identifier (IP, session ID, etc.)
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(identifier) {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    try {
      // Get current request history
      const data = await this.env.RATE_LIMITS?.get(key);
      let requests = data ? JSON.parse(data) : [];
      
      // Filter out requests outside the current window
      requests = requests.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (requests.length >= this.maxRequests) {
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + this.windowSize;
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        
        return {
          allowed: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: resetTime,
          retryAfter
        };
      }
      
      // Add current request
      requests.push(now);
      
      // Store updated request history
      await this.env.RATE_LIMITS?.put(key, JSON.stringify(requests), {
        expirationTtl: Math.ceil(this.windowSize / 1000) + 1
      });
      
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - requests.length,
        reset: now + this.windowSize,
        retryAfter: null
      };
      
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowSize,
        retryAfter: null,
        error: true
      };
    }
  }

  /**
   * Middleware function for rate limiting
   */
  middleware() {
    return async (request, env) => {
      // Extract identifier from request
      const identifier = this.getIdentifier(request);
      
      // Check rate limit
      const limitStatus = await this.checkLimit(identifier);
      
      if (!limitStatus.allowed) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: limitStatus.retryAfter,
          reset: new Date(limitStatus.reset).toISOString()
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limitStatus.limit.toString(),
            'X-RateLimit-Remaining': limitStatus.remaining.toString(),
            'X-RateLimit-Reset': limitStatus.reset.toString(),
            'Retry-After': limitStatus.retryAfter.toString()
          }
        });
      }
      
      // Add rate limit headers to response
      request.rateLimitHeaders = {
        'X-RateLimit-Limit': limitStatus.limit.toString(),
        'X-RateLimit-Remaining': limitStatus.remaining.toString(),
        'X-RateLimit-Reset': limitStatus.reset.toString()
      };
    };
  }

  /**
   * Get identifier from request (IP or session)
   */
  getIdentifier(request) {
    // Try to get session ID from path or body
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];
    
    if (sessionId && sessionId.match(/^[a-f0-9-]{36}$/)) {
      return `session:${sessionId}`;
    }
    
    // Fall back to IP address
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown';
    
    return `ip:${ip}`;
  }
}

/**
 * Token bucket rate limiter for more flexible rate limiting
 */
export class TokenBucketRateLimiter {
  constructor(env, options = {}) {
    this.env = env;
    this.capacity = options.capacity || 10;        // Max tokens in bucket
    this.refillRate = options.refillRate || 1;     // Tokens per second
    this.keyPrefix = options.keyPrefix || 'token_bucket';
  }

  async checkLimit(identifier) {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await this.env.RATE_LIMITS?.get(key);
      let bucket;
      
      if (data) {
        bucket = JSON.parse(data);
        
        // Calculate tokens to add based on time elapsed
        const timePassed = (now - bucket.lastRefill) / 1000; // seconds
        const tokensToAdd = timePassed * this.refillRate;
        
        bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      } else {
        // Initialize new bucket
        bucket = {
          tokens: this.capacity,
          lastRefill: now
        };
      }
      
      if (bucket.tokens < 1) {
        // No tokens available
        const waitTime = (1 - bucket.tokens) / this.refillRate;
        
        return {
          allowed: false,
          tokensRemaining: bucket.tokens,
          retryAfter: Math.ceil(waitTime)
        };
      }
      
      // Consume a token
      bucket.tokens -= 1;
      
      // Save updated bucket
      await this.env.RATE_LIMITS?.put(key, JSON.stringify(bucket), {
        expirationTtl: 3600 // 1 hour TTL
      });
      
      return {
        allowed: true,
        tokensRemaining: bucket.tokens,
        retryAfter: null
      };
      
    } catch (error) {
      console.error('Token bucket error:', error);
      // Fail open
      return {
        allowed: true,
        tokensRemaining: this.capacity,
        retryAfter: null,
        error: true
      };
    }
  }
}

/**
 * Distributed rate limiter for global limits across all workers
 */
export class DistributedRateLimiter {
  constructor(env, options = {}) {
    this.env = env;
    this.globalLimit = options.globalLimit || 10000; // 10k requests per minute globally
    this.windowSize = options.windowSize || 60000;   // 1 minute
    this.keyPrefix = 'global_rate_limit';
  }

  async checkGlobalLimit() {
    const key = this.keyPrefix;
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    try {
      // Use Durable Object or D1 for global state
      const result = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM interactions WHERE timestamp > ? AND timestamp <= ?'
      ).bind(windowStart, now).first();
      
      const currentCount = result?.count || 0;
      
      if (currentCount >= this.globalLimit) {
        return {
          allowed: false,
          currentLoad: currentCount,
          limit: this.globalLimit,
          message: 'System is experiencing high load. Please try again later.'
        };
      }
      
      return {
        allowed: true,
        currentLoad: currentCount,
        limit: this.globalLimit,
        utilizationPercent: (currentCount / this.globalLimit) * 100
      };
      
    } catch (error) {
      console.error('Global rate limiter error:', error);
      // Fail open for global limits
      return {
        allowed: true,
        currentLoad: 0,
        limit: this.globalLimit,
        error: true
      };
    }
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on system load
 */
export class AdaptiveRateLimiter {
  constructor(env, options = {}) {
    this.env = env;
    this.baseLimit = options.baseLimit || 60;
    this.minLimit = options.minLimit || 10;
    this.maxLimit = options.maxLimit || 100;
    this.loadThreshold = options.loadThreshold || 0.8; // 80% system load
  }

  async getAdaptiveLimit() {
    try {
      // Get current system metrics
      const metrics = await this.getSystemMetrics();
      
      // Calculate adaptive limit based on load
      let limit = this.baseLimit;
      
      if (metrics.cpuUsage > this.loadThreshold) {
        // Reduce limit under high load
        const reduction = (metrics.cpuUsage - this.loadThreshold) / (1 - this.loadThreshold);
        limit = Math.max(this.minLimit, this.baseLimit * (1 - reduction * 0.5));
      } else if (metrics.cpuUsage < 0.5) {
        // Increase limit under low load
        const increase = (0.5 - metrics.cpuUsage) / 0.5;
        limit = Math.min(this.maxLimit, this.baseLimit * (1 + increase * 0.3));
      }
      
      return Math.round(limit);
      
    } catch (error) {
      console.error('Adaptive rate limiter error:', error);
      return this.baseLimit;
    }
  }

  async getSystemMetrics() {
    // In a real implementation, this would fetch actual metrics
    // For now, return mock data
    return {
      cpuUsage: 0.5,
      memoryUsage: 0.6,
      requestRate: 1000
    };
  }
}