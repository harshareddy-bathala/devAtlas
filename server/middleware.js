const { ZodError } = require('zod');
const crypto = require('crypto');
const { AppError, ValidationError } = require('./errors');

// Request ID middleware for correlation
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        console.error(`[${req.id}] Validation error:`, JSON.stringify(errors));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
          requestId: req.id
        });
      }
      next(error);
    }
  };
}

// Validate URL params
function validateParams(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          code: 'INVALID_PARAMS',
          details: error.errors,
          requestId: req.id
        });
      }
      next(error);
    }
  };
}

// Validate query params
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          })),
          requestId: req.id
        });
      }
      next(error);
    }
  };
}

// Async handler wrapper to catch async errors
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler
function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  
  // Log error with request ID for correlation
  console.error(`[${new Date().toISOString()}] [${requestId}] Error:`, {
    message: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    // Only include stack in development and never in response
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      requestId,
      ...(err.errors && { details: err.errors })
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      requestId,
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Handle unknown errors - NEVER expose internal details in production
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    requestId
    // Never include stack traces or internal error messages in production
  });
}

// Request logger middleware with structured logging
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      userId: req.user?.id
    };
    
    // Structured JSON logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    } else {
      console.log(`[${logData.timestamp}] [${req.id}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  
  next();
}

// Deep sanitize input - recursively processes nested objects and arrays
// URL fields are excluded from sanitization to preserve valid URLs
const URL_FIELD_NAMES = ['url', 'githubUrl', 'demoUrl', 'avatarUrl', 'photoURL', 'imageUrl', 'href', 'link'];

function sanitizeValue(value, depth = 0, fieldName = '') {
  // Prevent infinite recursion
  if (depth > 10) return value;
  
  if (typeof value === 'string') {
    // Don't sanitize URL fields - they need slashes and special characters intact
    if (URL_FIELD_NAMES.includes(fieldName)) {
      return value;
    }
    
    // For non-URL strings, escape HTML characters but NOT slashes
    // Slashes are safe in JSON and don't pose XSS risk
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1, fieldName));
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        // Pass the field name to check for URL fields
        sanitized[key] = sanitizeValue(value[key], depth + 1, key);
      }
    }
    return sanitized;
  }
  
  return value;
}

function sanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = {
  validate,
  validateParams,
  validateQuery,
  asyncHandler,
  errorHandler,
  requestLogger,
  sanitize,
  requestIdMiddleware
};
