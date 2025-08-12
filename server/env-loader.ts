/**
 * Environment variable loader that works across different deployment platforms
 * Handles Railway, Vercel, and local development environments
 */

// IMPORTANT: For Railway/Nixpacks, environment variables should already be available
// Only load dotenv for local development
if (!process.env.RAILWAY_ENVIRONMENT && (!process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
  try {
    // Use the CommonJS loader to avoid ESM issues
    await import('./load-env.cjs' as any);
  } catch (error) {
    console.log('ℹ️  Could not load environment variables:', error);
  }
}

// Railway-specific environment variable handling
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🚂 Running on Railway platform');
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