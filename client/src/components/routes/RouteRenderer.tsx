import React, { Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, matchPath } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { UserRole } from '@shared/types/auth';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Route metadata type
 */
export interface RouteMeta {
  /** Page title */
  title?: string;
  /** Page description for SEO */
  description?: string;
  /** Layout component to wrap the route */
  layout?: React.ComponentType<{ children: React.ReactNode }>;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Extended route type with authentication and authorization support
 */
export interface AuthRouteObject {
  /** The path to match against the URL */
  path?: string;
  
  /** The element to render when the path matches */
  element?: React.ReactNode;
  
  /** Child routes */
  children?: AuthRouteObject[];
  
  /** Whether the route requires authentication (default: false) */
  requireAuth?: boolean;
  
  /** Required user roles to access this route */
  requiredRoles?: UserRole[];
  
  /** Required permissions to access this route (all must be granted) */
  requiredPermissions?: string[];
  
  /** Route metadata */
  meta?: RouteMeta;
  
  /** Whether this is an index route (for nested routes) */
  index?: boolean;
}

interface RouteRendererProps {
  /** Array of route configurations */
  routes: AuthRouteObject[];
  /** Whether this is a nested route renderer (internal use) */
  isNested?: boolean;
  /** Parent route path (internal use) */
  parentPath?: string;
}

/** Loading spinner fallback component */
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

/**
 * Finds a route that matches the given pathname
 */
function findMatchingRoute(routes: AuthRouteObject[], pathname: string): AuthRouteObject | undefined {
  for (const route of routes) {
    if (route.path && matchPath(route.path, pathname)) {
      return route;
    }
    
    if (route.children) {
      const childMatch = findMatchingRoute(route.children, pathname);
      if (childMatch) return childMatch;
    }
  }
  return undefined;
}

/**
 * Component that renders routes with proper authentication and layout
 */
export const RouteRenderer: React.FC<RouteRendererProps> = ({ 
  routes, 
  isNested = false,
  parentPath = ''
}) => {
  const location = useLocation();

  // Update document title when route changes
  useEffect(() => {
    const currentRoute = findMatchingRoute(routes, location.pathname);
    if (currentRoute?.meta?.title) {
      document.title = `${currentRoute.meta.title} | NestMap`;
    } else {
      document.title = 'NestMap';
    }
  }, [location.pathname, routes]);

  /**
   * Renders a route element with proper wrappers (error boundary, suspense, auth, layout)
   */
  const renderRouteElement = (route: AuthRouteObject) => {
    const Element = route.element as React.ComponentType | undefined;
    
    // Base element with error boundary and suspense
    let routeElement = (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          {Element && <Element />}
        </Suspense>
      </ErrorBoundary>
    );

    // Apply auth protection if needed
    if (route.requireAuth || route.requiredRoles?.length || route.requiredPermissions?.length) {
      routeElement = (
        <ProtectedRoute 
          requiredRoles={route.requiredRoles}
          requiredPermissions={route.requiredPermissions}
        >
          {routeElement}
        </ProtectedRoute>
      );
    }

    // Apply layout if specified
    if (route.meta?.layout) {
      const Layout = route.meta.layout;
      routeElement = <Layout>{routeElement}</Layout>;
    }

    return routeElement;
  };

  /**
   * Recursively renders nested routes
   */
  const renderNestedRoutes = (route: AuthRouteObject, currentPath: string = '') => {
    const fullPath = currentPath ? `${currentPath}${route.path || ''}` : route.path || '';
    const routeKey = fullPath || `index-${Math.random().toString(36).substr(2, 9)}`;
    
    // If route has children, render them recursively
    if (route.children?.length) {
      return (
        <Route
          key={routeKey}
          path={fullPath}
          element={route.element ? renderRouteElement(route) : undefined}
        >
          {route.children.map((child) => renderNestedRoutes(child, fullPath))}
        </Route>
      );
    }

    // Leaf route
    return (
      <Route
        key={routeKey}
        path={fullPath}
        element={renderRouteElement(route)}
        index={route.index}
      />
    );
  };

  // Render all routes
  return (
    <Routes>
      {routes.map((route) => renderNestedRoutes(route, parentPath))}
    </Routes>
  );
};

/**
 * @deprecated Use the route configuration with requireAuth, requiredRoles, or requiredPermissions instead
 */
export function createProtectedRoute(
  element: React.ReactNode, 
  requiredRoles: UserRole[] = []
) {
  console.warn('createProtectedRoute is deprecated. Use route configuration with requireAuth and requiredRoles instead.');
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      {element}
    </ProtectedRoute>
  );
}

/**
 * @deprecated Use the meta.layout property in route configuration instead
 */
export function withLayout(
  element: React.ReactNode, 
  Layout: React.ComponentType<{ children: React.ReactNode }>
) {
  console.warn('withLayout is deprecated. Use meta.layout in route configuration instead.');
  return <Layout>{element}</Layout>;
};
