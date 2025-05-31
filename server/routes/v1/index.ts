/**
 * API v1 Routes - Enterprise Acquisition Ready
 * Centralized routing with proper versioning for long-term stability
 */

import type { Express } from "express";

/**
 * API version middleware for deprecation warnings
 */
export function apiVersionMiddleware(version: string) {
  return (req: any, res: any, next: any) => {
    // Add version headers for API clients
    res.set('API-Version', version);
    res.set('API-Supported-Versions', 'v1');
    
    // Future deprecation warning system
    if (version === 'v1' && process.env.NODE_ENV === 'production') {
      // In future, add deprecation warnings here
      // res.set('Deprecation', 'true');
      // res.set('Sunset', '2026-01-01');
    }
    
    next();
  };
}

/**
 * Register all v1 API routes with proper versioning
 */
export function registerV1Routes(app: Express): void {
  // Apply version middleware to all v1 routes
  app.use('/api/v1', apiVersionMiddleware('v1'));
  
  // Health check endpoint
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: 'v1',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
}

/**
 * Prepare v2 namespace (future-ready)
 */
export function prepareV2Routes(app: Express): void {
  app.use('/api/v2', (req, res) => {
    res.status(501).json({
      error: 'API v2 not yet implemented',
      message: 'Please use /api/v1/ endpoints',
      documentation: '/api/docs'
    });
  });
}

/**
 * Legacy route redirects for backward compatibility
 */
export function setupLegacyRedirects(app: Express): void {
  // Redirect unversioned API calls to v1
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/api/v1') || req.path.startsWith('/api/v2')) {
      return next();
    }
    
    // Redirect to v1 with deprecation warning
    res.set('Deprecation', 'true');
    res.set('Location', `/api/v1${req.path.replace('/api', '')}`);
    res.status(301).json({
      message: 'Please use versioned API endpoints',
      redirect: `/api/v1${req.path.replace('/api', '')}`,
      documentation: '/api/docs'
    });
  });
}