/**
 * Test setup for DevOrbit Client
 */

import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock PostHog core methods
vi.mock('posthog-js', () => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  screen: vi.fn(),
}));

// Mock PostHog React integration
vi.mock('posthog-js/react', () => {
  const React = require('react');
  return {
    PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
    usePostHog: () => ({
      capture: vi.fn(),
      identify: vi.fn(),
      screen: vi.fn(),
    }),
  };
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = () => null;
  disconnect = () => null;
  unobserve = () => null;
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = () => null;
  disconnect = () => null;
  unobserve = () => null;
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithGitHub: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
  onAuthChange: vi.fn(),
  reauthenticate: vi.fn(),
  changePassword: vi.fn(),
  sendResetEmail: vi.fn(),
  deleteAccount: vi.fn(),
  reauthenticateWithProvider: vi.fn(),
  linkGitHubAccount: vi.fn(),
  unlinkProvider: vi.fn(),
  getLinkedProviders: vi.fn().mockReturnValue([]),
  isEmailProvider: vi.fn().mockReturnValue(true),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock API
vi.mock('../utils/api', () => ({
  default: {
    getStats: vi.fn().mockResolvedValue({}),
    getHeatmapData: vi.fn().mockResolvedValue([]),
    getProgressData: vi.fn().mockResolvedValue({}),
    getSkills: vi.fn().mockResolvedValue([]),
    getProjects: vi.fn().mockResolvedValue([]),
    getResources: vi.fn().mockResolvedValue([]),
  },
}));
