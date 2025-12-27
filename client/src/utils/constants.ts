/**
 * Shared Configuration Constants
 * 
 * Centralizes all magic numbers and configuration values used throughout the application.
 * Import from this file instead of defining constants inline.
 */

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Default cache time-to-live in milliseconds (5 minutes) */
  TTL: 5 * 60 * 1000,
  /** Short TTL for frequently changing data (1 minute) */
  SHORT_TTL: 1 * 60 * 1000,
  /** Long TTL for rarely changing data (30 minutes) */
  LONG_TTL: 30 * 60 * 1000,
} as const;

/**
 * Debounce timing configuration
 */
export const DEBOUNCE_CONFIG = {
  /** Default delay for debounced operations */
  DEFAULT_DELAY: 2000,
  /** Short delay for responsive UI updates */
  SHORT_DELAY: 300,
  /** Delay for search input debouncing */
  SEARCH_DELAY: 300,
  /** Delay for form autosave */
  AUTOSAVE_DELAY: 1000,
} as const;

/**
 * Pagination configuration
 */
export const PAGINATION_CONFIG = {
  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 20,
  /** Small page size for compact lists */
  SMALL_PAGE_SIZE: 10,
  /** Large page size for expanded views */
  LARGE_PAGE_SIZE: 50,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
  /** Default starting page */
  DEFAULT_PAGE: 1,
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  /** Number of retry attempts for failed requests */
  RETRY_COUNT: 3,
  /** Base delay between retries in milliseconds */
  RETRY_DELAY: 1000,
  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
  /** Token refresh buffer time in milliseconds (5 minutes) */
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000,
} as const;

/**
 * Animation durations
 */
export const ANIMATION_CONFIG = {
  /** Fast transition duration in milliseconds */
  FAST: 150,
  /** Default transition duration */
  DEFAULT: 200,
  /** Slow transition duration */
  SLOW: 300,
  /** Extra slow for emphasis */
  EXTRA_SLOW: 500,
} as const;

/**
 * Form validation limits
 */
export const VALIDATION_LIMITS = {
  /** Maximum length for names/titles */
  MAX_NAME_LENGTH: 100,
  /** Maximum length for titles */
  MAX_TITLE_LENGTH: 200,
  /** Maximum length for descriptions */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Maximum length for notes */
  MAX_NOTES_LENGTH: 1000,
  /** Maximum length for tech stack */
  MAX_TECH_STACK_LENGTH: 500,
  /** Minimum username length */
  MIN_USERNAME_LENGTH: 3,
  /** Maximum username length */
  MAX_USERNAME_LENGTH: 20,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum number of linked projects per skill */
  MAX_LINKED_PROJECTS: 50,
  /** Maximum number of tags per item */
  MAX_TAGS: 10,
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Number of items to show in compact lists */
  COMPACT_LIST_SIZE: 5,
  /** Number of items to show in expanded lists */
  EXPANDED_LIST_SIZE: 10,
  /** Toast notification duration in milliseconds */
  TOAST_DURATION: 4000,
  /** Modal animation duration */
  MODAL_ANIMATION_DURATION: 200,
} as const;

/**
 * Skill categories
 */
export const SKILL_CATEGORIES = [
  { value: 'language', label: 'Language' },
  { value: 'framework', label: 'Framework' },
  { value: 'library', label: 'Library' },
  { value: 'tool', label: 'Tool' },
  { value: 'database', label: 'Database' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Skill statuses
 */
export const SKILL_STATUSES = [
  { value: 'want_to_learn', label: 'Want to Learn' },
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
] as const;

/**
 * Project statuses
 */
export const PROJECT_STATUSES = [
  { value: 'idea', label: 'Ideas' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
] as const;

/**
 * Resource types
 */
export const RESOURCE_TYPES = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'video', label: 'Video' },
  { value: 'course', label: 'Course' },
  { value: 'article', label: 'Article' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Available skill icons
 */
export const SKILL_ICONS = [
  '🟨', '🔷', '⚛️', '🟩', '🐍', '🦀', '🐳', '🐘',
  '☕', '💎', '🔶', '🟣', '📚', '⚡', '🔥', '🌐'
] as const;

// Type exports for TypeScript usage
export type SkillCategory = typeof SKILL_CATEGORIES[number]['value'];
export type SkillStatus = typeof SKILL_STATUSES[number]['value'];
export type ProjectStatus = typeof PROJECT_STATUSES[number]['value'];
export type ResourceType = typeof RESOURCE_TYPES[number]['value'];
export type SkillIcon = typeof SKILL_ICONS[number];
