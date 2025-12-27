/**
 * NotificationsContext - Notifications and reminders for learning
 * 
 * Features:
 * - Reminders for inactive skills
 * - Learning streak reminders
 * - Goal deadline notifications
 * - Browser push notifications (with permission)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export interface Notification {
  id: string;
  type: 'reminder' | 'achievement' | 'streak' | 'deadline' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface ReminderSettings {
  enabled: boolean;
  inactivityDays: number; // Days before reminding about inactive skills
  streakReminder: boolean; // Remind to maintain streak
  goalDeadlines: boolean; // Remind about upcoming goal deadlines
  quietHoursStart: number; // 0-23
  quietHoursEnd: number; // 0-23
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  settings: ReminderSettings;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  updateSettings: (settings: Partial<ReminderSettings>) => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const NOTIFICATIONS_KEY = 'devOrbit_notifications';
const SETTINGS_KEY = 'devOrbit_notification_settings';
const LAST_CHECK_KEY = 'devOrbit_last_reminder_check';

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  inactivityDays: 7,
  streakReminder: true,
  goalDeadlines: true,
  quietHoursStart: 22,
  quietHoursEnd: 8
};

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  try {
    // Keep only last 50 notifications
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch {}
}

function loadSettings(): ReminderSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications());
  const [settings, setSettings] = useState<ReminderSettings>(loadSettings());
  const [hasPermission, setHasPermission] = useState(false);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Sync notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Sync settings to storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        toast.success('Notifications enabled!');
      } else {
        toast.error('Notification permission denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (!hasPermission || !settings.enabled) return;

    // Check quiet hours
    const hour = new Date().getHours();
    if (settings.quietHoursStart < settings.quietHoursEnd) {
      if (hour >= settings.quietHoursStart && hour < settings.quietHoursEnd) return;
    } else {
      if (hour >= settings.quietHoursStart || hour < settings.quietHoursEnd) return;
    }

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, [hasPermission, settings]);

  // Add a notification
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Also send browser notification for important types
    if (['deadline', 'streak', 'achievement'].includes(notification.type)) {
      sendBrowserNotification(notification.title, notification.message);
    }
  }, [sendBrowserNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<ReminderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Check for reminders periodically
  useEffect(() => {
    if (!settings.enabled) return;

    const checkReminders = async () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();
      
      // Only check once per day
      if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
        return;
      }
      
      localStorage.setItem(LAST_CHECK_KEY, now.toString());

      try {
        // Get skills and check for inactive ones
        const skills = await api.getSkills();
        const skillsList = Array.isArray(skills) ? skills : skills.items || [];
        
        const inactiveSkills = skillsList.filter((skill: any) => {
          if (skill.status !== 'learning') return false;
          
          const updatedAt = new Date(skill.updatedAt || skill.createdAt);
          const daysSinceUpdate = Math.floor(
            (now - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return daysSinceUpdate >= settings.inactivityDays;
        });

        // Create reminders for inactive skills
        inactiveSkills.slice(0, 3).forEach((skill: any) => {
          addNotification({
            type: 'reminder',
            title: 'Continue Learning',
            message: `It's been a while since you worked on ${skill.name}. Ready to continue?`,
            actionUrl: '/stack',
            actionLabel: 'View Skills'
          });
        });

        // Check for goal deadlines
        if (settings.goalDeadlines) {
          const goals = JSON.parse(localStorage.getItem('devOrbit_goals') || '[]');
          const upcomingGoals = goals.filter((goal: any) => {
            if (goal.status !== 'active') return false;
            const daysUntil = Math.ceil(
              (new Date(goal.targetDate).getTime() - now) / (1000 * 60 * 60 * 24)
            );
            return daysUntil > 0 && daysUntil <= 7;
          });

          upcomingGoals.forEach((goal: any) => {
            const daysUntil = Math.ceil(
              (new Date(goal.targetDate).getTime() - now) / (1000 * 60 * 60 * 24)
            );
            addNotification({
              type: 'deadline',
              title: 'Goal Deadline Approaching',
              message: `"${goal.title}" is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
              actionUrl: '/dashboard',
              actionLabel: 'View Goal'
            });
          });
        }

      } catch (error) {
        console.error('Failed to check reminders:', error);
      }
    };

    // Check on mount and every hour
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    updateSettings,
    requestPermission,
    hasPermission
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

export default NotificationsContext;
