import React, {
  lazy,
  LazyExoticComponent,
  ComponentType,
  ReactElement
} from 'react';
import { RouteObject } from 'react-router-dom';

// Extend the LazyExoticComponent type to include preload
type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

// Type for our route elements
type RouteElement = ReactElement & {
  preload: () => Promise<{ default: ComponentType<any> }>;
};

/**
 * Higher-order function for lazy loading components with preloading capability
 */
function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  const LazyComponent = lazy(importFn) as PreloadableComponent<T>;
  LazyComponent.preload = importFn;
  return LazyComponent;
}

// Public routes (no authentication required)
export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: React.createElement(lazyLoad(() => import('@/pages/Home'))),
  },
  {
    path: '/login',
    element: React.createElement(lazyLoad(() => import('@/pages/Login'))),
  },
  {
    path: '/signup',
    element: React.createElement(lazyLoad(() => import('@/pages/Signup'))),
  },
  {
    path: '/onboarding',
    element: React.createElement(lazyLoad(() => import('@/pages/Onboarding'))),
  },
];

// Protected routes (require authentication)
export const protectedRoutes: RouteObject[] = [
  // Dashboard routes
  {
    path: '/dashboard',
    element: React.createElement(lazyLoad(() => import('@/pages/Dashboard'))),
  },
  {
    path: '/enterprise-dashboard',
    element: React.createElement(lazyLoad(() => import('@/pages/EnterpriseDashboard'))),
  },
  {
    path: '/corporate-dashboard',
    element: React.createElement(lazyLoad(() => import('@/pages/CorporateDashboard'))),
  },
  {
    path: '/agency-dashboard',
    element: React.createElement(lazyLoad(() => import('@/pages/AgencyDashboard'))),
  },
  {
    path: '/performance-dashboard',
    element: React.createElement(lazyLoad(() => import('@/pages/PerformanceDashboard'))),
  },

  // Trip routes
  {
    path: '/trip-planner',
    element: React.createElement(lazyLoad(() => import('@/pages/TripPlanner'))),
  },
  {
    path: '/simple-share',
    element: React.createElement(lazyLoad(() => import('@/pages/SimpleShare'))),
  },
  {
    path: '/trip-optimizer',
    element: React.createElement(lazyLoad(() => import('@/pages/TripOptimizer'))),
  },
  {
    path: '/ai-trip-generator',
    element: React.createElement(lazyLoad(() => import('@/pages/AITripGenerator'))),
  },

  // B2B feature routes
  {
    path: '/analytics',
    element: React.createElement(lazyLoad(() => import('@/pages/Analytics'))),
  },
  {
    path: '/approvals',
    element: React.createElement(lazyLoad(() => import('@/pages/Approvals'))),
  },
  {
    path: '/invoice-center',
    element: React.createElement(lazyLoad(() => import('@/pages/InvoiceCenter'))),
  },

  // Invoice routes
  {
    path: '/invoice/:id',
    element: React.createElement(lazyLoad(() => import('@/pages/InvoiceView'))),
  },
  {
    path: '/invoice/success',
    element: React.createElement(lazyLoad(() => import('@/pages/InvoiceSuccess'))),
  },
  {
    path: '/invoice/failure',
    element: React.createElement(lazyLoad(() => import('@/pages/InvoiceFailure'))),
  },

  // Booking routes
  {
    path: '/flights',
    children: [
      { path: 'search', element: React.createElement(lazyLoad(() => import('@/pages/FlightSearch'))) },
      { path: 'book', element: React.createElement(lazyLoad(() => import('@/pages/FlightBooking'))) },
      { path: 'results', element: React.createElement(lazyLoad(() => import('@/pages/FlightResults'))) },
      { path: 'sequential', element: React.createElement(lazyLoad(() => import('@/pages/SequentialBookingFlights'))) },
    ],
  },
  {
    path: '/bookings',
    element: React.createElement(lazyLoad(() => import('@/pages/Bookings'))),
  },
  {
    path: '/booking-confirmation',
    element: React.createElement(lazyLoad(() => import('@/pages/BookingConfirmation'))),
  },

  // Settings routes
  {
    path: '/settings',
    children: [
      { index: true, element: React.createElement(lazyLoad(() => import('@/pages/Settings'))) },
      { path: 'profile', element: React.createElement(lazyLoad(() => import('@/pages/ProfileSettings'))) },
      { path: 'calendar', element: React.createElement(lazyLoad(() => import('@/pages/CalendarSettings'))) },
      { path: 'team', element: React.createElement(lazyLoad(() => import('@/components/TeamManagement'))) },
      { path: 'billing', element: React.createElement(lazyLoad(() => import('@/components/BillingDashboard'))) },
      { path: 'white-label', element: React.createElement(lazyLoad(() => import('@/components/WhiteLabelSettings'))) },
      { path: 'branding', element: React.createElement(lazyLoad(() => import('@/pages/BrandingSetup'))) },
      { path: 'help', element: React.createElement(lazyLoad(() => import('@/pages/HelpCenter'))) },
    ],
  },

  // Finance routes
  {
    path: '/finance',
    children: [
      { path: 'corporate-cards', element: React.createElement(lazyLoad(() => import('@/pages/CorporateCards'))) },
      { path: 'funding', element: React.createElement(lazyLoad(() => import('@/pages/OrganizationFunding'))) },
    ],
  },
];

// Admin routes (require admin role)
export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    children: [
      { index: true, element: React.createElement(lazyLoad(() => import('@/pages/AdminDashboard'))) },
      { path: 'roles', element: React.createElement(lazyLoad(() => import('@/pages/AdminRoles'))) },
      { path: 'security', element: React.createElement(lazyLoad(() => import('@/pages/AdminSecurity'))) },
      { path: 'settings', element: React.createElement(lazyLoad(() => import('@/pages/AdminSettings'))) },
      { path: 'logs', element: React.createElement(lazyLoad(() => import('@/pages/AdminLogs'))) },
      { path: 'metrics', element: React.createElement(lazyLoad(() => import('@/pages/AdminSystemMetrics'))) },
      { path: 'user-activity', element: React.createElement(lazyLoad(() => import('@/pages/AdminUserActivity'))) },
    ],
  },
];

// Superadmin routes
export const superadminRoutes: RouteObject[] = [
  {
    path: '/superadmin',
    children: [
      { index: true, element: React.createElement(lazyLoad(() => import('@/pages/SuperadminClean'))) },
      { 
        path: 'organizations/:id', 
        element: React.createElement(lazyLoad(() => import('@/pages/SuperadminOrganizationDetail'))) 
      },
    ],
  },
];

// 404 route
export const notFoundRoute: RouteObject = {
  path: '*',
  element: React.createElement(lazyLoad(() => import('@/pages/not-found'))),
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
    try {
      // Safe cast since we expect route elements to have preload function
      const element = route.element as unknown as RouteElement;
      if (typeof element.preload === 'function') {
        await element.preload();
      }
    } catch (error) {
      console.error(`Failed to preload route for ${pathname}:`, error);
    }
  }
};
