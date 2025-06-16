import { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import express from 'express';

import { configureCORS, preventSQLInjection } from './security';
import { unifiedMonitoringMiddleware } from './unified-monitoring';
import { createPerformanceMiddleware } from '../performance-monitor';
import { 
  apiRateLimit, 
  authRateLimit, 
  organizationRateLimit 
} from './comprehensive-rate-limiting.js';
import { 
  apiVersioning, 
  authenticateApiKey 
} from './api-security';
import { domainRoutingMiddleware } from '../loadBalancer';
import { caseConversionMiddleware } from './caseConversionMiddleware';
import { jwtAuthMiddleware } from './jwtAuth';
import { trackUserActivity } from './sessionTracking';

type Middleware = RequestHandler | RequestHandler[];

export function setupMiddlewares(app: Application): void {
  // Security headers and CSP

  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));
  
  // CORS and monitoring
  app.use(configureCORS);
  app.use(unifiedMonitoringMiddleware);
  app.use(createPerformanceMiddleware());
  
  // Security
  app.use(preventSQLInjection);
  
  // Rate limiting
  app.use('/api', apiRateLimit);
  app.use('/api/auth', authRateLimit);
  app.use('/api', organizationRateLimit);
  
  // API security
  app.use('/api', apiVersioning);
  app.use('/api', authenticateApiKey);
  
  // Domain routing and authentication
  app.use(domainRoutingMiddleware);
  app.use(caseConversionMiddleware);
  
  // JWT Auth for API routes
  app.use('/api', jwtAuthMiddleware);
  
  // User activity tracking
  app.use(trackUserActivity);
}
