import { lazy, ComponentType, ReactElement, Suspense } from 'react';
import { UserRole } from '@shared/types/auth';

// Type for components that can be imported with dynamic imports
type ImportedComponent = {
  default: ComponentType<Record<string, unknown>>;
};

// Type for route metadata
export interface RouteMeta {
  title?: string;
  description?: string;
  requiresAuth?: boolean;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

// Type for route elements with preload capability
type RouteElement = ReactElement & {
  preload?: () => Promise<ImportedComponent>;
};

// Extended route type with authentication and authorization support
export interface AuthRouteObject {
  path?: string;
  element?: React.ReactNode;
  children?: AuthRouteObject[];
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  meta?: RouteMeta;
}

/**
 * Higher-order function for lazy loading components with preloading capability
 */
function lazyLoad(
  importFn: () => Promise<ImportedComponent>,
  options: { 
    requireAuth?: boolean;
    requiredRoles?: UserRole[];
    requiredPermissions?: string[];
    meta?: RouteMeta;
  } = {}
): RouteElement {
  // Create a properly typed lazy component
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    if (!module?.default) {
      throw new Error('Imported module does not have a default export');
    }
    return { default: module.default };
  });
  
  // Create the element with proper typing
  const element = (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  ) as unknown as RouteElement;
  
  // Add preload function
  element.preload = async () => {
    const module = await importFn();
    if (!module?.default) {
      throw new Error('Imported module does not have a default export');
    }
    return module;
  };
  
  // Add auth metadata to the element
  if (options.requireAuth || options.requiredRoles?.length || options.requiredPermissions?.length) {
    const routeElement = element as RouteElement & {
      requireAuth?: boolean;
      requiredRoles?: UserRole[];
      requiredPermissions?: string[];
    };
    
    routeElement.requireAuth = options.requireAuth ?? true;
    routeElement.requiredRoles = options.requiredRoles;
    routeElement.requiredPermissions = options.requiredPermissions;
  }
  
  // Add meta information if provided
  if (options.meta) {
    const routeElement = element as RouteElement & { meta?: RouteMeta };
    routeElement.meta = options.meta;
  }
  
  return element;
}

// Public routes (no authentication required)
export const publicRoutes: AuthRouteObject[] = [
  {
    path: '/',
    element: lazyLoad(() => import('@/pages/Home')),
    meta: { title: 'NestMap - AI-Powered Travel Planning' }
  },
  {
    path: '/login',
    element: lazyLoad(() => import('@/pages/Login')),
    meta: { title: 'Login - NestMap' }
  },
  {
    path: '/signup',
    element: lazyLoad(() => import('@/pages/Signup')),
    meta: { title: 'Create Account - NestMap' }
  },
  {
    path: '/forgot-password',
    element: lazyLoad(() => import('@/pages/auth/ForgotPassword')),
    meta: { title: 'Forgot Password - NestMap' }
  },
  {
    path: '/reset-password',
    element: lazyLoad(() => import('@/pages/auth/ResetPassword')),
    meta: { title: 'Reset Password - NestMap' }
  },
  {
    path: '/unauthorized',
    element: lazyLoad(() => import('@/pages/Unauthorized')),
    meta: { title: 'Unauthorized - NestMap' }
  },
  {
    path: '/not-found',
    element: lazyLoad(() => import('@/pages/NotFound')),
    meta: { title: 'Page Not Found - NestMap' }
  },
  {
    path: '*',
    element: lazyLoad(() => import('@/pages/NotFound')),
    meta: { title: 'Page Not Found - NestMap' }
  }
];

// Protected routes (require authentication)
export const protectedRoutes: AuthRouteObject[] = [
  {
    path: '/dashboard',
    element: lazyLoad(() => import('@/pages/Dashboard')),
    requireAuth: true,
    meta: { title: 'Dashboard - NestMap' }
  },
  {
    path: '/profile',
    element: lazyLoad(() => import('@/pages/ProfileSettings')),
    requireAuth: true,
    meta: { title: 'My Profile - NestMap' }
  },
  {
    path: '/settings',
    element: lazyLoad(() => import('@/pages/Settings')),
    requireAuth: true,
    meta: { title: 'Settings - NestMap' }
  },
  {
    path: '/bookings',
    element: lazyLoad(() => import('@/pages/Bookings')),
    requireAuth: true,
    meta: { title: 'My Bookings - NestMap' }
  },
  {
    path: '/trip-planner',
    element: lazyLoad(() => import('@/pages/TripPlanner')),
    requireAuth: true,
    meta: { title: 'Trip Planner - NestMap' }
  }
];

// Admin routes (admin role required)
export const adminRoutes: AuthRouteObject[] = [
  {
    path: '/admin',
    element: lazyLoad(() => import('@/pages/AdminDashboard')),
    requireAuth: true,
    requiredRoles: ['admin'],
    meta: { title: 'Admin Dashboard - NestMap' }
  },
  {
    path: '/admin/users',
    element: lazyLoad(() => import('@/pages/AdminUserActivity')),
    requireAuth: true,
    requiredRoles: ['admin'],
    meta: { title: 'User Management - NestMap' }
  },
  {
    path: '/admin/analytics',
    element: lazyLoad(() => import('@/pages/Analytics')),
    requireAuth: true,
    requiredRoles: ['admin'],
    meta: { title: 'Analytics - NestMap' }
  }
];

// Super admin routes (super admin role required)
export const superadminRoutes: AuthRouteObject[] = [
  {
    path: '/superadmin',
    element: lazyLoad(() => import('@/pages/SuperadminSimple')),
    requireAuth: true,
    requiredRoles: ['superadmin'],
    meta: { title: 'Super Admin Dashboard - NestMap' }
  },
  {
    path: '/superadmin/settings',
    element: lazyLoad(() => import('@/pages/AdminSettings')),
    requireAuth: true,
    requiredRoles: ['superadmin'],
    meta: { title: 'System Settings - NestMap' }
  },
  {
    path: '/superadmin/audit-logs',
    element: lazyLoad(() => import('@/pages/AdminLogs')),
    requireAuth: true,
    requiredRoles: ['superadmin'],
    meta: { title: 'Audit Logs - NestMap' }
  }
];

// Combine all routes for the router
export const allRoutes: AuthRouteObject[] = [
  ...publicRoutes,
  ...protectedRoutes,
  ...adminRoutes,
  ...superadminRoutes
];

// Helper function to find a route by path
function findMatchingRoute(
  routes: AuthRouteObject[],
  path: string
): AuthRouteObject | undefined {
  for (const route of routes) {
    if (route.path === path) {
      return route;
    }
    if (route.children) {
      const found = findMatchingRoute(route.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

// Helper function to preload route components
export async function preloadRoute(pathname: string): Promise<void> {
  const route = findMatchingRoute([...publicRoutes, ...protectedRoutes, ...adminRoutes, ...superadminRoutes], pathname);
  const element = route?.element as unknown as { preload?: () => Promise<unknown> };
  if (element?.preload) {
    await element.preload();
  }
}

// Export the notFound route for the router
export const notFoundRoute: AuthRouteObject = {
  path: '*',
  element: lazyLoad(() => import('@/pages/NotFound'), {
    meta: { title: 'Page Not Found - NestMap' }
  })
};
