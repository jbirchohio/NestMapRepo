import React, { ComponentType, Suspense, lazy, Component, ErrorInfo } from 'react';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

/**
 * Error boundary component to catch JavaScript errors in child components
 */
class ErrorBoundary extends Component<
  { fallback?: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Box p={4} textAlign="center">
            <Typography color="error" variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              {this.state.error?.message}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>
          </Box>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Loading component with optional message
 */
const LoadingFallback: React.FC<{ message?: string }> = ({
  message = 'Loading...',
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
  >
    <CircularProgress />
    <Box mt={2}>
      <Typography variant="body1">{message}</Typography>
    </Box>
  </Box>
);

type ImportFunc<T = any> = () => Promise<{ default: ComponentType<T> }>;

/**
 * Higher-order component for code-splitting with loading and error boundaries
 * @param importFunc Function that returns a dynamic import()
 * @param options Options for the async component
 * @returns A lazy-loaded component with error and loading boundaries
 */
function asyncComponent<T = any>(
  importFunc: ImportFunc<T>,
  options: {
    loading?: React.ReactNode;
    error?: React.ReactNode;
  } = {}
) {
  const LazyComponent = lazy(importFunc);

  const AsyncComponent: React.FC<T> = (props) => (
    <ErrorBoundary fallback={options.error}>
      <Suspense fallback={options.loading || <LoadingFallback />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    </ErrorBoundary>
  );

  // Set a display name for better debugging
  const name = importFunc.name || 'Component';
  AsyncComponent.displayName = `Async(${name})`;

  return AsyncComponent;
}

export { asyncComponent, ErrorBoundary, LoadingFallback };
