import { QueryClient } from '@tanstack/react-query';

// Define a basic error type that matches our API error structure
interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Default query client configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        // Don't retry for 4xx errors, only retry 5xx errors
        if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    },
    mutations: {
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        // Don't retry mutations for 4xx errors
        if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
    },
  },
});

/**
 * Creates a new query client instance with custom configuration
 */
export const createQueryClient = (config?: ConstructorParameters<typeof QueryClient>[0]) => {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...queryClient.getDefaultOptions(),
      ...config?.defaultOptions,
    },
  });
};

export default queryClient;
