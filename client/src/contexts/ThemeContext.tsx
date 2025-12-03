import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '../types';
import { useAuth } from './AuthContext';
import { authApi } from '../lib/api';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#ffffff');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'SYSTEM';
  });

  // Calculate resolved theme
  const resolvedTheme = theme === 'SYSTEM' ? getSystemTheme() : theme.toLowerCase() as 'dark' | 'light';

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'SYSTEM') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Sync with user preference when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.theme) {
      setThemeState(user.theme);
    }
  }, [isAuthenticated, user?.theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // Persist to backend if authenticated
    if (isAuthenticated) {
      try {
        await authApi.updateMe({ theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const toggleTheme = async () => {
    const nextTheme: Theme = theme === 'DARK' ? 'LIGHT' : theme === 'LIGHT' ? 'SYSTEM' : 'DARK';
    await setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
