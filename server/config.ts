/**
 * Platform-agnostic configuration using environment variables
 * This file centralizes all configuration to make deployment easier
 * across different hosting environments
 */

// Note: dotenv is loaded in the entry point file (index.ts)
// This file only reads already loaded environment variables

// Server configuration
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionSecret: process.env.SESSION_SECRET || 'nestmap-dev-secret'
};

// Database configuration
export const DB_CONFIG = {
  url: process.env.DATABASE_URL,
  connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
};

// Branding and white-label configuration
export const BRANDING_CONFIG = {
  defaultAppName: process.env.APP_NAME || 'NestMap',
  defaultPrimaryColor: process.env.PRIMARY_COLOR || '#3B82F6',
  defaultSecondaryColor: process.env.SECONDARY_COLOR || '#64748B',
  defaultAccentColor: process.env.ACCENT_COLOR || '#10B981',
  companyUrl: process.env.COMPANY_URL || 'yourcompany.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
  logoUrl: process.env.LOGO_URL || null
};

// External services configuration
export const SERVICES_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  },
  mapbox: {
    token: process.env.MAPBOX_TOKEN
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY
  }
};

// Validation - check required environment variables
export function validateConfig() {
  const requiredVars = [
    { name: 'DATABASE_URL', value: DB_CONFIG.url },
    { name: 'OPENAI_API_KEY', value: SERVICES_CONFIG.openai.apiKey },
    { name: 'MAPBOX_TOKEN', value: SERVICES_CONFIG.mapbox.token },
    { name: 'SESSION_SECRET', value: SERVER_CONFIG.sessionSecret }
  ];

  const missingVars = requiredVars
    .filter(v => !v.value)
    .map(v => v.name);

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    
    if (SERVER_CONFIG.env === 'production') {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
}

// Export default configuration object
export default {
  server: SERVER_CONFIG,
  db: DB_CONFIG,
  branding: BRANDING_CONFIG,
  services: SERVICES_CONFIG,
  validate: validateConfig
};