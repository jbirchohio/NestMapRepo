// Environment variables configuration
// All sensitive and environment-specific values should be defined here

interface EnvConfig {
  // Token Configuration
  TOKEN_REFRESH_INTERVAL: number;
  TOKEN_ROTATION_INTERVAL: number;
  REFRESH_TOKEN_THRESHOLD: number;
  SESSION_TIMEOUT: number;
  
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;
  
  // Security
  SECURE_COOKIE_OPTIONS: {
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    httpOnly: boolean;
    path?: string;
  };
  
  // Feature Flags
  ENABLE_DEVELOPER_TOOLS: boolean;
  ENABLE_ANALYTICS: boolean;
}

// Default values (will be overridden by environment variables)
const defaultConfig: EnvConfig = {
  // Token defaults (in milliseconds)
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  TOKEN_ROTATION_INTERVAL: 30 * 60 * 1000, // 30 minutes
  REFRESH_TOKEN_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiration
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  
  // API defaults
  API_BASE_URL: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:3000',
  API_TIMEOUT: 30000, // 30 seconds
  
  // Security defaults
  SECURE_COOKIE_OPTIONS: {
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    httpOnly: true,
    path: '/',
  },
  
  // Feature flags
  ENABLE_DEVELOPER_TOOLS: import.meta.env.DEV,
  ENABLE_ANALYTICS: import.meta.env.PROD,
};

// Merge environment variables with defaults
const config: EnvConfig = {
  ...defaultConfig,
  // Override with environment variables if they exist
  ...(import.meta.env.VITE_TOKEN_REFRESH_INTERVAL && {
    TOKEN_REFRESH_INTERVAL: parseInt(import.meta.env.VITE_TOKEN_REFRESH_INTERVAL, 10),
  }),
  ...(import.meta.env.VITE_TOKEN_ROTATION_INTERVAL && {
    TOKEN_ROTATION_INTERVAL: parseInt(import.meta.env.VITE_TOKEN_ROTATION_INTERVAL, 10),
  }),
  ...(import.meta.env.VITE_REFRESH_TOKEN_THRESHOLD && {
    REFRESH_TOKEN_THRESHOLD: parseInt(import.meta.env.VITE_REFRESH_TOKEN_THRESHOLD, 10),
  }),
  ...(import.meta.env.VITE_SESSION_TIMEOUT && {
    SESSION_TIMEOUT: parseInt(import.meta.env.VITE_SESSION_TIMEOUT, 10),
  }),
};

export default config;
