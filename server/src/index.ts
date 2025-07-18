import { config } from 'dotenv';
import path from 'path';
import app from './app.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './db/connection.js';

// Load environment variables from parent directory
config({ path: path.resolve(process.cwd(), '../.env') });

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
