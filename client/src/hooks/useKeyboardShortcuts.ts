import { useEffect, useState } from 'react';
import type { KeyboardShortcut } from '../types';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const modifiers = shortcut.modifiers || [];
        const ctrlMatch = modifiers.includes('ctrl') === (event.ctrlKey || event.metaKey);
        const altMatch = modifiers.includes('alt') === event.altKey;
        const shiftMatch = modifiers.includes('shift') === event.shiftKey;
        const metaMatch = modifiers.includes('meta') === event.metaKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch &&
          (modifiers.includes('meta') ? metaMatch : true)
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Global shortcuts manager
export function useGlobalShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      modifiers: ['shift'],
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(prev => !prev),
      scope: 'global',
    },
    {
      key: 'Escape',
      description: 'Close dialogs/modals',
      action: () => {
        setShowHelp(false);
        // Dispatch custom event for other components to handle
        window.dispatchEvent(new CustomEvent('close-dialogs'));
      },
      scope: 'global',
    },
  ];

  useKeyboardShortcuts(globalShortcuts);

  return { showHelp, setShowHelp, globalShortcuts };
}

// Navigation shortcuts
export function useNavigationShortcuts(navigate: (path: string) => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'g',
      description: 'Go to Dashboard',
      action: () => {
        // Wait for 'd' key
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'd') {
            navigate('/');
          } else if (e.key === 's') {
            navigate('/stack');
          } else if (e.key === 'p') {
            navigate('/projects');
          } else if (e.key === 'r') {
            navigate('/resources');
          } else if (e.key === 't') {
            navigate('/time');
          }
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
        setTimeout(() => window.removeEventListener('keydown', handler), 1000);
      },
      scope: 'global',
    },
    {
      key: 'k',
      modifiers: ['ctrl'],
      description: 'Open command palette',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      },
      scope: 'global',
    },
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
}

// Timer shortcuts
export function useTimerShortcuts(
  onStart: () => void,
  onStop: () => void,
  isRunning: boolean
) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      modifiers: ['alt'],
      description: isRunning ? 'Stop timer' : 'Start timer',
      action: () => {
        if (isRunning) {
          onStop();
        } else {
          onStart();
        }
      },
      scope: 'page',
    },
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
}

// Create new item shortcuts
export function useCreateShortcuts(onCreate: () => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      modifiers: ['ctrl'],
      description: 'Create new item',
      action: onCreate,
      scope: 'page',
    },
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
}

// Get all registered shortcuts for help display
export function getAllShortcuts(): KeyboardShortcut[] {
  return [
    // Global
    { key: '?', modifiers: ['shift'], description: 'Show keyboard shortcuts', action: () => {}, scope: 'global' },
    { key: 'Escape', description: 'Close dialogs/modals', action: () => {}, scope: 'global' },
    { key: 'k', modifiers: ['ctrl'], description: 'Open command palette', action: () => {}, scope: 'global' },
    // Navigation
    { key: 'g d', description: 'Go to Dashboard', action: () => {}, scope: 'global' },
    { key: 'g s', description: 'Go to Stack Tracker', action: () => {}, scope: 'global' },
    { key: 'g p', description: 'Go to Projects', action: () => {}, scope: 'global' },
    { key: 'g r', description: 'Go to Resources', action: () => {}, scope: 'global' },
    { key: 'g t', description: 'Go to Time Tracking', action: () => {}, scope: 'global' },
    // Actions
    { key: 'n', modifiers: ['ctrl'], description: 'Create new item', action: () => {}, scope: 'page' },
    { key: 's', modifiers: ['alt'], description: 'Toggle timer', action: () => {}, scope: 'page' },
  ];
}
