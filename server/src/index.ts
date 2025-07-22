import { config } from 'dotenv';
import path from 'path';
import app from './app';
import { logger } from './utils/logger';
import { connectDatabase } from './db/connection';

// Load environment variables from monorepo root
// Try multiple possible paths to find the root .env file
const possibleEnvPaths = [
  path.resolve(process.cwd(), '../.env'),  // From server directory
  path.resolve(__dirname, '../../.env'),   // From dist directory
  path.resolve(__dirname, '../../../.env') // From nested dist
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  try {
    const result = config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ Could not load .env file from any expected location');
  console.log('Trying paths:', possibleEnvPaths);
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    // Initialize database connection (optional for testing)
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (dbError: any) {
      logger.warn('Database connection failed, continuing without database:', dbError.message);
    }

    // Start the server using http.createServer for better control
    const http = require('http');
    
    const server = http.createServer(app);
    
    server.listen(Number(PORT), HOST, () => {
      const address = server.address();
      const actualPort = typeof address === 'string' ? PORT : address?.port || PORT;
      const actualHost = HOST || 'localhost';
      
      logger.info(`🚀 Server is running on: http://${actualHost}:${actualPort}`);
      logger.info(`📋 Health check: http://${actualHost}:${actualPort}/health`);
      logger.info(`🔐 Auth API: http://${actualHost}:${actualPort}/api/auth`);
      logger.info(`👤 User API: http://${actualHost}:${actualPort}/api/user`);
      logger.info(`🛡️  Admin API: http://${actualHost}:${actualPort}/api/admin`);
      logger.info(`📋 Bookings API: http://${actualHost}:${actualPort}/api/bookings`);
      logger.info(`✅ Approvals API: http://${actualHost}:${actualPort}/api/approvals`);
      logger.info(`📊 Analytics API: http://${actualHost}:${actualPort}/api/analytics`);
      logger.info(`📄 Invoices API: http://${actualHost}:${actualPort}/api/invoices`);
      logger.info(`💳 Corporate Cards API: http://${actualHost}:${actualPort}/api/corporate-cards`);
      logger.info(`✈️  Flights API: http://${actualHost}:${actualPort}/api/flights`);
      logger.info(`🏢 Organizations API: http://${actualHost}:${actualPort}/api/organizations`);
      logger.info(`🗺️  Trips API: http://${actualHost}:${actualPort}/api/trips`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

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
          throw error;
      }
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

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
