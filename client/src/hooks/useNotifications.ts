import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/contexts/AuthContext';
import { api } from '@/lib/api';
import type { SharedNotificationType as Notification } from '@shared/types/notification';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  
  // Fetch notifications query
  const {
    data: serverNotifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) return [];
      return await api(`/notifications?userId=${user.id}`, 'GET');
    },
    enabled: isAuthenticated && !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api(`/notifications/${id}/read`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api('/notifications/read-all', 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Calculate unread count
  const unreadCount = serverNotifications.filter(n => !n.read).length;

  // Mark a notification as read
  const markAsRead = useCallback(async (id: string): Promise<void> => {
    if (!isAuthenticated) return;
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error('Error marking notification as read:', error);
      throw error; // Let the component handle the error
    }
  }, [isAuthenticated, markAsReadMutation]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error('Error marking all notifications as read:', error);
      throw error; // Let the component handle the error
    }
  }, [isAuthenticated, markAllAsReadMutation]);

  // Add a local notification (e.g., for client-side notifications)
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setLocalNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Combine server and local notifications
  const allNotifications = [...serverNotifications, ...localNotifications];

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    error: error ? (error as Error).message : null,
    markAsRead,
    markAllAsRead,
    refetch: async () => {
      await refetch();
    },
    addNotification,
  };
}
export default useNotifications;
