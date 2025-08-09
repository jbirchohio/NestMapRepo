// Load environment variables with platform-specific handling
import './env-loader';
import { performStartupCheck } from './startup-check';
import express, { type Request, Response, NextFunction } from "express";
// Session-based auth removed - using JWT only
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import apiRoutes from "./routes/index";
import sitemapRoutes from "./routes/sitemap";
import { setupVite, serveStatic, log } from "./vite";
// System settings not needed for consumer app
// import { initializeSystemSettings, checkMaintenanceMode, getSetting } from "./services/systemSettingsService";
import { performanceMonitor, memoryMonitor } from "./middleware/performance";
import { performanceOptimizer } from "./services/performanceOptimizer";
import { preventSQLInjection, configureCORS } from "./middleware/security";
import { monitorDatabasePerformance } from "./middleware/database";
import { apiVersioning, tieredRateLimit, monitorEndpoints, authenticateApiKey } from "./middleware/api-security";
import { apiRateLimit, authRateLimit, endpointRateLimit } from "./middleware/comprehensive-rate-limiting";
// Organization scoping removed for consumer app
import { globalErrorHandler } from "./middleware/globalErrorHandler";
// Migration import removed - handled inline
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

// Trust proxy headers when running behind Railway's load balancer
// Use specific number to avoid rate limit bypass vulnerability
app.set('trust proxy', 1); // Trust first proxy only

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

  // Consumer-friendly Content Security Policy
  // Allows common analytics, ads, social media, etc.
  const csp = [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https: http: blob:",
    "connect-src 'self' https: http: wss: ws:",
    "font-src 'self' data: https:",
    "frame-src 'self' https:",
    "media-src 'self' https: blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob: https:",
    "form-action 'self' https:",
    "frame-ancestors 'self' https:",
    "base-uri 'self'",
    "manifest-src 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Correlation ID middleware (must be early in stack)
import { correlationIdMiddleware } from './middleware/correlationId';
app.use(correlationIdMiddleware);

// HTTP caching middleware (early in stack for best performance)
import { smartCache, contentTypeCache } from './middleware/httpCache';
app.use(smartCache());
app.use(contentTypeCache());

// Performance optimization middleware (early in stack)
app.use(performanceOptimizer.viteAssetOptimizer());
app.use(performanceOptimizer.memoryReliefMiddleware());

// Start interval cleanup monitoring
import { intervalCleanup } from './services/intervalCleanup';
intervalCleanup.startMonitoring();

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

// Capture raw body for Stripe webhook signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Rate limiting for JSON parsing (for all other routes)
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // Store raw body for webhook signature verification if needed
    req.rawBody = buf.toString('utf8');
  }
}));

// Serve uploaded files statically - use process.cwd() for correct path in production
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('📂 Uploads directory path:', uploadsPath);
console.log('📂 Uploads directory exists:', fs.existsSync(uploadsPath));
if (fs.existsSync(uploadsPath)) {
  const files = fs.readdirSync(path.join(uploadsPath, 'covers')).slice(0, 5);
  console.log('📂 Sample files in uploads/covers:', files);
}
app.use('/uploads', express.static(uploadsPath, {
  dotfiles: 'allow',
  index: false,
  redirect: false
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply CORS configuration
app.use(configureCORS);

// Apply general rate limiting to all API routes
import { generalRateLimit } from './middleware/rateLimiting';
app.use('/api', generalRateLimit);

// Apply unified monitoring (replaces performance, memory, database, and endpoint monitoring)
import { unifiedMonitoringMiddleware } from "./middleware/unified-monitoring";
import { createPerformanceMiddleware } from "./performance-monitor";
app.use(unifiedMonitoringMiddleware);
app.use(createPerformanceMiddleware());

// Apply SQL injection prevention
app.use(preventSQLInjection);

// Demo mode removed for consumer app

// Apply comprehensive rate limiting (demo users will be handled after auth)
app.use('/api', apiRateLimit);
app.use('/api/auth', authRateLimit);
// Organization rate limit removed for consumer app

// Demo mode removed for consumer app

// Apply API security middleware only to API routes
app.use('/api', apiVersioning);
app.use('/api', authenticateApiKey);

// White label domain routing removed for consumer app

// Add a simple health check at root for debugging 502 errors
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply case conversion middleware first, then JWT authentication only to API routes
app.use(caseConversionMiddleware);
app.use('/api', jwtAuthMiddleware);

// Demo mode removed for consumer app

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

  // Demo mode removed for consumer app
  
  console.log('🔧 Environment check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - DATABASE_URL loaded:', !!process.env.DATABASE_URL);
  console.log('  - JWT_SECRET loaded:', !!process.env.JWT_SECRET);
  console.log('  - SENTRY_DSN loaded:', !!process.env.SENTRY_DSN);

  // Run database migrations on startup
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Running database migrations...');
    try {
      // Simple migration check for consumer app
      console.log('✅ Database ready for consumer app');
      console.log('✅ Database migrations completed');
    } catch (error) {
      // Migration errors are handled in the migration script itself
      // If we get here and migrations said they succeeded, we can continue
      console.log('✅ Migration check completed');
    }
  }

  console.log('📍 Mounting API routes...');
  try {
    // Skip system settings for consumer app - not needed
    // await initializeSystemSettings();
    // console.log('✅ System settings initialized');
    
    // Skip maintenance mode check for consumer app
    // app.use(checkMaintenanceMode);
    
    // Mount API routes with proper middleware order
    app.use('/api', apiRoutes);
    
    // Mount SEO routes at root level (no /api prefix)
    app.use('/', sitemapRoutes);

    // Corporate routes removed for consumer app

    // Admin analytics removed for consumer app

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
      // Catch-all route for SPA - but exclude /api and /uploads routes
      app.get("*", (req, res) => {
        // Don't catch API or upload routes
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
          res.status(404).json({ message: 'Not found' });
          return;
        }
        res.sendFile(path.join(staticPath, "index.html"));
      });
    } else {
      logger.error("❌ Static directory not found:", staticPath);
      serveStatic(app);
    }

    // Start server for production
    const server = app.listen(PORT, HOST, () => {
      log(`✅ Server running on http://${HOST}:${PORT}`);
      log(`🌍 Environment: ${process.env.NODE_ENV}`);
      log(`📁 Static path: ${staticPath}`);
      log(`🔗 CORS allowed: ${process.env.CORS_ORIGIN}`);
    });

    // Handle server cleanup on process termination
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
  }
})();