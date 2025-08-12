// src/utils/validation.js

/**
 * Input validation utilities for API endpoints
 */

/**
 * Validate a value against a schema
 */
export function validateSchema(data, schema) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
      continue;
    }
    
    // String validations
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Field '${field}' has invalid format`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
      }
    }
    
    // Number validations
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${field}' must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${field}' must be at most ${rules.max}`);
      }
      if (rules.integer && !Number.isInteger(value)) {
        errors.push(`Field '${field}' must be an integer`);
      }
    }
    
    // Array validations
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`Field '${field}' must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`Field '${field}' must have at most ${rules.maxItems} items`);
      }
    }
    
    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value, data);
      if (customError) {
        errors.push(customError);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate session start request
 */
export function validateStartRequest(data) {
  const schema = {
    context: {
      type: 'object',
      required: false
    }
  };
  
  return validateSchema(data || {}, schema);
}

/**
 * Validate swipe/choice request
 */
export function validateSwipeRequest(data) {
  const schema = {
    questionId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-z_]+$/
    },
    choice: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-z_]+$/
    },
    swipeDirection: {
      type: 'string',
      required: false,
      enum: ['left', 'right', 'up', 'down']
    },
    responseTime: {
      type: 'number',
      required: false,
      min: 0,
      max: 300000 // 5 minutes max
    },
    metadata: {
      type: 'object',
      required: false
    }
  };
  
  return validateSchema(data, schema);
}

/**
 * Validate feedback request
 */
export function validateFeedbackRequest(data) {
  const schema = {
    recommendationIndex: {
      type: 'number',
      required: false,
      min: 0,
      max: 10,
      integer: true
    },
    questionId: {
      type: 'string',
      required: false,
      maxLength: 50
    },
    rating: {
      type: 'number',
      required: false,
      min: 1,
      max: 5,
      integer: true
    },
    feedback: {
      type: 'string',
      required: false,
      enum: ['clicked', 'ignored', 'saved', 'shared', 'disliked']
    },
    actualTimeSpent: {
      type: 'number',
      required: false,
      min: 0,
      max: 86400000 // 24 hours max
    },
    actualInfoGain: {
      type: 'number',
      required: false,
      min: 0,
      max: 1
    },
    userSatisfaction: {
      type: 'number',
      required: false,
      min: 0,
      max: 1
    },
    comments: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    metadata: {
      type: 'object',
      required: false
    }
  };
  
  return validateSchema(data, schema);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove any script tags specifically
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize all request data
 */
export function sanitizeRequestData(data) {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeRequestData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key as well
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeRequestData(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Validate analytics timeframe
 */
export function validateTimeframe(timeframe) {
  const validTimeframes = ['24h', '7d', '30d', '90d'];
  
  if (!validTimeframes.includes(timeframe)) {
    return {
      valid: false,
      error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
    };
  }
  
  return {
    valid: true,
    timeframe
  };
}

/**
 * Validate request headers
 */
export function validateHeaders(headers) {
  const errors = [];
  
  // Check for required headers if needed
  const contentType = headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    errors.push('Content-Type must be application/json');
  }
  
  // Check for suspicious headers
  const userAgent = headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    console.warn('Suspicious request: missing or invalid user-agent');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(validationFn) {
  return async (request, env, ctx) => {
    try {
      let data = {};
      
      // Parse JSON body if present
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await request.json();
          } catch (e) {
            return new Response(JSON.stringify({
              error: 'Invalid JSON in request body',
              code: 'INVALID_JSON'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }
      
      // Sanitize input data
      data = sanitizeRequestData(data);
      
      // Validate data
      const validation = validationFn(data);
      
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Attach validated data to request for handler to use
      request.validatedData = data;
      
    } catch (error) {
      console.error('Validation middleware error:', error);
      return new Response(JSON.stringify({
        error: 'Internal validation error',
        code: 'INTERNAL_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}