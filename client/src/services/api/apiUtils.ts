import SharedParamsType from '@/types/SharedParamsType';
import SharedArgsType from '@/types/SharedArgsType';
import SharedErrorType from '@shared/schema/types/SharedErrorType';
import { apiClient } from './apiClient';
import axios from 'axios';
/**
 * Utility functions for handling API responses and common patterns
 */
/**
 * Handles API errors consistently across the application
 * @param error The error object from a try-catch block
 * @param defaultMessage Default error message if none is provided
 * @returns An object containing the error message and status code
 */
export function handleApiError(error: SharedErrorType, defaultMessage = 'An unexpected error occurred'): {
    message: string;
    status?: number;
} {
    if (typeof error === 'string') {
        return { message: error };
    }
    const axiosError = error as {
        response?: {
            data?: unknown;
            status?: number;
        };
    };
    if (axiosError?.response) {
        const { data, status } = axiosError.response;
        // Handle different error response formats
        if (typeof data === 'string') {
            return { message: data, status };
        }
        else if (data?.message) {
            return { message: data.message, status };
        }
        else if (data?.error) {
            return { message: data.error, status };
        }
    }
    return { message: defaultMessage, status: 500 };
}
/**
 * Creates a cancellable request that can be aborted
 * @returns An object containing the request promise and an abort function
 */
export function createCancellableRequest<T>(request: (signal: AbortSignal) => Promise<T>): {
    promise: Promise<T>;
    abort: () => void;
} {
    const controller = new AbortController();
    return {
        promise: request(controller.signal),
        abort: () => controller.abort(),
    };
}
/**
 * Creates a debounced version of an API call
 * @param func The API function to debounce
 * @param wait Time to wait in milliseconds
 * @returns Debounced function
 */
export function debounceApi<T extends (...args: SharedArgsType[]) => ReturnType<T>>(func: T, wait: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingPromise: ReturnType<T> | null = null;
    
    return ((...args: Parameters<T>): ReturnType<T> => {
        // Cancel any pending timeouts
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Cancel any pending requests if they support it
        if (pendingPromise) {
            const controller = new AbortController();
            controller.abort('debounced');
        }
        
        // Create a new promise that will be resolved after the debounce time
        return new Promise((resolve, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    pendingPromise = func(...args);
                    const result = await pendingPromise;
                    resolve(result as Awaited<ReturnType<T>>);
                } catch (error) {
                    // Check if the error is from a cancelled request
                    if (!axios.isCancel(error)) {
                        reject(error);
                    }
                } finally {
                    pendingPromise = null;
                }
            }, wait);
        }) as ReturnType<T>;
    }) as T;
}
/**
 * Helper function to handle paginated API responses
 * @param fetchFunction Function that makes the API call
 * @param params Pagination parameters
 * @returns Paginated response with helper methods
 */
export async function fetchPaginated<T>(fetchFunction: (params: SharedParamsType) => Promise<{
    data: T[];
    total: number;
}>, params: {
    page: number;
    limit: number;
    [key: string]: unknown;
} = { page: 1, limit: 10 }) {
    const response = await fetchFunction(params);
    return {
        ...response,
        totalPages: Math.ceil(response.total / params.limit),
        hasNextPage: params.page * params.limit < response.total,
        hasPreviousPage: params.page > 1,
        nextPage: () => {
            if (params.page * params.limit >= response.total)
                return null;
            return fetchPaginated(fetchFunction, { ...params, page: params.page + 1 });
        },
        previousPage: () => {
            if (params.page <= 1)
                return null;
            return fetchPaginated(fetchFunction, { ...params, page: params.page - 1 });
        },
    };
}
/**
 * Helper to create query parameters from an object
 * @param params Object with query parameters
 * @returns URL-encoded query string
 */
export function createQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                value.forEach(item => searchParams.append(key, String(item)));
            }
            else if (value instanceof Date) {
                searchParams.append(key, value.toISOString());
            }
            else if (typeof value === 'object') {
                searchParams.append(key, JSON.stringify(value));
            }
            else {
                searchParams.append(key, String(value));
            }
        }
    });
    return searchParams.toString();
}
/**
 * Helper to create URL with query parameters
 * @param baseUrl Base URL
 * @param params Query parameters
 * @returns Full URL with query parameters
 */
export function createUrlWithParams(baseUrl: string, params: Record<string, any>): string {
    const queryString = createQueryParams(params);
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
/**
 * Helper to handle API responses with loading and error states
 * @param apiCall The API function to call
 * @returns An object with data, loading, and error states
 */
export async function withApiState<T>(apiCall: () => Promise<T>) {
    let data: T | null = null;
    let error: Error | null = null;
    let isLoading = true;
    try {
        data = await apiCall();
    }
    catch (err) {
        error = err as Error;
    }
    finally {
        isLoading = false;
    }
    return { data, error, isLoading };
}
/**
 * Helper to create a cache key for API requests
 * @param prefix Cache key prefix
 * @param params Request parameters
 * @returns A unique cache key string
 */
export function createCacheKey(prefix: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
        if (value === undefined || value === null)
            return '';
        return `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`;
    })
        .filter(Boolean)
        .join('&');
    return `${prefix}?${sortedParams}`;
}
/**
 * Helper to handle concurrent API requests with a concurrency limit
 * @param tasks Array of async functions that return promises
 * @param concurrency Maximum number of concurrent requests
 * @returns Promise that resolves when all tasks are complete
 */
export async function runConcurrent<T>(tasks: (() => Promise<T>)[], concurrency = 5): Promise<T[]> {
    const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
    const executing = new Set<Promise<void>>();
    let currentIndex = 0;

    const execute = async (taskIndex: number): Promise<void> => {
        if (taskIndex >= tasks.length) return;
        
        const task = tasks[taskIndex];
        if (!task) return;
        
        try {
            const result = await task();
            results[taskIndex] = result;
        } catch (error) {
            console.error(`Error in task ${taskIndex}:`, error);
            throw error;
        }
        
        // Start the next task if there are more
        if (currentIndex < tasks.length) {
            const nextIndex = currentIndex++;
            const nextTask = execute(nextIndex);
            executing.add(nextTask);
            nextTask.finally(() => executing.delete(nextTask));
        }
    };

    // Start initial set of concurrent tasks
    const initialTasks = [];
    const initialCount = Math.min(concurrency, tasks.length);
    
    for (let i = 0; i < initialCount; i++) {
        if (currentIndex >= tasks.length) break;
        const taskIndex = currentIndex++;
        const task = execute(taskIndex);
        executing.add(task);
        task.finally(() => executing.delete(task));
        initialTasks.push(task);
    }

    // Wait for all tasks to complete
    await Promise.all(Array.from(executing));
    return results as T[];
}
