#!/usr/bin/env node

/**
 * Standard application startup script
 * Works consistently across all platforms and environments
 */

// Load environment variables from .env file if present
try {
  require('dotenv').config();
} catch (err) {
  console.log('dotenv not available, using process.env');
}

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

console.log(`Starting NestMap in ${NODE_ENV} mode on port ${PORT}`);

// Check for required environment variables
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
  if (NODE_ENV === 'production') {
    console.error('Production environment requires all variables to be set');
    process.exit(1);
  }
}

// Load the appropriate script based on environment
if (NODE_ENV === 'production') {
  console.log('Loading production server...');
  require('../server/dist/main.mjs');
} else {
  console.log('Loading development server...');
  // Use dynamic import for ESM compatibility
  import('../server/src/main.js').catch(err => {
    console.error('Failed to start development server:', err);
    process.exit(1);
  });
}