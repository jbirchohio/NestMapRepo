import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
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

// Security headers middleware
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
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; worker-src 'self' blob:;");
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
// Temporarily disabled to fix crash - organization filtering handled in storage layer
// app.use(injectOrganizationContext);

// Enhanced session security middleware for OAuth flow
app.use(session({
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

// Session-based authentication middleware to populate req.user
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Skip for non-API routes and specific auth endpoints (but not /api/auth/me)
  if (!req.path.startsWith('/api') || 
      req.path === '/api/auth/login' || 
      req.path === '/api/auth/register' ||
      req.path === '/api/auth/logout' ||
      req.path === '/api/templates') {
    return next();
  }

  try {
    console.log('Auth middleware check:', {
      path: req.path,
      hasSession: !!req.session,
      sessionUserId: req.session ? (req.session as any).userId : 'no session',
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
    
    // Check for session-based authentication
    if (req.session && (req.session as any).userId) {
      const userId = (req.session as any).userId;
      
      // Use the auth service to get user data
      const user = await getUserById(userId);

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
          displayName: user.displayName
        };
        console.log('Auth middleware - populated req.user:', {
          id: req.user.id,
          email: req.user.email,
          organizationId: req.user.organizationId,
          role: req.user.role,
          path: req.path
        });
      } else {
        console.log('Auth middleware - no user found for session userId:', userId);
        // Clear invalid session
        delete (req.session as any).userId;
      }
    }
  } catch (error) {
    console.error('Session authentication error:', error);
  }
  
  next();
});

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
