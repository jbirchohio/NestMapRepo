import { useMemo } from 'react';

/**
 * Memoize a function's result based on its arguments
 * @param fn The function to memoize
 * @param keyFn Optional function to generate a cache key from arguments
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => any
): T {
  const cache = new Map<any, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * React hook for memoizing expensive calculations
 * @param factory Function that returns the value to memoize
 * @param deps Array of dependencies
 * @param options Configuration options
 * @returns Memoized value
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: any[],
  options: { maxSize?: number; equalityFn?: (a: any, b: any) => boolean } = {}
): T {
  const { maxSize = 100, equalityFn } = options;
  
  return useMemo(() => {
    const value = factory();
    
    // Simple cache implementation for demonstration
    // In a real app, consider using a more robust solution like lru-cache
    const cache = new Map<string, T>();
    const cacheKeys: string[] = [];
    
    const cacheKey = JSON.stringify(deps);
    
    if (cache.has(cacheKey)) {
      const cachedValue = cache.get(cacheKey)!;
      
      // Use custom equality function if provided
      if (equalityFn && equalityFn(cachedValue, value)) {
        return cachedValue;
      }
      
      // Default shallow equality check
      if (cachedValue === value) {
        return cachedValue;
      }
    }
    
    // Add to cache
    cache.set(cacheKey, value);
    cacheKeys.push(cacheKey);
    
    // Enforce max cache size
    while (cache.size > maxSize && cacheKeys.length > 0) {
      const keyToRemove = cacheKeys.shift()!;
      cache.delete(keyToRemove);
    }
    
    return value;
  }, deps);
}

/**
 * Memoize a component with React.memo and custom props comparison
 * @param Component The component to memoize
 * @param areEqual Custom comparison function (optional)
 * @returns Memoized component
 */
export function memo<T extends React.ComponentType<any>>(
  Component: T,
  areEqual?: (prevProps: React.ComponentProps<T>, nextProps: React.ComponentProps<T>) => boolean
) {
  return React.memo(Component, areEqual);
}

/**
 * Memoize a value with a custom equality function
 * @param value The value to memoize
 * @param equalityFn Function to compare previous and next values
 * @returns Memoized value
 */
export function useDeepCompareMemo<T>(
  value: T,
  equalityFn: (a: T, b: T) => boolean = Object.is
) {
  const ref = useRef<T>(value);
  
  if (!equalityFn(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Memoize a function with a custom equality function for its dependencies
 * @param fn The function to memoize
 * @param deps Array of dependencies
 * @param equalityFn Function to compare dependency arrays
 * @returns Memoized function
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  fn: T,
  deps: any[],
  equalityFn: (a: any[], b: any[]) => boolean = (a, b) =>
    a.length === b.length && a.every((val, i) => Object.is(val, b[i]))
): T {
  const ref = useRef<{ deps: any[]; fn: T }>({ deps: [], fn });
  
  if (!equalityFn(ref.current.deps, deps)) {
    ref.current = { deps, fn };
  }
  
  return ref.current.fn;
}
