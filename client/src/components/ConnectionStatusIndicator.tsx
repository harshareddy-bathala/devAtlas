/**
 * ConnectionStatusIndicator - Shows network connection status
 * 
 * Features:
 * - Real-time online/offline status
 * - Backend connectivity status
 * - Pending sync indicator
 * - Manual sync trigger
 */

import { useState } from 'react';
import { 
  Cloud, 
  CloudOff, 
  WifiOff, 
  RefreshCw, 
  Check, 
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useConnection } from '../contexts/ConnectionContext';

interface ConnectionStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ConnectionStatusIndicator({ 
  className = '',
  showDetails = false 
}: ConnectionStatusIndicatorProps) {
  const { 
    isOnline, 
    isBackendReachable, 
    pendingOperations, 
    isSyncing, 
    lastSyncTime,
    connectionQuality,
    retryPendingOperations 
  } = useConnection();

  const [expanded, setExpanded] = useState(false);

  // Determine overall status
  const getStatus = () => {
    if (!isOnline) return 'offline';
    if (!isBackendReachable) return 'backend-unreachable';
    if (isSyncing) return 'syncing';
    if (pendingOperations.length > 0) return 'pending';
    return 'connected';
  };

  const status = getStatus();

  // Status configurations
  const statusConfig = {
    offline: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      description: 'No internet connection. Changes will be saved locally.',
    },
    'backend-unreachable': {
      icon: CloudOff,
      label: 'Server Unreachable',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      description: 'Cannot connect to server. Will retry automatically.',
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing...',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Synchronizing your changes.',
    },
    pending: {
      icon: Cloud,
      label: 'Pending Changes',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      description: `${pendingOperations.length} change${pendingOperations.length > 1 ? 's' : ''} waiting to sync.`,
    },
    connected: {
      icon: Check,
      label: 'Connected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      description: 'All changes synced.',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Don't show if fully connected with no pending changes and not in details mode
  if (status === 'connected' && !showDetails && !expanded) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 ${className}`}
    >
      {/* Collapsed View */}
      <div 
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer
          ${config.bgColor} ${config.borderColor} border backdrop-blur-sm
          transition-all duration-200 hover:shadow-xl
        `}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon 
          className={`w-4 h-4 ${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`} 
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        
        {pendingOperations.length > 0 && status !== 'syncing' && (
          <span className="text-xs bg-dark-600 px-1.5 py-0.5 rounded text-light-400">
            {pendingOperations.length}
          </span>
        )}
        
        {showDetails && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-light-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-light-500" />
          )
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div 
          className={`
            mt-2 p-4 rounded-lg shadow-xl border
            bg-dark-800/95 border-dark-600 backdrop-blur-sm
            animate-fade-in-up min-w-[280px]
          `}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2 rounded ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white">{config.label}</h4>
              <p className="text-xs text-light-500 mt-0.5">{config.description}</p>
            </div>
          </div>

          {/* Connection Quality */}
          <div className="flex items-center justify-between text-xs text-light-500 mb-2">
            <span>Connection Quality</span>
            <span className={`font-medium ${
              connectionQuality === 'good' ? 'text-green-400' :
              connectionQuality === 'slow' ? 'text-yellow-400' :
              connectionQuality === 'poor' ? 'text-orange-400' :
              'text-red-400'
            }`}>
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
            </span>
          </div>

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="flex items-center justify-between text-xs text-light-500 mb-3">
              <span>Last Synced</span>
              <span>{formatRelativeTime(lastSyncTime)}</span>
            </div>
          )}

          {/* Pending Operations */}
          {pendingOperations.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-light-500 mb-2">Pending Changes</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pendingOperations.slice(0, 5).map((op) => (
                  <div 
                    key={op.id}
                    className="flex items-center gap-2 text-xs py-1 px-2 bg-dark-700 rounded"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      op.type === 'create' ? 'bg-green-400' :
                      op.type === 'update' ? 'bg-blue-400' :
                      'bg-red-400'
                    }`} />
                    <span className="text-light-400 capitalize">{op.type}</span>
                    <span className="text-light-500">{op.collection}</span>
                    {op.retryCount > 0 && (
                      <span className="text-orange-400 ml-auto">
                        Retry {op.retryCount}/{op.maxRetries}
                      </span>
                    )}
                  </div>
                ))}
                {pendingOperations.length > 5 && (
                  <div className="text-xs text-light-500 text-center py-1">
                    +{pendingOperations.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {(status === 'pending' || status === 'backend-unreachable') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                retryPendingOperations();
              }}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default ConnectionStatusIndicator;
