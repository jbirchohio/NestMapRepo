import 'dotenv/config.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { logger } from './utils/logger.js';

// Import authentication middleware
import { authenticate } from './middleware/secureAuth.js';

// Import route handlers
import authRoutes from './routes/auth-simple.js';
import flightRoutes from './routes/flights.js';
import organizationRoutes from './routes/organizations.js';
import tripRoutes from './routes/trips-simple.js';
import aiRoutes from './routes/ai-routes.js';
import enterpriseRoutes from './routes/enterprise-routes.js';
import comprehensiveRoutes from './routes/comprehensive-routes.js';

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.duffel.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    next();
  });
}

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (require JWT authentication)
app.use('/api/flights', authenticate, flightRoutes);
app.use('/api/organizations', authenticate, organizationRoutes);
app.use('/api/trips', authenticate, tripRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/enterprise', authenticate, enterpriseRoutes);
app.use('/api/comprehensive', authenticate, comprehensiveRoutes);

// Health check route
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  if (NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
  
  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide valid authentication credentials'
    });
  }
  
  if (error.name === 'ForbiddenError' || error.status === 403) {
    return res.status(403).json({
      success: false,
      error: 'Access forbidden',
      message: 'You do not have permission to access this resource'
    });
  }
  
  if (error.status === 400) {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: error.message || 'Invalid request'
    });
  }
  
  // Default error response (don't expose internal details)
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(Number(PORT), HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Health check: http://${HOST}:${PORT}/health`);
  logger.info('Using SecureAuth as JWT authentication source of truth');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app;