import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from './ProtectedRoute';

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
 * Recursively renders routes with proper error boundaries and loading states
 */
export const RouteRenderer: React.FC<RouteRendererProps> = ({ routes }) => {
  return (
    <Routes>
      {routes.map((route) => {
        const Element = route.element as React.ComponentType | undefined;
        const hasChildren = route.children && route.children.length > 0;

        return (
          <Route
            key={route.path || 'root'}
            path={route.path}
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  {Element && <Element />}
                </Suspense>
              </ErrorBoundary>
            }
          >
            {hasChildren && route.children && (
              <RouteRenderer routes={route.children} />
            )}
          </Route>
        );
      })}
    </Routes>
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
