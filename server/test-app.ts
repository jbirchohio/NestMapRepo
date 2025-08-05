import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import apiRoutes from "./routes/index";
import { preventSQLInjection, configureCORS } from "./middleware/security";
import { apiVersioning, tieredRateLimit, monitorEndpoints, authenticateApiKey } from "./middleware/api-security";
import { apiRateLimit, authRateLimit, organizationRateLimit, endpointRateLimit } from "./middleware/comprehensive-rate-limiting";
// Organization scoping removed for consumer app
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { jwtAuthMiddleware } from "./middleware/jwtAuth";
import { caseConversionMiddleware } from "./middleware/caseConversionMiddleware";

const app = express();

// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'session',
  createTableIfMissing: true
});

// Export session store for cleanup in tests
export { sessionStore };

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Trust proxy for proper IP detection behind load balancers
app.set('trust proxy', 1);

// Essential middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security middleware
app.use(preventSQLInjection);
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Apply comprehensive rate limiting
app.use('/api', apiRateLimit);
app.use('/api/auth', authRateLimit);
app.use('/api', organizationRateLimit);

// Apply API security middleware
app.use('/api', apiVersioning);
app.use('/api', authenticateApiKey);

// Apply organization scoping middleware
app.use(resolveDomainOrganization);
app.use(injectOrganizationContext);

// Apply case conversion middleware and JWT authentication
app.use(caseConversionMiddleware);
app.use(jwtAuthMiddleware as any);

// Enhanced session security middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'remvana-test-secret',
  resave: false,
  saveUninitialized: false,
  name: 'remvana.sid',
  cookie: { 
    secure: false, // Set to false for testing
    httpOnly: true,
    maxAge: 12 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  rolling: true,
  proxy: false
}));

// Mount API routes
app.use('/api', apiRoutes);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Test app error:', err.message);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    message: err.message || 'Internal server error'
  });
});

// Cleanup function for tests
export const cleanupTestApp = async () => {
  try {
    console.log('Starting test app cleanup...');

    // Clean up all intervals and timers
    try {
      const { stopBackupSchedule } = await import('./services/systemSettingsService');
      stopBackupSchedule();
    } catch (error) {
      console.warn('Could not stop backup schedule:', error);
    }

    try {
      const { stopAcmeCleanup } = await import('./acmeChallenge');
      stopAcmeCleanup();
    } catch (error) {
      console.warn('Could not stop ACME cleanup:', error);
    }

    try {
      const { stopPerformanceCleanup } = await import('./performance-monitor');
      stopPerformanceCleanup();
    } catch (error) {
      console.warn('Could not stop performance cleanup:', error);
    }

    // Clean up WebSocket server if it exists
    try {
      const { collaborationWS } = await import('./websocket');
      if (collaborationWS) {
        await collaborationWS.cleanup();
      }
    } catch (error) {
      console.warn('Could not cleanup WebSocket server:', error);
    }

    // Close session store connection
    if (sessionStore) {
      console.log('Closing session store...');
      try {
        // PgSession store has a close method that returns void
        if (typeof sessionStore.close === 'function') {
          sessionStore.close();
          console.log('Session store closed successfully');
        }
      } catch (error) {
        console.warn('Session store close warning:', error);
      }
    }

    console.log('Test app cleanup completed');
  } catch (error) {
    console.warn('Test app cleanup warning:', error);
  }
};

export { app };