import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from './ProtectedRoute';

interface RouteObject {
  path: string;
  element?: React.ReactNode;
  children?: RouteObject[];
}

interface RouteRendererProps {
  routes: RouteObject[];
  isNested?: boolean;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

/**
 * Renders routes with proper error boundaries and loading states
 * Adapted for Next.js routing
 */
export const RouteRenderer: React.FC<RouteRendererProps> = ({ routes }) => {
  const pathname = usePathname();
  
  // Find the current route based on pathname
  const findMatchingRoute = (routes: RouteObject[], path: string): RouteObject | null => {
    for (const route of routes) {
      if (route.path === path) {
        return route;
      }
      
      if (route.children && route.children.length > 0) {
        const childMatch = findMatchingRoute(route.children, path);
        if (childMatch) return childMatch;
      }
    }
    return null;
  };
  
  const currentRoute = findMatchingRoute(routes, pathname || '/');
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {currentRoute?.element}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Creates a protected route with authentication and authorization
 */
export const createProtectedRoute = (
  element: React.ReactNode,
  requiredRoles: string[] = []
) => {
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      {element}
    </ProtectedRoute>
  );
};

/**
 * Wraps a route with a layout component
 */
export const withLayout = (
  element: React.ReactNode,
  Layout: React.ComponentType<{ children: React.ReactNode }>
) => {
  return <Layout>{element}</Layout>;
};
