import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types/notification';
import { useAuth } from './useAuth';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Replace with actual API call
      const response = await fetch(`/api/notifications?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const markAsRead = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    try {
      // Optimistic update
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );

      // API call
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Optimistic update
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true,
        }))
      );

      // API call
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Set up WebSocket or polling for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications`);
    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        addNotification(notification);
      } catch {
        console.error('Invalid notification message');
      }
    };
    return () => ws.close();
  }, [fetchNotifications, isAuthenticated, addNotification]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    addNotification,
  };
}

export default useNotifications;
