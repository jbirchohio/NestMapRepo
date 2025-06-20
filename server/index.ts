import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
// Temporarily commenting out problematic imports to test TypeScript compilation
// import cors, { type CorsOptions } from 'cors';
// import helmet, { type HelmetOptions } from 'helmet';
// import cookieParser from 'cookie-parser';
// import compression from 'compression';
import crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { logger } from './utils/logger.js';

// Import routes
import apiRoutes from './routes/index.js';
import { router as customDomainRoutes } from './routes/customDomains.js';

// Import middleware
import { caseConverterMiddleware } from './middleware/caseConverter.js';
import { globalErrorHandler } from './utils/errorHandler.js';

// Import the centralized type definitions
import './src/types/express-extensions';

// The Express Request type is now properly extended via the express-extensions.d.ts file

// Initialize Express app with proper typing
const app: express.Express = express();
const configService = new ConfigService();

type ExpressMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void;

// ======================
// Configuration
// ======================
const PORT = configService.get<number>('PORT') || 3000;
const NODE_ENV = configService.get<string>('NODE_ENV') || 'development';
const CORS_ORIGIN = configService.get<string>('CORS_ORIGIN') || '*';
const HOST = configService.get<string>('HOST') || '0.0.0.0';

// ======================
// Security Middleware
// ======================
// Configure CSP for Helmet with all necessary directives
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://maps.googleapis.com",
    "https://*.duffel.com"
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com"
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https://*.googleapis.com",
    "https://*.duffel.com",
    "https://*.openstreetmap.org"
  ],
  connectSrc: [
    "'self'",
    "https://api.duffel.com",
    "https://maps.googleapis.com",
    "wss://your-app.duffel.tech"
  ],
  fontSrc: [
    "'self'"
  ],
  frameSrc: ["'self'"],
  formAction: ["'self'"],
  ...(NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
};

// Apply helmet security headers with proper typing
const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 15552000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true
};

// Apply helmet middleware with proper typing
app.use((req, res, next) => {
  const helmetMiddleware = helmet(helmetConfig);
  return helmetMiddleware(req as any, res as any, next);
});

// Configure and apply CORS with proper typing
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
  optionsSuccessStatus: 200
};

// Apply CORS middleware with type assertion
app.use(cors(corsOptions) as express.RequestHandler);

// Remove X-Powered-By header
app.disable('x-powered-by');

// ======================
// Standard Middleware
// ======================
// Helper function to safely apply middleware with proper types
const safeMiddleware = <T>(middleware: T): express.RequestHandler => {
  return (req, res, next) => {
    return (middleware as unknown as express.RequestHandler)(req, res, next);
  };
};

// Apply middleware with proper type handling
app.use(safeMiddleware(express.json({ limit: '10mb' })));
app.use(safeMiddleware(express.urlencoded({ extended: true, limit: '10kb' })));
app.use(safeMiddleware(cookieParser()));
app.use(safeMiddleware(compression()));

// Import the extended Request type from our declaration file
import { Request as ExpressRequest } from 'express';

// Type for request with our custom fields
type CustomRequest = ExpressRequest;

// Request ID and timing middleware
const requestLogger: express.RequestHandler = (req, res, next) => {
  const start = Date.now();
  
  // Add custom properties to request object with type assertion
  const customReq = req as any; // Use any to bypass type checking for custom properties
  customReq.requestId = crypto.randomUUID();
  customReq.startTime = process.hrtime();
  
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const contentLength = res.get('content-length') || 0;
    logger.info(`${method} ${originalUrl} ${statusCode} ${duration}ms ${contentLength}b - ${ip}`);
  });
  
  next();
};

app.use(requestLogger);

// Case conversion middleware
app.use(caseConverterMiddleware);

// ======================
// Application Routes
// ======================
// Health check endpoint (must be before auth middleware)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
}) as express.RequestHandler;

// API routes
app.use('/api', apiRoutes);
app.use('/api', customDomainRoutes);

// 404 Handler (must be after all routes but before error handlers)
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { 
      code: 'NOT_FOUND', 
      message: 'The requested resource was not found on this server.',
      path: req.originalUrl
    }
  });
}) as express.RequestHandler;

// ======================
// Error Handling
// ======================
// Apply global error handling middleware
app.use(globalErrorHandler);

// ======================
// Server Initialization
// ======================
const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  try {
    if (NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }

    await new Promise<void>((resolve) => {
      server.listen(PORT, HOST, () => {
        logger.info(`🚀 Server is running at http://${HOST}:${PORT} in ${NODE_ENV} mode`);
        resolve();
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close server after 10 seconds
  setTimeout(() => {
    logger.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start the server
if (require.main === module) {
  logger.info('🚀 Starting server...');
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
  const missingEnv = requiredEnv.filter(v => !process.env[v]);
  
  if (missingEnv.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  
  startServer().catch((error) => {
    logger.error('❌ Unhandled error during server startup:', error);
    process.exit(1);
  });
}

export { app, server };