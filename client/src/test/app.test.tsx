import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    render(
      <TestWrapper>
        <div>Test App</div>
      </TestWrapper>
    );
    expect(screen.getByText('Test App')).toBeInTheDocument();
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to dark theme', () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should persist theme to localStorage', () => {
    const TestComponent = () => {
      const { toggleTheme } = require('../contexts/ThemeContext').useTheme();
      return <button onClick={toggleTheme}>Toggle</button>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Theme should be saved
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('Utils', () => {
  it('formatDate should format dates correctly', async () => {
    const { formatDate } = await import('../lib/utils');
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formatDuration should format durations correctly', async () => {
    const { formatDuration } = await import('../lib/utils');
    
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(7200)).toBe('2h 0m');
  });

  it('truncate should truncate long strings', async () => {
    const { truncate } = await import('../lib/utils');
    
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('slugify should create valid slugs', async () => {
    const { slugify } = await import('../lib/utils');
    
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('TypeScript & React')).toBe('typescript-react');
    expect(slugify('  Trim  Me  ')).toBe('trim-me');
  });

  it('debounce should debounce function calls', async () => {
    const { debounce } = await import('../lib/utils');
    
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);
    
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    expect(fn).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
