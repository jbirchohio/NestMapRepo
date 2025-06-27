import React, { ComponentType, Suspense, lazy, Component, ErrorInfo } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
/**
 * Error boundary component to catch JavaScript errors in child components
 */
interface ErrorBoundaryProps {
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | undefined;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: undefined };
    }
    
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }
    
    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }
    override render() {
        if (this.state.hasError) {
            return (this.props.fallback || (<div className="p-4 text-center space-y-2">
            <h6 className="text-red-600 font-semibold">Something went wrong</h6>
            <p className="text-sm">{this.state.error?.message}</p>
            <Button onClick={() => this.setState({ hasError: false, error: undefined })}>
              Try Again
            </Button>
          </div>));
        }
        return this.props.children;
    }
}
/**
 * Loading component with optional message
 */
const LoadingFallback: React.FC<{
    message?: string;
}> = ({ message = 'Loading...', }) => (<div className="flex flex-col items-center justify-center min-h-[200px] space-y-2">
    <LoadingSpinner />
    <p className="text-sm">{message}</p>
  </div>);
/**
 * Type for dynamic import function that returns a promise of a component
 * @template T - The type of props the component expects (defaults to empty object)
 */
type ImportFunc<T = Record<string, unknown>> = () => Promise<{
    default: ComponentType<T>;
}>;
/**
 * Higher-order component for code-splitting with loading and error boundaries
 * @param importFunc Function that returns a dynamic import()
 * @param options Options for the async component
 * @returns A lazy-loaded component with error and loading boundaries
 */
/**
 * Higher-order component for code-splitting with loading and error boundaries
 * @template T - The type of props the wrapped component expects (defaults to empty object)
 * @param importFunc - Function that returns a dynamic import()
 * @param options - Options for the async component
 * @returns A lazy-loaded component with error and loading boundaries
 */
function asyncComponent<T = Record<string, unknown>>(
  importFunc: ImportFunc<T>,
  options: {
    loading?: React.ReactNode;
    error?: React.ReactNode;
} = {}) {
    const LazyComponent = lazy(importFunc);
    const AsyncComponent: React.FC<T> = (props) => (<ErrorBoundary fallback={options.error}>
      <Suspense fallback={options.loading || <LoadingFallback />}>
        <LazyComponent {...(props as React.ComponentProps<typeof LazyComponent>)} />
      </Suspense>
    </ErrorBoundary>);
    // Set a display name for better debugging
    const name = importFunc.name || 'Component';
    AsyncComponent.displayName = `Async(${name})`;
    return AsyncComponent;
}
export { asyncComponent, ErrorBoundary, LoadingFallback };
