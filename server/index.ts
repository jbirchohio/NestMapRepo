import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { logger } from './utils/logger.js';

// Import routes
import apiRoutes from './routes/index.js';

// Import middleware
import { caseConverterMiddleware } from './middleware/caseConverter.js';
import { globalErrorHandler } from './utils/errorHandler.js';

// Initialize Express app with proper typing
const app: express.Express = express();

// Simple configuration without complex dependencies
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Basic middleware
app.use(express.json({ limit: '10mb' }) as express.RequestHandler);
app.use(express.urlencoded({ extended: true }) as express.RequestHandler);

// Simple CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Case converter middleware
app.use(caseConverterMiddleware);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// API routes
app.use('/api', apiRoutes);

// Global error handler
app.use(globalErrorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(Number(PORT), HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;