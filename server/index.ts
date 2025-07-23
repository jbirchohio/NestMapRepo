import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Environment Loading Debug:');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('Script filename:', __filename);

// For bundled builds, try more aggressive path resolution
const possibleEnvPaths = [
  // Correct root path for this project
  'c:\\Users\\jbirc\\Desktop\\NestleIn\\NestMapRepo\\.env',
  // Relative paths as fallback
  path.join(process.cwd(), '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (envLoaded) {
  console.log('✅ Environment loaded successfully');
} else {
  console.log('⚠️ No .env file found in any expected location');
}

console.log(`📋 Final environment check:
   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET ❌'}
   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}
   NODE_ENV: ${process.env.NODE_ENV || 'not set'}
   PORT: ${process.env.PORT || 'not set'}`);
console.log('');

// If still not loaded, try one more time with the absolute path
if (!process.env.DATABASE_URL) {
  console.log('🔄 Attempting final load with absolute path...');
  const finalPath = 'c:\\Users\\jbirc\\Desktop\\NestleIn\\NestMapRepo\\.env';
  if (fs.existsSync(finalPath)) {
    dotenv.config({ path: finalPath, override: true });
    console.log(`🔄 Final attempt result - DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  }
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { logger } from './utils/logger';

// Import authentication middleware
import { authenticate } from './middleware/secureAuth';

// Import metrics routes (special case with .js extension)
import metricsRoutes from './routes/metrics.js';

// Debug: Log route imports
console.log('\n🔧 Route Registration Debug:');
console.log('✅ Metrics routes module loaded');
console.log('📝 Registering routes...');
console.log('  - POST /api/metrics - Metrics collection');
console.log('  - GET  /api/metrics/health - Health check');

// Phase 1 Innovation Roadmap Routes
import voiceRoutes from './routes/voice';
import disruptionAlertsRoutes from './routes/disruption-alerts';
import offlineRoutes from './routes/offline';

// Phase 2 Innovation Roadmap Routes
import advancedAnalyticsRoutes from './routes/advanced-analytics';
import customReportingRoutes from './routes/custom-reporting';
import enterpriseIntegrationRoutes from './routes/enterprise-integration';

// Phase 3 Innovation Roadmap Routes (Market Domination)
import platformEcosystemRoutes from './routes/platform-ecosystem';
import predictiveBusinessIntelligenceRoutes from './routes/predictive-business-intelligence';
import iotSmartCityRoutes from './routes/iot-smart-city';
import automationOrchestrationRoutes from './routes/automation-orchestration';

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:5173'];

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

// Import and mount the main router which includes all API routes
import mainRouter from './routes';
app.use('/api', mainRouter);

// Mount metrics routes with debug logging
console.log('\n🔧 Mounting metrics routes...');
app.use('/api/metrics', (req, res, next) => {
  console.log(`📡 Metrics route hit: ${req.method} ${req.originalUrl}`);
  next();
}, metricsRoutes);

// Test route (no auth required)
app.get('/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ 
    success: true, 
    message: 'Test route works!',
    timestamp: new Date().toISOString()
  });
});

// Phase 1 Innovation Roadmap Routes (Voice-First Interface)
app.use('/api/voice', authenticate, voiceRoutes);
app.use('/api/disruption-alerts', authenticate, disruptionAlertsRoutes);
app.use('/api/offline', authenticate, offlineRoutes);

// Phase 2 Innovation Roadmap Routes (Enterprise-Grade Features)
app.use('/api/advanced-analytics', authenticate, advancedAnalyticsRoutes);
app.use('/api/custom-reporting', authenticate, customReportingRoutes);
app.use('/api/enterprise-integration', authenticate, enterpriseIntegrationRoutes);

// Phase 3 Innovation Roadmap Routes (Market Domination)
app.use('/api/platform-ecosystem', authenticate, platformEcosystemRoutes);
app.use('/api/predictive-business-intelligence', authenticate, predictiveBusinessIntelligenceRoutes);
app.use('/api/iot-smart-city', authenticate, iotSmartCityRoutes);
app.use('/api/automation-orchestration', authenticate, automationOrchestrationRoutes);

// Debug: Log registered routes
console.log('\nRegistered routes:');
const printRoutes = (router: any, prefix = '') => {
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      const newPrefix = prefix + (layer.regexp.toString().replace(/^\/\^\\([^\]]*)\\/, '') + '/').replace(/\?<[^>]+>/g, '').replace(/\?/g, '').replace(/\//g, '');
      printRoutes(layer.handle, newPrefix);
    }
  });
};

printRoutes(app._router);

// Health check route
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Database health check route
import dbHealthRouter from './routes/db-health';
app.use('/health', dbHealthRouter);

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

// Import the database initialization function
import { initializeDatabase } from './db-connection';

// Start server with optional database initialization
async function startServer() {
  try {
    // Attempt database connection (non-blocking)
    logger.info('Attempting database connection...');
    try {
      await initializeDatabase();
      logger.info('✅ Database connection established successfully');
    } catch (dbError) {
      logger.warn('⚠️ Database connection failed - starting server without database:');
      logger.warn('Database error:', dbError instanceof Error ? dbError.message : dbError);
      logger.info('🚀 Server will start with limited functionality (API endpoints will return mock data)');
    }

    // Start the server (always start, regardless of database status)
    server.listen(Number(PORT), HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`🔐 Authentication: JWT (SecureAuth)`);
      logger.info(`📊 API Documentation: http://${HOST}:${PORT}/api`);
      
      // Log available environment variables for debugging
      const envStatus = {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'
      };
      logger.info('📝 Environment variables status:', envStatus);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

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