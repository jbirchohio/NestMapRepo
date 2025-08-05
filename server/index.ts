// Load environment variables with platform-specific handling
import './env-loader';
import { performStartupCheck } from './startup-check';
import express, { type Request, Response, NextFunction } from "express";
// Session-based auth removed - using JWT only
import path from "path";
import fs from "fs";
import apiRoutes from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSystemSettings, checkMaintenanceMode, getSetting } from "./services/systemSettingsService";
import { performanceMonitor, memoryMonitor } from "./middleware/performance";
import { performanceOptimizer } from "./services/performanceOptimizer";
import { preventSQLInjection, configureCORS } from "./middleware/security";
import { monitorDatabasePerformance } from "./middleware/database";
import { apiVersioning, tieredRateLimit, monitorEndpoints, authenticateApiKey } from "./middleware/api-security";
import { apiRateLimit, authRateLimit, organizationRateLimit, endpointRateLimit } from "./middleware/comprehensive-rate-limiting";
import { injectOrganizationContext, resolveDomainOrganization, validateOrganizationAccess } from "./middleware/organizationScoping";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { runMigrations } from "../scripts/migrate";
import { db } from "./db-connection";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { authenticateUser, getUserById } from "./auth";
import { jwtAuthMiddleware } from "./middleware/jwtAuth";
import { caseConversionMiddleware } from "./middleware/caseConversionMiddleware";
import { trackUserActivity } from "./middleware/sessionTracking";
import { logger } from './utils/logger';
import { sentryService } from './services/sentryService';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// Export app for testing
export { app };

// Session store removed - using JWT-only authentication

// Sentry request tracking middleware (must be first)
app.use(sentryService.getRequestHandler());
app.use(sentryService.getTracingHandler());

// Security headers middleware with enhanced CSP
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict transport security for HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Enhanced Content Security Policy
  let csp;
  if (process.env.NODE_ENV === 'production') {
    // Generate nonce for production inline scripts
    const nonce = Buffer.from(Math.random().toString()).toString('base64');
    res.locals.nonce = nonce;

    // Production CSP - strict security with nonce-based scripts
    csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://unpkg.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://api.mapbox.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss: ws:",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  } else {
    // Development CSP - compatible with Vite React plugin (no nonce needed)
    csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://api.mapbox.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss: ws: http://localhost:* http://127.0.0.1:*",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Performance optimization middleware (early in stack)
app.use(performanceOptimizer.viteAssetOptimizer());
app.use(performanceOptimizer.memoryReliefMiddleware());

// Input validation and sanitization middleware
app.use((req, res, next) => {
  // Sanitize common XSS patterns in request body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/javascript:/gi, '')
                 .replace(/on\w+\s*=/gi, '');
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Rate limiting for JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply CORS configuration
app.use(configureCORS);

// Apply unified monitoring (replaces performance, memory, database, and endpoint monitoring)
import { unifiedMonitoringMiddleware } from "./middleware/unified-monitoring";
import { createPerformanceMiddleware } from "./performance-monitor";
app.use(unifiedMonitoringMiddleware);
app.use(createPerformanceMiddleware());

// Apply SQL injection prevention
app.use(preventSQLInjection);

// Import demo middleware but apply it later after auth
import { demoModeMiddleware, demoBannerMiddleware, demoLimitsMiddleware } from './middleware/demoMode';

// Apply comprehensive rate limiting (demo users will be handled after auth)
app.use('/api', apiRateLimit);
app.use('/api/auth', authRateLimit);
app.use('/api', organizationRateLimit);

// Apply demo limits after rate limiting exemption
if (process.env.ENABLE_DEMO_MODE === 'true') {
  app.use('/api', demoLimitsMiddleware);
}

// Apply API security middleware only to API routes
app.use('/api', apiVersioning);
app.use('/api', authenticateApiKey);

// Apply domain routing middleware for white label domains BEFORE authentication
import { domainRoutingMiddleware } from "./loadBalancer";
app.use(domainRoutingMiddleware);

// Apply case conversion middleware first, then JWT authentication only to API routes
app.use(caseConversionMiddleware);
app.use('/api', jwtAuthMiddleware);

// Apply demo mode detection middleware AFTER authentication
if (process.env.ENABLE_DEMO_MODE === 'true') {
  app.use(demoModeMiddleware);
  app.use(demoBannerMiddleware);
}

// Track user activity for security monitoring
app.use(trackUserActivity);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('🚀 Starting server initialization...');
  
  // Perform startup environment check
  const startupStatus = performStartupCheck();
  if (!startupStatus.hasRequiredVars) {
    console.error('❌ Missing required environment variables:', startupStatus.missingVars);
    if (process.env.NODE_ENV === 'production') {
      console.error('🛑 Stopping server due to missing configuration');
      process.exit(1);
    }
  }
  
  // Initialize Sentry error monitoring first
  sentryService.init({
    environment: process.env.NODE_ENV || 'development',
    sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  });

  // Start demo reset scheduler if demo mode is enabled
  if (process.env.ENABLE_DEMO_MODE === 'true') {
    const { startDemoResetScheduler } = await import('./services/demoResetService');
    startDemoResetScheduler();
    console.log('✅ Demo reset scheduler started');
  }
  
  console.log('🔧 Environment check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - DATABASE_URL loaded:', !!process.env.DATABASE_URL);
  console.log('  - JWT_SECRET loaded:', !!process.env.JWT_SECRET);
  console.log('  - SENTRY_DSN loaded:', !!process.env.SENTRY_DSN);

  // Run database migrations on startup
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Running database migrations...');
    try {
      await runMigrations();
      console.log('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  console.log('📍 Mounting API routes...');
  try {
    // Initialize system settings
    await initializeSystemSettings();
    console.log('✅ System settings initialized');
    
    // Add maintenance mode check middleware
    app.use(checkMaintenanceMode);
    
    // Mount API routes with proper middleware order
    app.use('/api', apiRoutes);

    // Register booking routes with full Express app instance
    const { registerBookingRoutes } = await import('./routes/bookings');
    registerBookingRoutes(app);

    // Register corporate cards routes with full Express app instance
    const { registerCorporateCardRoutes } = await import('./routes/corporateCards');
    registerCorporateCardRoutes(app);

    // Register simplified white label routes with full Express app instance
    const { registerSimplifiedWhiteLabelRoutes } = await import('./routes/whiteLabelSimplified');
    registerSimplifiedWhiteLabelRoutes(app);

    // Register domain management routes with full Express app instance
    const { registerDomainRoutes } = await import('./routes/domains');
    registerDomainRoutes(app);

    // Register system metrics routes with full Express app instance
    const { registerSystemMetricsRoutes } = await import('./routes/system-metrics');
    registerSystemMetricsRoutes(app);

    // Register alerts routes with full Express app instance
    const { registerAlertsRoutes } = await import('./routes/alerts');
    registerAlertsRoutes(app);

    // Register admin settings routes with full Express app instance
    const { registerAdminSettingsRoutes } = await import('./routes/admin-settings');
    registerAdminSettingsRoutes(app);

    // Register admin analytics routes with full Express app instance
    const { registerAdminAnalyticsRoutes } = await import('./routes/admin-analytics');
    registerAdminAnalyticsRoutes(app);

    // Register performance monitoring routes with full Express app instance
    const { registerPerformanceRoutes } = await import('./routes/performance');
    registerPerformanceRoutes(app);

    console.log('✅ API routes mounted successfully');
  } catch (error) {
    logger.error('❌ Failed to mount API routes:', error);
    throw error;
  }

  // Sentry error handler (must be before other error handlers)
  app.use(sentryService.getErrorHandler());
  
  // Error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Capture additional context for Sentry
    if (req.user) {
      sentryService.setUser({
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        organizationId: req.user.organization_id
      });
    }
    
    // Capture the error in Sentry
    sentryService.captureException(err, {
      tags: {
        endpoint: req.path,
        method: req.method,
        status: status
      },
      extra: {
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
    
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "development") {
    // Setup Vite before starting server to ensure proper middleware order
    const server = app.listen(PORT, HOST, () => {
      log(`serving on http://${HOST}:${PORT}`);
    });

    await setupVite(app, server);

    // Handle server cleanup on process termination
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
  } else {
    const staticPath =
      process.env.STATIC_PATH || path.resolve(process.cwd(), "dist", "public");
    console.log("🚀 Serving static files from:", staticPath);

    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
      });
    } else {
      logger.error("❌ Static directory not found:", staticPath);
      serveStatic(app);
    }

    // Start server for production
    const server = app.listen(PORT, HOST, () => {
      log(`serving on http://${HOST}:${PORT}`);
    });

    // Handle server cleanup on process termination
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
  }
})();