import { useQuery, useMutation } from '@tanstack/react-query';
import type { 
  UseQueryOptions, 
  UseMutationOptions, 
  QueryKey, 
  QueryFunction,
  MutationFunction,
  UseMutationResult,
  UseQueryResult
} from '@tanstack/react-query';

/**
 * Create a type-safe query hook using React Query
 * @template TData The type of data returned by the query
 * @template TError The type of error that might be thrown
 * @param {QueryKey} queryKey - The query key
 * @param {QueryFunction<TData>} queryFn - The function that returns the data
 * @param {Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>} [options] - Additional query options
 * @returns {() => UseQueryResult<TData, TError>} A hook that returns the query result
 */
export function createQueryHook<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
): () => UseQueryResult<TData, TError> {
  return function useCustomQuery(
    hookOptions: Partial<UseQueryOptions<TData, TError>> = {}
  ): UseQueryResult<TData, TError> {
    return useQuery<TData, TError>({
      queryKey,
      queryFn,
      ...options,
      ...hookOptions,
    });
  };
}

/**
 * Create a type-safe mutation hook using React Query
 * @template TData The type of data returned by the mutation
 * @template TVariables The type of variables passed to the mutation function
 * @template TError The type of error that might be thrown
 * @param {MutationFunction<TData, TVariables>} mutationFn - The mutation function
 * @param {Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>} [options] - Additional mutation options
 * @returns {() => UseMutationResult<TData, TError, TVariables>} A hook that returns the mutation result and helpers
 */
export function createMutationHook<TData = void, TVariables = void, TError = Error>(
  mutationFn: MutationFunction<TData, TVariables>,
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
): () => UseMutationResult<TData, TError, TVariables> {
  return function useCustomMutation(
    hookOptions: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
  ): UseMutationResult<TData, TError, TVariables> {
    return useMutation<TData, TError, TVariables>({
      ...options,
      ...hookOptions,
      mutationFn,
    });
  };
}
