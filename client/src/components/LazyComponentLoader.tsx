import { lazy, Suspense, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

// Lazy load consumer components to improve initial bundle size
export const LazyActivityModal = lazy(() => import('./ActivityModal'));
export const LazyActivityModalConsumer = lazy(() => import('./ActivityModalConsumer'));
export const LazyBookableActivity = lazy(() => import('./BookableActivity'));
export const LazyFlightSearch = lazy(() => import('../pages/FlightSearchSimple'));
export const LazyAITripGenerator = lazy(() => import('../pages/AITripGenerator'));

// Loading fallback component
function LoadingFallback({ componentName }: { componentName?: string }) {
  return (
    <Card className="w-full border-purple-200">
      <CardContent className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
          <span className="text-sm text-gray-600">
            {componentName ? `Loading ${componentName}...` : 'Loading...'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// HOC to wrap lazy components with suspense
export function withLazyLoading<T extends {}>(
  LazyComponent: ComponentType<T>,
  componentName?: string
) {
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={<LoadingFallback componentName={componentName} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-configured lazy components for consumer features
export const ActivityModalLazy = withLazyLoading(LazyActivityModal, 'Activities');
export const ActivityModalConsumerLazy = withLazyLoading(LazyActivityModalConsumer, 'Activity Search');
export const BookableActivityLazy = withLazyLoading(LazyBookableActivity, 'Bookable Activities');
export const FlightSearchLazy = withLazyLoading(LazyFlightSearch, 'Flight Search');
export const AITripGeneratorLazy = withLazyLoading(LazyAITripGenerator, 'AI Trip Generator');