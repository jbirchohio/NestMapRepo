import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
// Session-based auth removed - using JWT only
import path from "path";
import fs from "fs";
import apiRoutes from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
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
// JWT and case conversion handled by cleanJwtAuthMiddleware

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// Export app for testing
export { app };

// Session store removed - using JWT-only authentication

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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
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
app.use(unifiedMonitoringMiddleware);

// Apply SQL injection prevention
app.use(preventSQLInjection);

// Apply comprehensive rate limiting first for maximum protection
app.use('/api', apiRateLimit); // Global API rate limiting
app.use('/api/auth', authRateLimit); // Stricter limits for authentication endpoints
app.use('/api', organizationRateLimit); // Organization-tier based limiting

// Apply API security middleware only to API routes
app.use('/api', apiVersioning);
app.use('/api', authenticateApiKey);

// Organization scoping temporarily disabled to prevent middleware recursion
// app.use(resolveDomainOrganization);
// app.use(injectOrganizationContext);

// Apply clean JWT authentication (replaces the old jwt + case conversion)
import { cleanJwtAuthMiddleware } from './middleware/cleanJwtAuth';
app.use(cleanJwtAuthMiddleware);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', {
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

  // Run database migrations on startup
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Running database migrations...');
    try {
      await runMigrations();
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  console.log('📍 Mounting API routes...');
  try {
    // Mount API routes
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

    console.log('✅ API routes mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount API routes:', error);
    throw error;
  }

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    // Create server first, then setup Vite
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
      console.error("❌ Static directory not found:", staticPath);
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