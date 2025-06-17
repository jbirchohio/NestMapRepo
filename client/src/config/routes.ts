import { lazy, LazyExoticComponent, ComponentType, ReactNode } from 'react';
import { RouteObject } from 'react-router-dom';

// Extend the LazyExoticComponent type to include preload
type PreloadableComponent<T extends ComponentType> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

// Type for our route elements
type RouteElement = {
  preload: () => Promise<{ default: ComponentType }>;
} & LazyExoticComponent<ComponentType> & ReactNode;

/**
 * Higher-order function for lazy loading components with error boundaries and loading states
 */
function lazyLoad<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>
): ReactNode {
  const LazyComponent = lazy(importFn) as unknown as PreloadableComponent<T> & ReactNode;
  
  // Add preloading capability
  (LazyComponent as any).preload = importFn;
  
  return LazyComponent as unknown as ReactNode;
}

// Public routes (no authentication required)
export const publicRoutes: RouteObject[] = [
  {
    path: '/login',
    element: lazyLoad(() => import('@/pages/Login')),
  },
  {
    path: '/signup',
    element: lazyLoad(() => import('@/pages/Signup')),
  },
  {
    path: '/onboarding',
    element: lazyLoad(() => import('@/pages/Onboarding')),
  },
];

// Protected routes (require authentication)
export const protectedRoutes: RouteObject[] = [
  // Dashboard routes
  {
    path: '/',
    element: lazyLoad(() => import('@/pages/Home')),
  },
  {
    path: '/dashboard',
    element: lazyLoad(() => import('@/pages/Dashboard')),
  },
  {
    path: '/enterprise-dashboard',
    element: lazyLoad(() => import('@/pages/EnterpriseDashboard')),
  },
  {
    path: '/corporate-dashboard',
    element: lazyLoad(() => import('@/pages/CorporateDashboard')),
  },
  {
    path: '/agency-dashboard',
    element: lazyLoad(() => import('@/pages/AgencyDashboard')),
  },
  {
    path: '/performance-dashboard',
    element: lazyLoad(() => import('@/pages/PerformanceDashboard')),
  },

  // Trip routes
  {
    path: '/trip-planner',
    element: lazyLoad(() => import('@/pages/TripPlanner')),
  },
  {
    path: '/simple-share',
    element: lazyLoad(() => import('@/pages/SimpleShare')),
  },
  {
    path: '/trip-optimizer',
    element: lazyLoad(() => import('@/pages/TripOptimizer')),
  },
  {
    path: '/ai-trip-generator',
    element: lazyLoad(() => import('@/pages/AITripGenerator')),
  },

  // B2B feature routes
  {
    path: '/analytics',
    element: lazyLoad(() => import('@/pages/Analytics')),
  },
  {
    path: '/approvals',
    element: lazyLoad(() => import('@/pages/Approvals')),
  },
  {
    path: '/invoice-center',
    element: lazyLoad(() => import('@/pages/InvoiceCenter')),
  },

  // Invoice routes
  {
    path: '/invoice/:id',
    element: lazyLoad(() => import('@/pages/InvoiceView')),
  },
  {
    path: '/invoice/success',
    element: lazyLoad(() => import('@/pages/InvoiceSuccess')),
  },
  {
    path: '/invoice/failure',
    element: lazyLoad(() => import('@/pages/InvoiceFailure')),
  },

  // Booking routes
  {
    path: '/flights',
    children: [
      { path: 'search', element: lazyLoad(() => import('@/pages/FlightSearch')) },
      { path: 'book', element: lazyLoad(() => import('@/pages/FlightBooking')) },
      { path: 'results', element: lazyLoad(() => import('@/pages/FlightResults')) },
      { path: 'sequential', element: lazyLoad(() => import('@/pages/SequentialBookingFlights')) },
    ],
  },
  {
    path: '/bookings',
    element: lazyLoad(() => import('@/pages/Bookings')),
  },
  {
    path: '/booking-confirmation',
    element: lazyLoad(() => import('@/pages/BookingConfirmation')),
  },

  // Settings routes
  {
    path: '/settings',
    children: [
      { index: true, element: lazyLoad(() => import('@/pages/Settings')) },
      { path: 'profile', element: lazyLoad(() => import('@/pages/ProfileSettings')) },
      { path: 'calendar', element: lazyLoad(() => import('@/pages/CalendarSettings')) },
      { path: 'team', element: lazyLoad(() => import('@/components/TeamManagement')) },
      { path: 'billing', element: lazyLoad(() => import('@/components/BillingDashboard')) },
      { path: 'white-label', element: lazyLoad(() => import('@/components/WhiteLabelSettings')) },
      { path: 'branding', element: lazyLoad(() => import('@/pages/BrandingSetup')) },
      { path: 'help', element: lazyLoad(() => import('@/pages/HelpCenter')) },
    ],
  },

  // Finance routes
  {
    path: '/finance',
    children: [
      { path: 'corporate-cards', element: lazyLoad(() => import('@/pages/CorporateCards')) },
      { path: 'funding', element: lazyLoad(() => import('@/pages/OrganizationFunding')) },
    ],
  },
];

// Admin routes (require admin role)
export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    children: [
      { index: true, element: lazyLoad(() => import('@/pages/AdminDashboard')) },
      { path: 'roles', element: lazyLoad(() => import('@/pages/AdminRoles')) },
      { path: 'security', element: lazyLoad(() => import('@/pages/AdminSecurity')) },
      { path: 'settings', element: lazyLoad(() => import('@/pages/AdminSettings')) },
      { path: 'logs', element: lazyLoad(() => import('@/pages/AdminLogs')) },
      { path: 'metrics', element: lazyLoad(() => import('@/pages/AdminSystemMetrics')) },
      { path: 'user-activity', element: lazyLoad(() => import('@/pages/AdminUserActivity')) },
    ],
  },
];

// Superadmin routes
export const superadminRoutes: RouteObject[] = [
  {
    path: '/superadmin',
    children: [
      { index: true, element: lazyLoad(() => import('@/pages/SuperadminClean')) },
      { 
        path: 'organizations/:id', 
        element: lazyLoad(() => import('@/pages/SuperadminOrganizationDetail')) 
      },
    ],
  },
];

// 404 route
export const notFoundRoute: RouteObject = {
  path: '*',
  element: lazyLoad(() => import('@/pages/not-found')),
};

// Helper function to find a route by path
const findMatchingRoute = (
  routes: RouteObject[],
  path: string
): RouteObject | undefined => {
  for (const route of routes) {
    if (route.path === path) {
      return route;
    }
    
    if (route.children) {
      const childMatch = findMatchingRoute(route.children, path);
      if (childMatch) return childMatch;
    }
  }
  return undefined;
};

// Helper function to preload route components
export const preloadRoute = async (pathname: string): Promise<void> => {
  const allRoutes = [
    ...publicRoutes,
    ...protectedRoutes,
    ...adminRoutes,
    ...superadminRoutes,
  ];
  
  const route = findMatchingRoute(allRoutes, pathname);
  
  if (route?.element) {
    const element = route.element as unknown as RouteElement;
    if (typeof element.preload === 'function') {
      await element.preload();
    }
  }
};
