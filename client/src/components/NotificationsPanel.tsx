/**
 * NotificationsPanel - Displays and manages notifications
 * 
 * Features:
 * - Notification dropdown
 * - Mark as read
 * - Action buttons
 * - Settings
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  CheckCheck, 
  Settings, 
  Clock,
  Target,
  Flame,
  Award,
  Info,
  X,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../contexts/NotificationsContext';

interface NotificationsPanelProps {
  className?: string;
}

export function NotificationsPanel({ className = '' }: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    settings,
    updateSettings,
    hasPermission,
    requestPermission
  } = useNotifications();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get icon for notification type
  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reminder': return Clock;
      case 'streak': return Flame;
      case 'achievement': return Award;
      case 'deadline': return Target;
      default: return Info;
    }
  };

  // Get color for notification type
  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'reminder': return 'text-blue-400 bg-blue-500/10';
      case 'streak': return 'text-orange-400 bg-orange-500/10';
      case 'achievement': return 'text-green-400 bg-green-500/10';
      case 'deadline': return 'text-red-400 bg-red-500/10';
      default: return 'text-purple-400 bg-purple-500/10';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-dark-700 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-light-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {showSettings ? (
            /* Settings View */
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
                <h3 className="font-semibold text-white">Notification Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-dark-600 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-light-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Enable Notifications */}
                <label className="flex items-center justify-between">
                  <span className="text-sm text-light-300">Enable Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => updateSettings({ enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                  />
                </label>

                {/* Browser Notifications */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-light-300">Browser Notifications</span>
                  {hasPermission ? (
                    <span className="text-xs text-green-400">Enabled</span>
                  ) : (
                    <button
                      onClick={requestPermission}
                      className="text-xs text-accent-primary hover:text-accent-primary-hover"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {/* Inactivity Days */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-light-300">Remind after inactive days</span>
                  <select
                    value={settings.inactivityDays}
                    onChange={(e) => updateSettings({ inactivityDays: parseInt(e.target.value) })}
                    className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-light-300"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>

                {/* Streak Reminder */}
                <label className="flex items-center justify-between">
                  <span className="text-sm text-light-300">Streak Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.streakReminder}
                    onChange={(e) => updateSettings({ streakReminder: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                  />
                </label>

                {/* Goal Deadlines */}
                <label className="flex items-center justify-between">
                  <span className="text-sm text-light-300">Goal Deadline Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.goalDeadlines}
                    onChange={(e) => updateSettings({ goalDeadlines: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Notifications List View */
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
                <h3 className="font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4 text-light-500" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 text-light-500" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <BellOff className="w-10 h-10 text-light-500/50 mx-auto mb-3" />
                    <p className="text-sm text-light-500">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dark-600">
                    {notifications.map(notification => {
                      const Icon = getTypeIcon(notification.type);
                      const colorClass = getTypeColor(notification.type);
                      
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 hover:bg-dark-700/50 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-dark-700/30' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium ${notification.read ? 'text-light-400' : 'text-white'}`}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-accent-primary flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-light-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-light-500">
                                  {formatTime(notification.createdAt)}
                                </span>
                                {notification.actionLabel && (
                                  <span className="flex items-center gap-1 text-xs text-accent-primary">
                                    {notification.actionLabel}
                                    <ChevronRight className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-dark-600">
                  <button
                    onClick={clearNotifications}
                    className="w-full text-center text-sm text-light-500 hover:text-light-300 transition-colors"
                  >
                    Clear all notifications
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
