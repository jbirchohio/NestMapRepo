import { lazy, ComponentType, ReactElement, Suspense } from 'react';
import { UserRole } from '@shared/types/auth';
import { AuthRouteObject } from '@/components/routes/RouteRenderer';

// Type for components that can be imported with dynamic imports
type ImportedComponent = {
  default: ComponentType<any>;
};

// Type for route elements with preload capability
type RouteElement = ReactElement & {
  preload: () => Promise<ImportedComponent>;
};

/**
 * Higher-order function for lazy loading components with preloading capability
 */
function lazyLoad(
  importFn: () => Promise<ImportedComponent>,
  options: { 
    requireAuth?: boolean;
    requiredRoles?: UserRole[];
    requiredPermissions?: string[];
    meta?: {
      title?: string;
      description?: string;
      [key: string]: any;
    };
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
    (element as any).requireAuth = options.requireAuth ?? true;
    (element as any).requiredRoles = options.requiredRoles;
    (element as any).requiredPermissions = options.requiredPermissions;
  }
  
  // Add meta information if provided
  if (options.meta) {
    (element as any).meta = options.meta;
  }
  
  return element;
}

// Public routes (no authentication required)
export const publicRoutes: AuthRouteObject[] = [
  {
    path: '/',
    element: lazyLoad(() => import('@/pages/Home'), {
      meta: { title: 'Home - NestMap' }
    })
  },
  {
    path: '/login',
    element: lazyLoad(() => import('@/pages/Login'), {
      meta: { title: 'Login - NestMap' }
    })
  },
  {
    path: '/register',
    element: lazyLoad(() => import('@/pages/Register'), {
      meta: { title: 'Register - NestMap' }
    })
  },
  {
    path: '/forgot-password',
    element: lazyLoad(() => import('@/pages/ForgotPassword'), {
      meta: { title: 'Forgot Password - NestMap' }
    })
  },
  {
    path: '/reset-password',
    element: lazyLoad(() => import('@/pages/ResetPassword'), {
      meta: { title: 'Reset Password - NestMap' }
    })
  },
  {
    path: '/unauthorized',
    element: lazyLoad(() => import('@/pages/Unauthorized'), {
      meta: { title: 'Unauthorized - NestMap' }
    })
  },
  {
    path: '*',
    element: lazyLoad(() => import('@/pages/NotFound'), {
      meta: { title: 'Not Found - NestMap' }
    })
  }
];

// Protected routes (require authentication)
export const protectedRoutes: AuthRouteObject[] = [
  {
    path: '/dashboard',
    element: lazyLoad(() => import('@/pages/Dashboard'), {
      requireAuth: true,
      meta: { title: 'Dashboard - NestMap' }
    })
  },
  {
    path: '/profile',
    element: lazyLoad(() => import('@/pages/Profile'), {
      requireAuth: true,
      meta: { title: 'My Profile - NestMap' }
    })
  },
  {
    path: '/settings',
    element: lazyLoad(() => import('@/pages/Settings'), {
      requireAuth: true,
      meta: { title: 'Settings - NestMap' }
    })
  },
  {
    path: '/bookings',
    element: lazyLoad(() => import('@/pages/Bookings'), {
      requireAuth: true,
      meta: { title: 'My Bookings - NestMap' }
    })
  },
  {
    path: '/trip-planner',
    element: lazyLoad(() => import('@/pages/TripPlanner'), {
      requireAuth: true,
      meta: { title: 'Trip Planner - NestMap' }
    })
  }
];

// Admin routes (require admin role)
export const adminRoutes: AuthRouteObject[] = [
  {
    path: '/admin',
    children: [
      {
        index: true,
        element: lazyLoad(() => import('@/pages/admin/AdminDashboard'), {
          requireAuth: true,
          requiredRoles: [UserRole.ADMIN],
          meta: { title: 'Admin Dashboard - NestMap' }
        })
      },
      {
        path: 'users',
        element: lazyLoad(() => import('@/pages/admin/UserManagement'), {
          requireAuth: true,
          requiredRoles: [UserRole.ADMIN],
          requiredPermissions: ['users:read'],
          meta: { title: 'User Management - NestMap' }
        })
      },
      {
        path: 'analytics',
        element: lazyLoad(() => import('@/pages/admin/Analytics'), {
          requireAuth: true,
          requiredRoles: [UserRole.ADMIN],
          requiredPermissions: ['analytics:view'],
          meta: { title: 'Analytics - NestMap' }
        })
      }
    ]
  }
];

// Superadmin routes (require superadmin role)
export const superadminRoutes: AuthRouteObject[] = [
  {
    path: '/superadmin',
    children: [
      {
        index: true,
        element: lazyLoad(() => import('@/pages/superadmin/SuperAdminDashboard'), {
          requireAuth: true,
          requiredRoles: [UserRole.SUPER_ADMIN],
          meta: { title: 'Super Admin Dashboard - NestMap' }
        })
      },
      {
        path: 'system-settings',
        element: lazyLoad(() => import('@/pages/superadmin/SystemSettings'), {
          requireAuth: true,
          requiredRoles: [UserRole.SUPER_ADMIN],
          requiredPermissions: ['system:settings:manage'],
          meta: { title: 'System Settings - NestMap' }
        })
      },
      {
        path: 'audit-logs',
        element: lazyLoad(() => import('@/pages/superadmin/AuditLogs'), {
          requireAuth: true,
          requiredRoles: [UserRole.SUPER_ADMIN],
          requiredPermissions: ['audit:read'],
          meta: { title: 'Audit Logs - NestMap' }
        })
      }
    ]
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
export function findMatchingRoute(
  routes: AuthRouteObject[],
  path: string
): AuthRouteObject | undefined {
  for (const route of routes) {
    if (route.path === path) {
      return route;
    }
    if (route.children) {
      const childRoute = findMatchingRoute(route.children, path);
      if (childRoute) {
        return childRoute;
      }
    }
  }
  return undefined;
}

// Helper function to preload route components
export async function preloadRoute(pathname: string): Promise<void> {
  const route = findMatchingRoute(allRoutes, pathname);
  if (route?.element && 'preload' in route.element) {
    await route.element.preload();
  }
}

// Export the notFound route for the router
export const notFoundRoute = {
  path: '*',
  element: lazyLoad(() => import('@/pages/NotFound'), {
    meta: { title: 'Not Found - NestMap' }
  })
};
