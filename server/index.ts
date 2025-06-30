import 'dotenv/config';
import express, { type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import http from 'http';
import type { Server, AddressInfo } from 'net';
import { logger } from './utils/logger.js';

// Import Prisma service and middleware
import { prisma } from './src/core/database/prisma.js';
import { ensureDbConnection, prismaContextMiddleware, handlePrismaErrors } from './src/core/middleware/prisma.middleware.js';

// Import SecureAuth middleware as JWT source of truth
import { authenticate } from './middleware/secureAuth.js';

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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
});

// Add Prisma context middleware (after auth but before routes)
app.use(prismaContextMiddleware);

// Protected route example using SecureAuth
app.get('/api/auth/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Example of using Prisma in a route
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get user from database using Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        // Add other fields as needed
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Basic API routes
app.get('/api/test', (_req: Request, res: Response) => {
    res.json({
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError' || 
      err.name === 'PrismaClientUnknownRequestError' ||
      err.name === 'PrismaClientRustPanicError' ||
      err.name === 'PrismaClientValidationError' ||
      err.name === 'PrismaClientInitializationError') {
    return handlePrismaErrors(err, _req, res, _next);
  }
  
  // Handle other errors
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(NODE_ENV === 'development' && { 
      error: err.message, 
      stack: err.stack,
      name: err.name
    })
  });
};

// Add Prisma error handler
app.use(handlePrismaErrors);
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Create HTTP server
const server: Server = http.createServer(app);

// Start server
server.listen(PORT, HOST, () => {
    const address = server.address();
    let host: string;
    
    if (typeof address === 'string') {
        host = address;
    } else if (address) {
        host = `${address.address === '::' ? 'localhost' : address.address}:${address.port}`;
    } else {
        host = `${HOST}:${PORT}`;
    }
    
    logger.info(`Server running on ${host}`);
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Health check: http://${host}/health`);
    logger.info('Using SecureAuth as JWT authentication source of truth');
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received: starting graceful shutdown`);
  
  // Close HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close Prisma client
      await prisma.disconnect();
      logger.info('Prisma client disconnected');
    } catch (error) {
      logger.error('Error during Prisma client disconnection:', error);
    }
    
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export the Express app for testing and programmatic use
export { app };

// For backward compatibility
export default app;
