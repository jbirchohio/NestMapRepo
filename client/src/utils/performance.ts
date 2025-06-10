import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Memoize a component with React.memo and custom comparison function
 * @param Component The component to memoize
 * @param propsAreEqual Custom comparison function (optional)
 * @returns Memoized component
 */
export function memo<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: React.ComponentProps<T>, nextProps: React.ComponentProps<T>) => boolean
) {
  return React.memo(Component, propsAreEqual);
}

/**
 * Custom hook that returns a memoized callback that only changes if one of the dependencies has changed
 * @param callback The callback to memoize
 * @param dependencies Array of dependencies
 * @returns Memoized callback
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[] = []
): T {
  return useCallback(callback, dependencies);
}

/**
 * Custom hook that returns a memoized value that only changes if one of the dependencies has changed
 * @param factory Function that returns the value to memoize
 * @param dependencies Array of dependencies
 * @returns Memoized value
 */
export function useMemoizedValue<T>(
  factory: () => T,
  dependencies: any[] = []
): T {
  return useMemo(factory, dependencies);
}

/**
 * Custom hook that returns a debounced version of the callback
 * @param callback The callback to debounce
 * @param delay Debounce delay in milliseconds
 * @param dependencies Array of dependencies
 * @returns Debounced callback
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: any[] = []
): T {
  const callbackRef = useRef(callback);
  
  // Update callback ref if callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay, { leading: true, trailing: true }),
    [delay, ...dependencies]
  ) as T;
}

/**
 * Custom hook that returns a throttled version of the callback
 * @param callback The callback to throttle
 * @param limit Throttle limit in milliseconds
 * @param dependencies Array of dependencies
 * @returns Throttled callback
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  dependencies: any[] = []
): T {
  const callbackRef = useRef(callback);
  
  // Update callback ref if callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), limit, { leading: true, trailing: true }),
    [limit, ...dependencies]
  ) as T;
}

/**
 * Custom hook that tracks component render count for debugging
 * @param name Component name for identification
 * @returns Current render count
 */
export function useRenderCount(name: string): number {
  const count = useRef(0);
  count.current++;
  
  useEffect(() => {
    console.log(`[Render] ${name}: ${count.current}`);
  });
  
  return count.current;
}

/**
 * Custom hook that measures render time for performance monitoring
 * @param name Identifier for the measurement
 * @returns Object with start and end measurement functions
 */
export function useMeasureRenderTime(name: string) {
  const startTime = useRef(0);
  
  const start = useCallback(() => {
    if (typeof performance !== 'undefined') {
      startTime.current = performance.now();
    }
  }, []);
  
  const end = useCallback(() => {
    if (startTime.current && typeof performance !== 'undefined') {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
  }, [name]);
  
  return { start, end };
}
