/**
 * Application constants and configuration
 * All values can be overridden via environment variables
 */

export const CONFIG = {
  // Authentication
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),

  // Cache Configuration
  CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '500'),
  CACHE_MAX_MEMORY_MB: parseInt(process.env.CACHE_MAX_MEMORY_MB || '50'),
  CACHE_TTL_LOCATION: parseInt(process.env.CACHE_TTL_LOCATION || '259200'), // 3 days
  CACHE_TTL_ACTIVITY: parseInt(process.env.CACHE_TTL_ACTIVITY || '604800'), // 7 days
  CACHE_TTL_RESTAURANT: parseInt(process.env.CACHE_TTL_RESTAURANT || '86400'), // 1 day
  CACHE_TTL_WEATHER: parseInt(process.env.CACHE_TTL_WEATHER || '10800'), // 3 hours
  CACHE_TTL_DEFAULT: parseInt(process.env.CACHE_TTL_DEFAULT || '43200'), // 12 hours

  // AI Configuration
  AI_MODEL: process.env.AI_MODEL || 'gpt-3.5-turbo',
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '1000'),
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.7'),

  // Template Marketplace
  PLATFORM_FEE_PERCENTAGE: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '0.20'), // 20%
  STRIPE_FEE_PERCENTAGE: parseFloat(process.env.STRIPE_FEE_PERCENTAGE || '0.029'), // 2.9%
  STRIPE_FEE_FIXED: parseFloat(process.env.STRIPE_FEE_FIXED || '0.30'), // $0.30

  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100'),

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  // Database
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2'),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10'),
  DB_TIMEOUT: parseInt(process.env.DB_TIMEOUT || '30000'),

  // Server
  PORT: parseInt(process.env.PORT || '5000'),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5000',

  // Session (if re-enabled)
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 days

  // Feature Flags
  ENABLE_SIGNUPS: process.env.ENABLE_SIGNUPS !== 'false',
  ENABLE_TEMPLATES: process.env.ENABLE_TEMPLATES !== 'false',
  ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES !== 'false',
  ENABLE_VIATOR: process.env.ENABLE_VIATOR === 'true',
  ENABLE_STRIPE: process.env.ENABLE_STRIPE === 'true',
};

// Validate required configuration
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate in production
  if (process.env.NODE_ENV === 'production') {
    const productionRequired = [
      'CORS_ORIGIN',
    ];

    const productionMissing = productionRequired.filter(key => !process.env[key]);

    if (productionMissing.length > 0) {
      throw new Error(`Missing required production environment variables: ${productionMissing.join(', ')}`);
    }
  }
}

export default CONFIG;