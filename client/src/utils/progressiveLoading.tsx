// Phase 3: Progressive Loading System
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

/**
 * Progressive loading states for complex components
 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  RETRYING = 'retrying'
}

/**
 * Loading priority levels for resource management
 */
export enum LoadingPriority {
  CRITICAL = 'critical',    // Above the fold, immediate
  HIGH = 'high',           // Important for user experience
  MEDIUM = 'medium',       // Secondary content
  LOW = 'low',            // Background loading
  IDLE = 'idle'           // Load when browser is idle
}

/**
 * Resource types for optimal loading strategies
 */
export enum ResourceType {
  COMPONENT = 'component',
  DATA = 'data',
  IMAGE = 'image',
  SCRIPT = 'script',
  STYLE = 'style'
}

interface LoadingResource {
  id: string;
  type: ResourceType;
  priority: LoadingPriority;
  loader: () => Promise<any>;
  dependencies?: string[];
  timeout?: number;
  retryAttempts?: number;
  cacheKey?: string;
}

interface LoadingResult {
  id: string;
  state: LoadingState;
  data?: any;
  error?: Error;
  loadTime?: number;
  attempts?: number;
}

/**
 * Progressive loading manager for production-ready performance
 * Implements intelligent resource loading with priorities and dependencies
 */
class ProgressiveLoadingManager {
  private resources = new Map<string, LoadingResource>();
  private results = new Map<string, LoadingResult>();
  private loading = new Set<string>();
  private listeners = new Set<(results: Map<string, LoadingResult>) => void>();
  private abortControllers = new Map<string, AbortController>();
  private intersectionObserver?: IntersectionObserver;
  private priorityQueues = new Map<LoadingPriority, string[]>();

  constructor() {
    this.initializePriorityQueues();
    this.setupIntersectionObserver();
    this.scheduleIdleLoading();
  }

  /**
   * Initialize priority queues for resource management
   */
  private initializePriorityQueues(): void {
    Object.values(LoadingPriority).forEach(priority => {
      this.priorityQueues.set(priority, []);
    });
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const resourceId = entry.target.getAttribute('data-resource-id');
            if (resourceId && this.resources.has(resourceId)) {
              this.loadResource(resourceId);
              this.intersectionObserver?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );
  }

  /**
   * Schedule idle loading for low-priority resources
   */
  private scheduleIdleLoading(): void {
    if (typeof requestIdleCallback === 'undefined') return;

    const processIdleQueue = () => {
      const idleQueue = this.priorityQueues.get(LoadingPriority.IDLE) || [];
      if (idleQueue.length > 0) {
        const resourceId = idleQueue.shift();
        if (resourceId) {
          this.loadResource(resourceId);
          this.priorityQueues.set(LoadingPriority.IDLE, idleQueue);
        }
      }
      
      // Schedule next idle callback
      requestIdleCallback(processIdleQueue, { timeout: 5000 });
    };

    requestIdleCallback(processIdleQueue);
  }

  /**
   * Register a resource for progressive loading
   */
  registerResource(resource: LoadingResource): void {
    this.resources.set(resource.id, resource);
    
    // Add to appropriate priority queue
    const queue = this.priorityQueues.get(resource.priority) || [];
    queue.push(resource.id);
    this.priorityQueues.set(resource.priority, queue);

    // Initialize result
    this.results.set(resource.id, {
      id: resource.id,
      state: LoadingState.IDLE,
      attempts: 0
    });

    this.notifyListeners();
  }

  /**
   * Load resource with intelligent prioritization
   */
  async loadResource(resourceId: string): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource || this.loading.has(resourceId)) return;

    // Check dependencies
    if (resource.dependencies) {
      const unmetDependencies = resource.dependencies.filter(dep => {
        const depResult = this.results.get(dep);
        return !depResult || depResult.state !== LoadingState.SUCCESS;
      });

      if (unmetDependencies.length > 0) {
        // Load dependencies first
        await Promise.all(unmetDependencies.map(dep => this.loadResource(dep)));
      }
    }

    this.loading.add(resourceId);
    const abortController = new AbortController();
    this.abortControllers.set(resourceId, abortController);

    const result = this.results.get(resourceId)!;
    result.state = LoadingState.LOADING;
    this.notifyListeners();

    const startTime = performance.now();

    try {
      // Setup timeout if specified
      const timeoutPromise = resource.timeout 
        ? new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Loading timeout')), resource.timeout)
          )
        : null;

      // Load the resource
      const loadPromise = resource.loader();
      const data = timeoutPromise 
        ? await Promise.race([loadPromise, timeoutPromise])
        : await loadPromise;

      // Check if aborted
      if (abortController.signal.aborted) return;

      result.state = LoadingState.SUCCESS;
      result.data = data;
      result.loadTime = performance.now() - startTime;

    } catch (error) {
      if (abortController.signal.aborted) return;

      result.error = error as Error;
      result.attempts = (result.attempts || 0) + 1;
      
      // Retry logic
      const maxRetries = resource.retryAttempts || 3;
      if (result.attempts < maxRetries) {
        result.state = LoadingState.RETRYING;
        this.notifyListeners();
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, result.attempts - 1), 10000);
        setTimeout(() => this.loadResource(resourceId), delay);
      } else {
        result.state = LoadingState.ERROR;
      }
    } finally {
      this.loading.delete(resourceId);
      this.abortControllers.delete(resourceId);
      this.notifyListeners();
    }
  }

  /**
   * Load resources by priority
   */
  async loadByPriority(priority: LoadingPriority): Promise<void> {
    const queue = this.priorityQueues.get(priority) || [];
    const promises = queue.map(resourceId => this.loadResource(resourceId));
    await Promise.all(promises);
  }

  /**
   * Preload critical resources
   */
  async preloadCritical(): Promise<void> {
    await this.loadByPriority(LoadingPriority.CRITICAL);
    await this.loadByPriority(LoadingPriority.HIGH);
  }

  /**
   * Cancel resource loading
   */
  cancelResource(resourceId: string): void {
    const abortController = this.abortControllers.get(resourceId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(resourceId);
    }
    
    this.loading.delete(resourceId);
    
    const result = this.results.get(resourceId);
    if (result) {
      result.state = LoadingState.IDLE;
      this.notifyListeners();
    }
  }

  /**
   * Get resource result
   */
  getResult(resourceId: string): LoadingResult | undefined {
    return this.results.get(resourceId);
  }

  /**
   * Get all results
   */
  getAllResults(): Map<string, LoadingResult> {
    return new Map(this.results);
  }

  /**
   * Subscribe to loading updates
   */
  subscribe(listener: (results: Map<string, LoadingResult>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Observe element for lazy loading
   */
  observeElement(element: Element, resourceId: string): void {
    if (!this.intersectionObserver) return;
    
    element.setAttribute('data-resource-id', resourceId);
    this.intersectionObserver.observe(element);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getAllResults()));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Cancel all loading operations
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    // Clear observers
    this.intersectionObserver?.disconnect();
    
    // Clear collections
    this.resources.clear();
    this.results.clear();
    this.loading.clear();
    this.listeners.clear();
    this.priorityQueues.clear();
  }
}

// Global loading manager instance
export const loadingManager = new ProgressiveLoadingManager();

/**
 * React hook for progressive loading
 */
export function useProgressiveLoading(
  resources: LoadingResource[],
  autoLoad: boolean = true
) {
  const [results, setResults] = useState<Map<string, LoadingResult>>(new Map());

  useEffect(() => {
    // Register resources
    resources.forEach(resource => {
      loadingManager.registerResource(resource);
    });

    // Subscribe to updates
    const unsubscribe = loadingManager.subscribe(setResults);

    // Auto-load critical resources
    if (autoLoad) {
      loadingManager.preloadCritical();
    }

    return () => {
      unsubscribe();
      // Optionally cancel non-critical loading on unmount
      resources.forEach(resource => {
        if (resource.priority === LoadingPriority.LOW || resource.priority === LoadingPriority.IDLE) {
          loadingManager.cancelResource(resource.id);
        }
      });
    };
  }, [resources, autoLoad]);

  const loadResource = useCallback((resourceId: string) => {
    loadingManager.loadResource(resourceId);
  }, []);

  const cancelResource = useCallback((resourceId: string) => {
    loadingManager.cancelResource(resourceId);
  }, []);

  const getResourceState = useCallback((resourceId: string): LoadingState => {
    return results.get(resourceId)?.state || LoadingState.IDLE;
  }, [results]);

  const getResourceData = useCallback((resourceId: string): any => {
    return results.get(resourceId)?.data;
  }, [results]);

  const getResourceError = useCallback((resourceId: string): Error | undefined => {
    return results.get(resourceId)?.error;
  }, [results]);

  return {
    results: Array.from(results.values()),
    loadResource,
    cancelResource,
    getResourceState,
    getResourceData,
    getResourceError
  };
}

/**
 * Progressive loading component for visual feedback
 */
interface ProgressiveLoaderProps {
  resourceId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  className?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = React.memo(({
  resourceId,
  children,
  fallback,
  errorFallback,
  className = ''
}) => {
  const { getResourceState, getResourceError } = useProgressiveLoading([]);
  const state = getResourceState(resourceId);
  const error = getResourceError(resourceId);

  const renderContent = () => {
    switch (state) {
      case LoadingState.IDLE:
      case LoadingState.LOADING:
      case LoadingState.RETRYING:
        return fallback || (
          <div className={`flex items-center justify-center p-4 ${className}`}>
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">
              {state === LoadingState.RETRYING ? 'Retrying...' : 'Loading...'}
            </span>
          </div>
        );

      case LoadingState.SUCCESS:
        return children;

      case LoadingState.ERROR:
        return errorFallback || (
          <div className={`flex items-center justify-center p-4 text-red-600 ${className}`}>
            <AlertCircle className="w-6 h-6" />
            <span className="ml-2">Failed to load: {error?.message}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
});

/**
 * Lazy loading wrapper with intersection observer
 */
interface LazyLoadWrapperProps {
  resourceId: string;
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = React.memo(({
  resourceId,
  children,
  className = '',
  placeholder
}) => {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const { getResourceState } = useProgressiveLoading([]);
  const state = getResourceState(resourceId);

  useEffect(() => {
    if (elementRef.current && state === LoadingState.IDLE) {
      loadingManager.observeElement(elementRef.current, resourceId);
    }
  }, [resourceId, state]);

  return (
    <div ref={elementRef} className={className}>
      {state === LoadingState.SUCCESS ? children : (
        placeholder || (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
            <Clock className="w-8 h-8 text-gray-400" />
            <span className="ml-2 text-gray-500">Loading when visible...</span>
          </div>
        )
      )}
    </div>
  );
});

ProgressiveLoader.displayName = 'ProgressiveLoader';
LazyLoadWrapper.displayName = 'LazyLoadWrapper';
