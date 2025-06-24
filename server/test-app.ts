import 'dotenv/config';
import express, { type Request, Response, NextFunction } from '../../express-augmentations.ts';
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import apiRoutes from "./routes/index.js";
// Security middleware imports
import { preventSQLInjection, configureCORS } from "./middleware/secureAuth.js";
import { apiVersioning, tieredRateLimit, monitorEndpoints, authenticateApiKey } from "./middleware/api-security.js";
// Rate limiting
import { apiRateLimit, authRateLimit, organizationRateLimit, endpointRateLimit } from "./middleware/comprehensive-rate-limiting.js";
// Organization and authentication
import { injectOrganizationContext, resolveDomainOrganization, validateOrganizationAccess } from "./middleware/organizationScoping.js";
// Error handling
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
// Authentication
import { unifiedAuthMiddleware } from "./middleware/secureAuth.js";
// Request/response processing
import { caseConverterMiddleware } from "./middleware/caseConverter.js";
const app = express();
// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true
});
// Security headers middleware
app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// Trust proxy for proper IP detection behind load balancers
app.set('trust proxy', 1);
// Essential middleware
app.use(express.json({ limit: '50mb' }) as express.RequestHandler);
app.use(express.urlencoded({ extended: true, limit: '50mb' }) as express.RequestHandler);
// Security middleware
app.use(preventSQLInjection);
app.use((_req, res, next) => {
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
app.use(caseConverterMiddleware);
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
app.use(((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error('Test app error:', err.message);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        message: err.message || 'Internal server error'
    });
}) as express.ErrorRequestHandler);
export { app };
