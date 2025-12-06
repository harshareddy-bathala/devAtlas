/**
 * Analytics Integration for DevOrbit Client
 * 
 * Provides product analytics with PostHog and Vercel Analytics.
 * Designed with privacy in mind - no PII collection.
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const isProduction = import.meta.env.PROD;

let isInitialized = false;

/**
 * Initialize PostHog analytics
 */
export function initAnalytics(): void {
  if (!POSTHOG_KEY) {
    console.warn('⚠️ PostHog key not configured - analytics disabled');
    return;
  }

  if (isInitialized) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2025-05-24',
    
    // Privacy settings
    persistence: 'localStorage',
    autocapture: false, // Disable auto-capture for privacy
    capture_pageview: true, // Capture pageviews
    capture_pageleave: true,
    
    // Disable session recording to protect privacy
    disable_session_recording: true,
    
    // Mask IPs
    ip: false,
    
    // Respect Do Not Track
    respect_dnt: true,
    
    // Don't opt out in dev - allow testing
    loaded: (ph: typeof posthog) => {
      console.log(`✅ PostHog loaded (${isProduction ? 'production' : 'development'} mode, host: ${POSTHOG_HOST})`);
    },
    
    // Property filtering
    property_blacklist: [
      '$ip',
      '$device_id',
    ],
  });

  isInitialized = true;
  console.log('✅ Analytics initialized');
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!isInitialized) {
    console.debug(`[Analytics] Not initialized, skipping: ${eventName}`);
    return;
  }
  
  // Log in development for debugging
  if (!isProduction) {
    console.debug(`[Analytics] ${eventName}`, properties);
  }
  
  // Send to PostHog in both dev and prod for testing
  try {
    const sanitizedProps = properties ? sanitizeProperties(properties) : undefined;
    posthog.capture(eventName, sanitizedProps);
  } catch (error) {
    console.warn('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track page views
 */
export function trackPageView(pageName: string, properties?: Record<string, string>): void {
  trackEvent('$pageview', {
    page: pageName,
    ...properties,
  });
}

/**
 * Identify user (only with anonymous ID)
 */
export function identifyUser(userId: string): void {
  if (!isInitialized) {
    console.debug('[Analytics] Not initialized, skipping identify');
    return;
  }

  // Only identify with user ID, no PII
  try {
    posthog.identify(userId, {
      // Don't include email, name, or other PII
      created_at: new Date().toISOString(),
    });
    console.debug(`[Analytics] User identified: ${userId.substring(0, 8)}...`);
  } catch (error) {
    console.warn('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Clear user identity on logout
 */
export function resetAnalytics(): void {
  if (!isInitialized) {
    return;
  }

  posthog.reset();
}

/**
 * Set user properties (non-PII only)
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (!isInitialized) {
    return;
  }

  // Filter out PII
  const safeProps = sanitizeProperties(properties);
  posthog.people.set(safeProps);
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  action: string,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent(`feature_${action}`, {
    feature,
    ...metadata,
  });
}

// ============ Pre-defined Event Helpers ============

/**
 * Track skill events
 */
export const skillEvents = {
  created: (category: string, status: string) =>
    trackEvent('skill_created', { category, status }),
  
  updated: (field: string, oldValue?: string, newValue?: string) =>
    trackEvent('skill_updated', { 
      field,
      changed: oldValue !== newValue,
    }),
  
  deleted: (category: string) =>
    trackEvent('skill_deleted', { category }),
  
  statusChanged: (from: string, to: string) =>
    trackEvent('skill_status_changed', { from, to }),
  
  linkedToProject: () =>
    trackEvent('skill_linked_to_project'),
};

/**
 * Track project events
 */
export const projectEvents = {
  created: (status: string) =>
    trackEvent('project_created', { status }),
  
  updated: (field: string) =>
    trackEvent('project_updated', { field }),
  
  deleted: () =>
    trackEvent('project_deleted'),
  
  statusChanged: (from: string, to: string) =>
    trackEvent('project_status_changed', { from, to }),
};

/**
 * Track resource events
 */
export const resourceEvents = {
  created: (type: string) =>
    trackEvent('resource_created', { type }),
  
  deleted: () =>
    trackEvent('resource_deleted'),
  
  opened: (type: string) =>
    trackEvent('resource_opened', { type }),
};

/**
 * Track onboarding events
 */
export const onboardingEvents = {
  started: () =>
    trackEvent('onboarding_started'),
  
  stepCompleted: (step: number, stepName: string) =>
    trackEvent('onboarding_step_completed', { step, step_name: stepName }),
  
  completed: () =>
    trackEvent('onboarding_completed'),
  
  skipped: (step: number) =>
    trackEvent('onboarding_skipped', { step }),
};

/**
 * Track authentication events
 */
export const authEvents = {
  signedUp: (method: 'email' | 'google' | 'github') =>
    trackEvent('user_signed_up', { method }),
  
  signedIn: (method: 'email' | 'google' | 'github') =>
    trackEvent('user_signed_in', { method }),
  
  signedOut: () =>
    trackEvent('user_signed_out'),
  
  passwordChanged: () =>
    trackEvent('password_changed'),
  
  accountDeleted: () =>
    trackEvent('account_deleted'),
};

// ============ Utility Functions ============

/**
 * Remove potential PII from properties
 */
function sanitizeProperties(
  properties: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> {
  const piiKeys = ['email', 'name', 'phone', 'address', 'username', 'displayName'];
  const result: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip known PII fields
    if (piiKeys.some((pii) => key.toLowerCase().includes(pii.toLowerCase()))) {
      continue;
    }
    
    // Sanitize string values that might contain PII
    if (typeof value === 'string') {
      // Check if it looks like an email
      if (value.includes('@') && value.includes('.')) {
        result[key] = '[REDACTED]';
        continue;
      }
    }
    
    result[key] = value;
  }

  return result;
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isInitialized && isProduction;
}

export { posthog };