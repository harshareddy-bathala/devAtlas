/**
 * Sentry Error Tracking - Stub Module
 * Provides error tracking and monitoring capabilities
 * Can be extended to integrate with actual Sentry service
 */

// Initialize Sentry
function initSentry(app) {
  // Return mock middleware that does nothing
  // This allows the application to run without Sentry being configured
  return {
    requestHandler: (req, res, next) => {
      // Mock request handler - just pass through
      next();
    },
    errorHandler: (err, req, res, next) => {
      // Mock error handler - pass to next middleware
      next(err);
    }
  };
}

// Set user context in Sentry
function setSentryUser(userId) {
  // No-op for stub implementation
  // In production, this would track the user in Sentry
}

// Capture exception in Sentry
function captureException(error, context = {}) {
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Sentry Exception:', error, context);
  }
}

// Add breadcrumb for tracking
function addBreadcrumb(message, level = 'info', data = {}) {
  // No-op for stub implementation
  // In production, this would add breadcrumbs to Sentry
}

module.exports = {
  initSentry,
  setSentryUser,
  captureException,
  addBreadcrumb
};
