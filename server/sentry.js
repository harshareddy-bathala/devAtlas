/**
 * Sentry Integration for DevOrbit Server
 * 
 * Provides error tracking and performance monitoring with PII protection.
 */

const Sentry = require('@sentry/node');

const SENTRY_DSN = process.env.SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * @param {import('express').Express} app - Express application instance
 */
function initSentry(app) {
  if (!SENTRY_DSN) {
    if (isProduction) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    }
    return { requestHandler: noopMiddleware, errorHandler: noopMiddleware };
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: isProduction ? 'production' : 'development',
    
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Only send errors in production
    enabled: isProduction,
    
    // Integrations
    integrations: [
      // HTTP integration for request tracing
      Sentry.httpIntegration({ tracing: true }),
      // Express integration
      Sentry.expressIntegration({ app }),
    ],
    
    // PII Filtering - Remove sensitive data before sending
    beforeSend(event, hint) {
      return removePII(event);
    },
    
    // Filter out known non-actionable errors
    ignoreErrors: [
      // Network errors
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      // Expected auth errors
      'auth/id-token-expired',
      'auth/id-token-revoked',
      // Rate limit (already logged)
      'RATE_LIMIT_EXCEEDED',
    ],
  });

  isInitialized = true;
  console.log('✅ Sentry initialized (server)');

  return {
    requestHandler: Sentry.Handlers.requestHandler({
      // Include user data but it will be stripped by beforeSend
      user: ['id'],
      // Don't include IP
      ip: false,
    }),
    errorHandler: Sentry.Handlers.errorHandler({
      // Only send 500+ errors
      shouldHandleError(error) {
        // Capture 5xx errors and all unhandled errors
        if (error.status === undefined) return true;
        return error.status >= 500;
      },
    }),
  };
}

/**
 * No-op middleware for when Sentry is disabled
 */
function noopMiddleware(req, res, next) {
  next();
}

/**
 * Remove PII from Sentry events
 */
function removePII(event) {
  // Remove user email if present - only keep ID
  if (event.user) {
    event.user = {
      id: event.user.id,
    };
  }

  // Scrub sensitive data from breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      // Remove authorization headers
      if (breadcrumb.data?.headers?.authorization) {
        breadcrumb.data.headers.authorization = '[REDACTED]';
      }
      
      // Remove sensitive URL parameters
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
      }
      
      return breadcrumb;
    });
  }

  // Scrub request data
  if (event.request) {
    if (event.request.headers) {
      // Remove authorization header
      if (event.request.headers.authorization) {
        event.request.headers.authorization = '[REDACTED]';
      }
      // Remove cookies
      if (event.request.headers.cookie) {
        event.request.headers.cookie = '[REDACTED]';
      }
    }
    
    // Scrub URL
    if (event.request.url) {
      event.request.url = scrubUrl(event.request.url);
    }
    
    // Scrub request body
    if (event.request.data) {
      event.request.data = scrubObject(event.request.data);
    }
  }

  // Scrub extra data that might contain PII
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }

  return event;
}

/**
 * Scrub sensitive query parameters from URLs
 */
function scrubUrl(url) {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'key', 'apiKey', 'password', 'secret', 'email'];
    
    sensitiveParams.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Recursively scrub sensitive fields from objects
 */
function scrubObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'email', 'authorization', 'serviceAccountKey'];
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = scrubObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Set user context for error tracking (only ID, no PII)
 */
function setSentryUser(userId) {
  if (!isInitialized) return;
  
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture an exception manually with context
 */
function captureException(error, context) {
  if (!isInitialized) {
    console.error('Uncaptured exception:', error);
    return;
  }
  
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(scrubObject(context));
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message with a specific level
 */
function captureMessage(message, level = 'info') {
  if (!isInitialized) return;
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, category, data) {
  if (!isInitialized) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    data: data ? scrubObject(data) : undefined,
    level: 'info',
  });
}

/**
 * Create a custom transaction for performance monitoring
 */
function startTransaction(name, op) {
  if (!isInitialized) return null;
  
  return Sentry.startSpan({ name, op });
}

module.exports = {
  initSentry,
  setSentryUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  Sentry,
};
