import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge.
 * Handles conditional classes and resolves Tailwind CSS conflicts.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged and deduplicated class string
 * 
 * @example
 * cn('px-4 py-2', { 'bg-blue-500': isActive }, 'hover:bg-blue-600')
 * // Returns: 'px-4 py-2 bg-blue-500 hover:bg-blue-600' (if isActive is true)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a human-readable string.
 * 
 * @param date - Date string or Date object to format
 * @returns Formatted date string (e.g., "Dec 27, 2025")
 * 
 * @example
 * formatDate('2025-12-27') // Returns: "Dec 27, 2025"
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Formats a date as a relative time string.
 * 
 * @param date - Date string or Date object to format
 * @returns Relative time string (e.g., "5m ago", "2h ago", "3d ago")
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 60000)) // Returns: "1m ago"
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

/**
 * Formats a duration in seconds to a human-readable string.
 * 
 * @param seconds - Duration in seconds
 * @param format - Output format: 'short' (e.g., "2h 30m") or 'long' (e.g., "2 hours 30 minutes")
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(9000, 'short') // Returns: "2h 30m"
 * formatDuration(9000, 'long')  // Returns: "2 hours 30 minutes"
 */
export function formatDuration(seconds: number, format: 'short' | 'long' = 'short'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (format === 'long') {
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formats a duration in minutes to a human-readable string.
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m")
 * 
 * @example
 * formatDurationFromMinutes(150) // Returns: "2h 30m"
 */
export function formatDurationFromMinutes(minutes: number): string {
  return formatDuration(minutes * 60);
}

/**
 * Returns the singular or plural form of a word based on count.
 * 
 * @param count - The count to check
 * @param singular - The singular form of the word
 * @param plural - Optional custom plural form (defaults to singular + 's')
 * @returns The appropriate word form
 * 
 * @example
 * pluralize(1, 'item')      // Returns: "item"
 * pluralize(5, 'item')      // Returns: "items"
 * pluralize(5, 'child', 'children') // Returns: "children"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}

/**
 * Creates a debounced version of a function.
 * The function will only be called after the specified delay has passed
 * without any new calls.
 * 
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query: string) => search(query), 300);
 * debouncedSearch('hello'); // Only calls search after 300ms of no calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates a throttled version of a function.
 * The function will only be called once per specified time limit.
 * 
 * @param fn - The function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generates a unique identifier using crypto.randomUUID().
 * 
 * @returns A UUID v4 string
 * 
 * @example
 * generateId() // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Extracts initials from a name.
 * Takes the first letter of each word, up to 2 characters.
 * 
 * @param name - Full name to extract initials from
 * @returns Uppercase initials (1-2 characters)
 * 
 * @example
 * getInitials('John Doe')     // Returns: "JD"
 * getInitials('Alice')        // Returns: "A"
 * getInitials('John Paul Doe') // Returns: "JP"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Determines whether to use white or black text on a colored background.
 * Uses relative luminance calculation for accessibility.
 * 
 * @param hexColor - Hex color code (with or without #)
 * @returns 'white' or 'black' for optimal contrast
 * 
 * @example
 * getContrastColor('#000000') // Returns: "white"
 * getContrastColor('#ffffff') // Returns: "black"
 * getContrastColor('#8B5CF6') // Returns: "white"
 */
export function getContrastColor(hexColor: string): 'white' | 'black' {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Truncates a string to a specified length with ellipsis.
 * 
 * @param str - String to truncate
 * @param length - Maximum length (including ellipsis)
 * @returns Truncated string with "..." if needed
 * 
 * @example
 * truncate('Hello World', 8)  // Returns: "Hello..."
 * truncate('Hi', 10)          // Returns: "Hi"
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

/**
 * Capitalizes the first letter of a string.
 * 
 * @param str - String to capitalize
 * @returns String with first letter capitalized, rest lowercase
 * 
 * @example
 * capitalizeFirst('hello')   // Returns: "Hello"
 * capitalizeFirst('WORLD')   // Returns: "World"
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to a URL-friendly slug.
 * 
 * @param str - String to convert
 * @returns Lowercase, hyphen-separated slug
 * 
 * @example
 * slugify('Hello World!')     // Returns: "hello-world"
 * slugify('My Cool Project')  // Returns: "my-cool-project"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

