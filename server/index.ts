import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';

import crypto from 'crypto';
import http from 'http';
import { ConfigService } from '@nestjs/config';

// Local imports
import { logger } from './utils/logger.js';
import config from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { standardizedErrorAdapter } from './middleware/standardized-error-adapter.js';
import { extendRequest } from './utils/request.js';
import { extendResponse } from './utils/response.js';
import { preventSQLInjection, enforceOrganizationSecurity } from './middleware/security.js';
import { performanceMonitor, memoryMonitor } from './middleware/performance.js';
import { authenticate } from './src/auth/middleware/index.js';
import { caseConverterMiddleware } from './middleware/caseConverter.js';
import { cspMiddleware } from './middleware/csp.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { apiRateLimit as comprehensiveApiRateLimit } from './middleware/comprehensive-rate-limiting.js';

// Import route factories
import { createAuthRouter } from './routes/auth.js';
import apiRoutes from './routes/index.js';
import customDomainRoutes from './routes/customDomains.js';

// Re-export types for easier access
export * from '@shared/types/index';

// Initialize Express app
const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// ======================
// Core Middleware
// ======================
app.use(extendRequest);
app.use(extendResponse);
app.use(performanceMonitor);
app.use(memoryMonitor);
app.use(compression());
app.use(cookieParser());

// ======================
// Security Middleware
// ======================
app.use(cspMiddleware);
app.use(helmet());
app.use((_req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});
app.use(cors({
  origin: config.server.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 200,
}));

// Apply comprehensive API rate limiting globally
// Skip for health check and dev environment
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const skipPaths = ['/health', '/api/health'];
  if (process.env.NODE_ENV === 'development' || skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  return comprehensiveApiRateLimit(req, res, next);
});
app.use(preventSQLInjection);
app.use(auditLogMiddleware);

// ======================
// Body Parsers & Validation
// ======================
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 50 }));

// Convert request and response bodies between camelCase and snake_case
app.use(caseConverterMiddleware);

// ======================
// Request Logging & Tracing
// ======================
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = crypto.randomUUID();
  req.startTime = process.hrtime();

  const { method, originalUrl, ip } = req;
  res.on('finish', () => {
    const durationInMs = process.hrtime(req.startTime)[1] / 1e6;
    const { statusCode } = res;
    const contentLength = res.get('content-length');
    logger.info(`${method} ${originalUrl} ${statusCode} ${durationInMs.toFixed(2)}ms ${contentLength || 0}b - ${ip}`);
  });
  next();
});

// ======================
// API Routes
// ======================
// Initialize config service for auth
const configService = new ConfigService();

// Auth routes are public and mounted first
const authRouter = createAuthRouter(configService);
app.use('/api/auth', authRouter);

// All other API routes are authenticated
app.use('/api', authenticate);
app.use('/api', enforceOrganizationSecurity);
app.use('/api', apiRoutes);
app.use('/api', customDomainRoutes);

// ======================
// Error Handling & Final Handlers
// ======================
// Use the standardized error adapter first (for new error handling)
// and fall back to legacy error handler for backward compatibility
app.use(standardizedErrorAdapter());
app.use(errorHandler);
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found on this server.' },
  });
});

// ======================
// Server Startup and Shutdown
// ======================
let server: http.Server;

const startServer = async (): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }

    server = app.listen(PORT, HOST, () => {
      logger.info(`✅ Server is running at http://${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      // Add any other cleanup logic here (e.g., close database connections)
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000); // 10 seconds
  } else {
    process.exit(0);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  logger.info('🚀 Starting server...');
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
  const missingEnv = requiredEnv.filter(v => !process.env[v]);
  if (missingEnv.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  startServer();
}

export { app };