/**
 * SyncStatusBar - Shows sync status and offline indicator
 * 
 * Features:
 * - Shows when user is offline
 * - Shows pending sync count
 * - Shows sync in progress
 * - Allows manual sync trigger
 */

import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useServiceWorker } from '../hooks/useServiceWorker';

interface SyncStatusBarProps {
  className?: string;
}

export function SyncStatusBar({ className = '' }: SyncStatusBarProps) {
  const { isOnline, pendingMutations, lastSyncTime, forcSync } = useServiceWorker();

  // Don't show if online with no pending changes
  if (isOnline && pendingMutations === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg transition-all ${
        isOnline
          ? 'bg-dark-800 border border-dark-600'
          : 'bg-yellow-900/80 border border-yellow-600'
      } ${className}`}
    >
      {!isOnline ? (
        <>
          <CloudOff className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-200">You're offline</span>
          {pendingMutations > 0 && (
            <span className="text-xs text-yellow-400">
              ({pendingMutations} pending)
            </span>
          )}
        </>
      ) : pendingMutations > 0 ? (
        <>
          <Cloud className="w-4 h-4 text-accent-primary animate-pulse" />
          <span className="text-sm text-light-300">
            {pendingMutations} pending change{pendingMutations > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => forcSync()}
            className="p-1 hover:bg-dark-600 rounded transition-colors"
            title="Sync now"
          >
            <RefreshCw className="w-4 h-4 text-light-400" />
          </button>
        </>
      ) : lastSyncTime ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-light-500">
            Synced {formatRelativeTime(lastSyncTime)}
          </span>
        </>
      ) : null}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default SyncStatusBar;
