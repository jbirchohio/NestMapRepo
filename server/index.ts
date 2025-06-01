import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceMonitor, memoryMonitor } from "./middleware/performance";
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

const app = express();

// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'session',
  createTableIfMissing: true
});

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

// Apply organization scoping middleware for multi-tenant security
app.use(resolveDomainOrganization);
app.use(injectOrganizationContext);

// Enhanced session security middleware with PostgreSQL store
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'nestmap-calendar-sync-secret',
  resave: false,
  saveUninitialized: false,
  name: 'nestmap.sid', // Custom session name to prevent fingerprinting
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 12 * 60 * 60 * 1000, // Reduced to 12 hours for better security
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  rolling: true, // Reset expiration on activity
  proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
}));

// Authentication routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Store user ID in session
    (req.session as any).userId = user.id;
    
    console.log('Login successful for user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('nestmap.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email || 'Unknown',
        role: req.user.role,
        organizationId: req.user.organizationId,
        displayName: req.user.displayName || 'Unknown'
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Session statistics endpoint for testing PostgreSQL store
app.get('/api/admin/session-stats', async (req: Request, res: Response) => {
  try {
    // Only allow authenticated users to see session stats
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // CRITICAL SECURITY: Only super_admin users can access system-wide session statistics
    if (!req.user || req.user.role !== 'super_admin') {
      console.warn('ADMIN_ACCESS_DENIED: Non-super-admin attempted to access session stats', {
        userId: req.user?.id,
        role: req.user?.role,
        endpoint: '/api/admin/session-stats',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Super admin privileges required for session statistics' 
      });
    }

    // Use existing database connection to query session statistics
    const sessionCountResult = await db.execute(`SELECT COUNT(*) as session_count FROM session`);
    const expiredSessionResult = await db.execute(`SELECT COUNT(*) as expired_count FROM session WHERE expire < NOW()`);
    
    const totalSessions = parseInt(sessionCountResult.rows[0].session_count as string);
    const expiredSessions = parseInt(expiredSessionResult.rows[0].expired_count as string);
    
    res.json({
      totalSessions,
      expiredSessions,
      activeSessions: totalSessions - expiredSessions,
      storeType: 'PostgreSQL',
      tableName: 'session',
      sessionConfig: {
        name: 'nestmap.sid',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      }
    });
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({ error: 'Failed to get session statistics' });
  }
});

// Import unified authentication middleware
import { unifiedAuthMiddleware } from './middleware/unifiedAuth';

// Apply unified authentication and organization context
app.use(unifiedAuthMiddleware);

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

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
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
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
