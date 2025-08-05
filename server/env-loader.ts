/**
 * Environment variable loader that works across different deployment platforms
 * Handles Railway, Vercel, and local development environments
 */

// IMPORTANT: For Railway/Nixpacks, environment variables should already be available
// Only load dotenv for local development
if (!process.env.RAILWAY_ENVIRONMENT && (!process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
  try {
    require('dotenv').config();
    console.log('✅ Loaded .env file for development');
  } catch (error) {
    console.log('ℹ️  No .env file found, using environment variables');
  }
}

// Railway-specific environment variable handling
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🚂 Running on Railway platform');
  console.log('🔍 Railway environment variables check:', {
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
    RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
    NODE_ENV: process.env.NODE_ENV,
    // Check if our custom variables are loaded
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    SESSION_SECRET_EXISTS: !!process.env.SESSION_SECRET,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
  });
}

// Validate critical environment variables early
export function validateEnvironment() {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
  }

  // Special handling for CORS_ORIGIN in production
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    console.error('❌ CORS_ORIGIN is required in production');
    console.log('📋 Available environment variables:', Object.keys(process.env).sort());
  }
}

// Run validation
validateEnvironment();