/**
 * Sentry Integration for DevOrbit Client
 * 
 * Provides error tracking and performance monitoring with PII protection.
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const isProduction = import.meta.env.PROD;

/**
 * Initialize Sentry error tracking
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (isProduction) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: isProduction ? 'production' : 'development',
    
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session replay (capture 10% of sessions, 100% of error sessions)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Only send errors in production
    enabled: isProduction,
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content to protect PII
        maskAllText: true,
        // Block all media to reduce payload
        blockAllMedia: true,
      }),
    ],
    
    // PII Filtering - Remove sensitive data before sending
    beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
      return removePII(event) as Sentry.ErrorEvent;
    },
    
    // Filter out known non-actionable errors
    ignoreErrors: [
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // Firebase auth errors that users can resolve
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/network-request-failed',
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
    ],
    
    // Don't track localhost or dev URLs
    denyUrls: [
      /localhost/i,
      /127\.0\.0\.1/i,
      /0\.0\.0\.0/i,
    ],
  });

  console.log('✅ Sentry initialized');
}

/**
 * Remove PII from Sentry events
 */
function removePII(event: Sentry.Event): Sentry.Event {
  // Remove user email if present
  if (event.user) {
    event.user = {
      id: event.user.id, // Keep anonymous user ID
      // Remove email, username, ip_address
    };
  }

  // Scrub sensitive data from breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb: Sentry.Breadcrumb) => {
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
function scrubUrl(url: string): string {
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
function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'email', 'authorization'];
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Set user context for error tracking (only ID, no PII)
 */
export function setSentryUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope: Sentry.Scope) => {
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
export function captureMessage(
  message: string, 
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data: data ? scrubObject(data) : undefined,
    level: 'info',
  });
}

export { Sentry };
