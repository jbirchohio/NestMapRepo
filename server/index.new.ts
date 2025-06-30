import 'dotenv/config';
import express, { type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import http from 'http';
import type { Server, AddressInfo } from 'net';
import { logger } from './utils/logger.js';

// Import Prisma service and middleware
import { prisma } from './src/core/database/prisma.js';
import { 
  ensureDbConnection, 
  prismaContextMiddleware, 
  handlePrismaErrors 
} from './src/core/middleware/prisma.middleware.js';

// Import our dependency container
import { container } from './src/common/container.js';

// Import routes
import { setupRoutes } from './routes/index.js';

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Initialize Prisma client
prisma.connect()
  .then(() => {
    logger.info('Prisma client connected successfully');
  })
  .catch((error) => {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  });

// Basic middleware with proper type handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Ensure database connection is available
app.use(ensureDbConnection);

// CORS middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  next();
});

// Add Prisma context middleware
app.use(prismaContextMiddleware);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Setup routes with dependency injection
setupRoutes(app, container);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    code: 'NOT_FOUND',
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', { error: err });

  // Handle JWT errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.errors,
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

// Add Prisma error handler
app.use(handlePrismaErrors);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Start the server
const startServer = async () => {
  try {
    await new Promise<void>((resolve, reject) => {
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          reject(error);
          return;
        }

        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            logger.error(`Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            logger.error(`Port ${PORT} is already in use`);
            process.exit(1);
            break;
          default:
            reject(error);
        }
      });

      server.on('listening', () => {
        const address = server.address() as AddressInfo;
        logger.info(`Server listening on ${HOST}:${address.port} in ${NODE_ENV} mode`);
        resolve();
      });

      server.listen(PORT, HOST);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received: shutting down server`);
  
  try {
    // Close the HTTP server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Disconnect Prisma client
    await prisma.disconnect();
    
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export the Express app for testing and programmatic use
export { app, server };
