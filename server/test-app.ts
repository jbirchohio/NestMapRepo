import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import apiRoutes from "./routes/index";
import { preventSQLInjection, configureCORS } from "./middleware/security";
import { apiVersioning, tieredRateLimit, monitorEndpoints, authenticateApiKey } from "./middleware/api-security";
import { apiRateLimit, authRateLimit, organizationRateLimit, endpointRateLimit } from "./middleware/comprehensive-rate-limiting";
import { injectOrganizationContext, resolveDomainOrganization, validateOrganizationAccess } from "./middleware/organizationScoping";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { unifiedAuthMiddleware } from "./middleware/unifiedAuth";
import { caseConversionMiddleware } from "./middleware/caseConversionMiddleware";

const app = express();

// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'session',
  createTableIfMissing: true
});

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
app.use(configureCORS({}));

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
app.use(unifiedAuthMiddleware);

// Enhanced session security middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'nestmap-test-secret',
  resave: false,
  saveUninitialized: false,
  name: 'nestmap.sid',
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

export { app };