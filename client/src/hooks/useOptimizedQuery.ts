import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  endpoint: string;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
}

/**
 * Optimized React Query hook with intelligent caching
 * Reduces API calls and improves performance for large datasets
 */
export function useOptimizedQuery<T = any>(
  options: OptimizedQueryOptions<T>
): UseQueryResult<T> {
  const {
    endpoint,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000,  // 2 minutes
    refetchOnWindowFocus = false,
    refetchOnMount = false,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return response.json();
    },
    cacheTime,
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions,
  });
}

/**
 * Hook for dashboard data with aggressive caching
 */
export function useSuperadminDashboard() {
  return useOptimizedQuery({
    endpoint: '/api/superadmin/dashboard',
    cacheTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000,   // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook for user permissions with extended caching
 */
export function useUserPermissions() {
  return useOptimizedQuery({
    endpoint: '/api/user/permissions',
    cacheTime: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000,  // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook for notifications with moderate caching
 */
export function useNotifications() {
  return useOptimizedQuery({
    endpoint: '/api/notifications',
    cacheTime: 2 * 60 * 1000,  // 2 minutes
    staleTime: 1 * 60 * 1000,   // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}