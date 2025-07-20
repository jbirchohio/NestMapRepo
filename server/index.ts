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
  // Absolute path first
  'C:\\Users\\Jonas\\Desktop\\NestMapRepo\\.env',
  // Relative to current working directory
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  // Relative to script location (may not work in bundled builds)
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env')
];

let envLoaded = false;
console.log('🔍 Checking for .env file in the following paths:');
for (const envPath of possibleEnvPaths) {
  const exists = fs.existsSync(envPath);
  console.log(`   ${envPath}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  if (exists) {
    console.log(`📁 Loading .env from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`❌ Error loading .env: ${result.error}`);
    } else {
      console.log(`✅ Environment loaded successfully`);
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found in any of the expected locations');
  console.warn('⚠️  Trying to load from process.env directly...');
}

// Final check
console.log(`📋 Final environment check:`);
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   PORT: ${process.env.PORT || 'undefined'}`);

// If still not loaded, try one more time with the absolute path
if (!process.env.SUPABASE_URL) {
  console.log('🔄 Attempting final load with absolute path...');
  const finalPath = 'C:\\Users\\Jonas\\Desktop\\NestMapRepo\\.env';
  if (fs.existsSync(finalPath)) {
    dotenv.config({ path: finalPath, override: true });
    console.log(`🔄 Final attempt result - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  }
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { logger } from './utils/logger';

// Import authentication middleware
import { authenticate } from './middleware/secureAuth';

// Import route handlers
import authRoutes from './routes/auth-simple';
import flightRoutes from './routes/flights';
import organizationRoutes from './routes/organizations';
import tripRoutes from './routes/trips-simple';
import aiRoutes from './routes/ai-routes';
import enterpriseRoutes from './routes/enterprise-routes';
import comprehensiveRoutes from './routes/comprehensive-routes';
import onboardingFeedbackRoutes from './routes/onboarding-feedback';

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
app.use('/api/onboarding-feedback', authenticate, onboardingFeedbackRoutes);

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