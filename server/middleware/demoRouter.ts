import { Request, Response, NextFunction } from 'express';

/**
 * Demo API Router Middleware
 * Redirects API calls from demo users to demo-specific endpoints
 */
export function demoRouterMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  // Only apply to demo sessions
  if (!session?.isDemo) {
    return next();
  }

  // Map regular API endpoints to demo equivalents for demo users
  const demoRouteMap: { [key: string]: string } = {
    '/api/analytics/corporate': '/api/demo/analytics/corporate',
    '/api/analytics': '/api/demo/analytics',
    '/api/dashboard-stats': '/api/demo/dashboard-stats', 
    '/api/user/permissions': '/api/demo/permissions',
    '/api/trips': '/api/demo/trips',
    '/api/notifications': '/api/demo/notifications',
    '/api/organizations/members': '/api/demo/members'
  };

  // Check if current path should be redirected for demo users
  const demoPath = demoRouteMap[req.path];
  if (demoPath) {
    // Rewrite the request URL to demo endpoint
    req.url = demoPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    // Update the original URL for Express routing
    req.originalUrl = req.url;
  }

  next();
}