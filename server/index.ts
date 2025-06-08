import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { setupVite, serveStatic } from './vite';
import { logger } from './utils/logger';
import config from './config';
import { asyncHandler, commonErrors } from './middleware/errorHandler';
import { validateRequest, commonSchemas } from './middleware/validation';
import { z } from 'zod';
import { extendRequest } from './utils/request';
import { extendResponse } from './utils/response';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import security middleware
import { preventSQLInjection, enforceOrganizationSecurity } from './middleware/security';

// Import routes with type safety
import apiRoutes from './routes/index';
import authRoutes from './routes/auth';

// Middleware
import { globalErrorHandler } from './middleware/globalErrorHandler';
import { trackUserActivity } from './middleware/sessionTracking';
import { performanceMonitor, memoryMonitor, responseCompression } from './middleware/performance';
import { authenticate } from './src/auth/middleware'; // New auth middleware
import { validate } from './utils/validation';

// Re-export types for easier access
export * from '../shared/types';

// Initialize Express app
const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// Performance monitoring
app.use(performanceMonitor);

// Extend request/response objects with our custom methods
app.use(extendRequest);
app.use(extendResponse);
app.use(memoryMonitor);

// Export app for testing
export { app };

// ======================
// Security Middleware
// ======================

// 1. Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
}));

// 2. Enable CORS with secure defaults
app.use(cors({
  origin: config.server.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 600, // 10 minutes
  optionsSuccessStatus: 200
}));

// 3. Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later',
  skip: (req: Request) => {
    // Skip rate limiting for certain paths or in development
    const skipPaths = ['/health', '/api/health'];
    return process.env.NODE_ENV === 'development' || skipPaths.some(path => req.path.startsWith(path));
  }
});

app.use('/api', apiLimiter);

// 4. Prevent SQL injection and other security threats
app.use(preventSQLInjection);

// 5. Enforce organization security for all routes under /api
app.use('/api', enforceOrganizationSecurity);

// ======================
// Rate limiting configuration
const createRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again later',
    skip: (request: Request) => {
      // Skip rate limiting for certain paths or in development
      const skipPaths = ['/health', '/api/health'];
      return process.env.NODE_ENV === 'development' || skipPaths.some(path => request.path.startsWith(path));
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      });
    },
  });
};

// Apply rate limiting to all API routes
app.use('/api', createRateLimiter());

// Apply authentication to API routes
app.use('/api', authenticate);

// Use new auth routes
app.use('/api/auth', authRouter);

// ======================
// Middleware
// ======================
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Add request ID and start time to each request
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  req.startTime = process.hrtime();
  next();
});

// Log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const durationInMs = process.hrtime(start)[1] / 1000000; // Convert to ms
    const { statusCode } = res;
    const contentLength = res.get('content-length');
    
    logger.info(
      `${method} ${originalUrl} ${statusCode} ${durationInMs.toFixed(2)}ms ${contentLength || 0}b - ${ip}`
    );
  });
  
  next();
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// ======================
// Request Validation
// ======================
app.use(express.json({ 
  limit: '10kb',
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb',
  parameterLimit: 50 // Limit number of parameters
}));

// ======================
// Security Headers
// ======================
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'"
  );
  
  next();
});

// ======================
// Request Logging
// ======================
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ======================
// Error Handling
// ======================
// Error handling middleware
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        name: err.name 
      })
    }
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example protected route with validation
app.post(
  '/api/example/:id',
  validateRequest({
    body: z.object({
      name: z.string().min(3).max(100),
      email: z.string().email(),
      age: z.number().int().positive().optional()
    }),
    query: commonSchemas.pagination,
    params: commonSchemas.id
  }),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Type-safe access to validated request data
      const params = req.params as { id: string };  // id is string from URL, will be converted to number by validation
      const query = req.query as { page?: string; limit?: string };
      const body = req.body as { name: string; email: string; age?: number };
      
      // Convert string ID to number (validation ensures it's a valid number)
      const id = parseInt(params.id, 10);
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      
      // Return response with typed data
      return res.status(200).json({ 
        status: 'success',
        data: {
          id,
          ...body,
          pagination: { page, limit }
        } 
      });
    } catch (error) {
      logger.error('Error in example route:', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Error handler - Must be the last middleware
app.use((err: unknown, req: Request, res: Response) => {
  // Handle known error types with statusCode
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const apiError = err as { statusCode: number; message: string; code?: string; stack?: string };
    const response = {
      status: 'error',
      message: apiError.message || 'An error occurred',
      ...(apiError.code && { code: apiError.code }),
      ...(process.env.NODE_ENV !== 'production' && apiError.stack && { stack: apiError.stack })
    };
    
    return res.status(apiError.statusCode).json(response);
  }

  // Handle unexpected errors
  const error = err instanceof Error ? err : new Error('An unknown error occurred');
  logger.error('Unexpected error:', { 
    message: error.message, 
    stack: error.stack, 
    path: req.path 
  });
  
  const response = {
    status: 'error',
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { 
      error: error.message,
      ...(error.stack && { stack: error.stack })
    })
  };
  
  return res.status(500).json(response);
});

// Start the server
const startServer = async (): Promise<void> => {
  try {
    // Run database migrations if needed
    if (process.env.NODE_ENV !== 'test') {
      await runMigrations();
    }
    
    // Start the server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server is running on http://${HOST}:${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      });
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      // Close the server
      server.close((err) => {
        if (err) {
          logger.error('Error during shutdown', { error: err });
          process.exit(1);
        }
        
        logger.info('Server has been stopped');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', { reason });
      shutdown('unhandledRejection');
    });
    
    return new Promise((resolve) => {
      server.on('listening', () => resolve());
    });
  } catch (error) {
    logger.error('Failed to start server:', { error });
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  logger.info('🚀 Starting server...');
  
  // Access server configuration safely
  const serverConfig = config as any;
  const env = serverConfig.server?.env || process.env.NODE_ENV || 'development';
  
  logger.info('Server configuration', {
    environment: env,
    host: HOST,
    port: PORT,
    corsOrigins: serverConfig.server?.corsOrigin || 'Not configured'
  });
  
  // Start the server with proper error handling
  startServer().catch((error: Error) => {
    logger.error('Fatal error during server startup:', { error });
    process.exit(1);
  });
}

// For testing