/**
 * Platform-agnostic configuration using environment variables
 * This file centralizes all configuration to make deployment easier
 * across different hosting environments
 */

// Note: dotenv is loaded in the entry point file (index.ts)
// This file only reads already loaded environment variables

// Server configuration
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || process.env.SERVER_PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigin: getCorsOrigin(),
  sessionSecret: getSessionSecret(),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.BASE_URL || `http://localhost:${parseInt(process.env.PORT || process.env.SERVER_PORT || '5000', 10)}`
};

// Secure CORS origin configuration - no insecure defaults in production
function getCorsOrigin(): string | string[] {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    if (!process.env.CORS_ORIGIN) {
      throw new Error('CORS_ORIGIN environment variable is required in production');
    }
    // Support comma-separated multiple origins
    const origins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    return origins.length === 1 ? origins[0] : origins;
  }
  
  // Development fallback - clearly marked
  return process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173';
}

// Secure session secret configuration - no insecure defaults in production  
function getSessionSecret(): string {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return process.env.SESSION_SECRET;
  }
  
  // Development fallback - clearly marked as insecure
  console.warn('⚠️  Using development SESSION_SECRET - NOT suitable for production');
  return process.env.SESSION_SECRET || 'nestmap-dev-secret-INSECURE';
}

// Database configuration
export function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    const projectRef = supabaseUrl.hostname.split('.')[0];
    return `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;
  }
  return undefined;
}

export const DB_CONFIG = {
  url: getDatabaseUrl(),
  connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
};

// Branding and white-label configuration
export const BRANDING_CONFIG = {
  defaultAppName: process.env.APP_NAME || 'NestMap',
  defaultPrimaryColor: process.env.PRIMARY_COLOR || '#3B82F6',
  defaultSecondaryColor: process.env.SECONDARY_COLOR || '#64748B',
  defaultAccentColor: process.env.ACCENT_COLOR || '#10B981',
  companyUrl: process.env.COMPANY_URL || (process.env.BASE_URL ? new URL(process.env.BASE_URL).hostname : 'nestmap.app'),
  supportEmail: process.env.SUPPORT_EMAIL || `support@${process.env.BASE_URL ? new URL(process.env.BASE_URL).hostname : 'nestmap.app'}`,
  logoUrl: process.env.LOGO_URL || null,
  privacyUrl: process.env.PRIVACY_URL,
  termsUrl: process.env.TERMS_URL,
  helpUrl: process.env.HELP_URL
};

// JWT configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  passwordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h'
};

// External services configuration
export const SERVICES_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  },
  mapbox: {
    // Unified Mapbox token - use VITE_MAPBOX_TOKEN for both client and server
    token: process.env.VITE_MAPBOX_TOKEN
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY
  }
};

// Validation - check required environment variables
export function validateConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const requiredVars = [
    { name: 'DATABASE_URL or SUPABASE_URL/SUPABASE_DB_PASSWORD', value: DB_CONFIG.url },
    { name: 'VITE_MAPBOX_TOKEN', value: SERVICES_CONFIG.mapbox.token }
  ];

  // Production-only required variables (handled by their getter functions)
  if (env === 'production') {
    requiredVars.push(
      { name: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN },
      { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET }
    );
  }

  // Optional but recommended variables
  const recommendedVars = [
    { name: 'OPENAI_API_KEY', value: SERVICES_CONFIG.openai.apiKey },
  ];

  const missingRequired = requiredVars
    .filter(v => !v.value)
    .map(v => v.name);

  const missingRecommended = recommendedVars
    .filter(v => !v.value)
    .map(v => v.name);

  if (missingRequired.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingRequired.join(', ')}`;
    console.error(errorMsg);
    
    if (env === 'production') {
      throw new Error(errorMsg);
    }
  }

  if (missingRecommended.length > 0 && env !== 'test' && env !== 'development') {
    console.warn(`⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    console.warn('   Some features may be disabled or use fallback implementations');
  }
}

// Export default configuration object
export default {
  server: SERVER_CONFIG,
  db: DB_CONFIG,
  branding: BRANDING_CONFIG,
  services: SERVICES_CONFIG,
  jwt: JWT_CONFIG,
  validate: validateConfig
};