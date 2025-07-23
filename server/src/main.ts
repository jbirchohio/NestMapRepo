import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from './utils/logger.js';
import { startServer } from './server.js';
import { connectDatabase as initializeDatabase } from './db/connection.js';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment loading
console.log('🔍 Environment Loading Debug:');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Try to find and load .env file
const possibleEnvPaths = [
  path.join(process.cwd(), '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
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

// Log environment status
console.log(`📋 Environment check:
   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET ❌'}
   JWT_SECRET: ${process.env.JWT_SECRET ? 'SET ✅' : 'NOT SET ❌'}
   NODE_ENV: ${process.env.NODE_ENV || 'development'}
   PORT: ${process.env.PORT || '5000'}`);

// Main application startup
async function main(): Promise<void> {
  try {
    // Initialize database connection (optional)
    try {
      logger.info('🔌 Attempting database connection...');
      await initializeDatabase();
      logger.info('✅ Database connection established');
    } catch (dbError) {
      logger.warn('⚠️ Database connection failed - continuing without database:');
      logger.warn(dbError instanceof Error ? dbError.message : String(dbError));
      logger.info('🚀 Server will start with limited functionality');
    }

    // Start the Express server
    await startServer();
    
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
