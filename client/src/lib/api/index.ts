export * from './client';

export type { ApiConfig } from '@shared/api';

// Re-export API endpoints if they exist
try {
  const { API_ENDPOINTS } = await import('../constants/api-endpoints');
  export { API_ENDPOINTS };
} catch (error) {
  console.warn('API endpoints not found. Please create a file at client/src/constants/api-endpoints.ts');
  export const API_ENDPOINTS = {} as const;
}
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const abortError: ApiError = new Error('Request was aborted');
      abortError.code = 'ABORT_ERROR';
      throw abortError;
    }
    throw error;
  }
}

/**
 * Create type-safe API methods for a resource
 */
export function createApiClient<T>(resource: string) {
  return {
    get: <R = T>(id?: string | number, config?: Omit<ApiConfig, 'data'>) => {
      const url = id ? `${resource}/${id}` : resource;
      return api<R>(url, 'GET', undefined, config);
    },
    create: <R = T>(data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(resource, 'POST', data, config),
    update: <R = T>(id: string | number, data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(`${resource}/${id}`, 'PUT', data, config),
    patch: <R = T>(id: string | number, data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(`${resource}/${id}`, 'PATCH', data, config),
    delete: (id: string | number, config?: Omit<ApiConfig, 'data'>) =>
      api<void>(`${resource}/${id}`, 'DELETE', undefined, config),
  };
}

/**
 * Create a type-safe query hook using React Query
 */
export function createQueryHook<TData, TError = ApiError>(
  key: string | [string, ...unknown[]],
  fetcher: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
) {
  return function useCustomQuery() {
    return useQuery<TData, TError>({
      queryKey: Array.isArray(key) ? key : [key],
      queryFn: fetcher,
      ...options,
    });
  };
}

/**
 * Create a type-safe mutation hook using React Query
 */
export function createMutationHook<TData = unknown, TVariables = void, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  return function useCustomMutation() {
    return useMutation<TData, TError, TVariables>({
      mutationFn,
      ...options,
    });
  };
}
