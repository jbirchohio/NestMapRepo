import dotenv from 'dotenv.js';
import path from 'path.js';
import { z } from 'zod.js';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Define the schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  HOST: z.string().default('localhost'),
  BASE_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
  LOG_TO_FILE: z.string().default('false'),
  LOG_DIRECTORY: z.string().default('logs'),
  EMAIL_PROVIDER: z.string().default('sendgrid'),
  STORAGE_PROVIDER: z.string().default('local'),
  APP_NAME: z.string().default('NestMap'),
  COMPANY_NAME: z.string().default('NestMap Inc.'),
});

// Validate environment variables
const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

const env = envVars.data;

interface ServerConfig {
  port: number;
  env: 'development' | 'production' | 'test.js';
  host: string;
  baseUrl: string;
  logLevel: string;
  logToFile: boolean;
  logDirectory: string;
}

interface DbConfig {
  url: string;
  connectionPoolSize: number;
}

interface BrandingConfig {
  appName: string;
  companyName: string;
}

interface ServicesConfig {
  emailProvider: string;
  storageProvider: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface SecurityConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: RateLimitConfig;
  sessionSecret: string;
  passwordSaltRounds: number;
}

interface Config {
  server: ServerConfig;
  db: DbConfig;
  branding: BrandingConfig;
  services: ServicesConfig;
  security: SecurityConfig;
  validate: () => void;
}

// Configuration from validated environment variables
const config: Config = {
  server: {
    port: parseInt(env.PORT, 10),
    env: env.NODE_ENV,
    host: env.HOST,
    baseUrl: env.BASE_URL,
    logLevel: env.LOG_LEVEL,
    logToFile: env.LOG_TO_FILE === 'true',
    logDirectory: env.LOG_DIRECTORY,
  },
  db: {
    url: env.DATABASE_URL,
    connectionPoolSize: 10, // Default pool size
  },
  branding: {
    appName: env.APP_NAME,
    companyName: env.COMPANY_NAME,
  },
  services: {
    emailProvider: env.EMAIL_PROVIDER,
    storageProvider: env.STORAGE_PROVIDER,
  },
  security: {
    jwt: {
      secret: env.JWT_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiry: env.JWT_ACCESS_EXPIRY,
      refreshExpiry: env.JWT_REFRESH_EXPIRY,
    },
    cors: {
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    },
    rateLimit: {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(env.RATE_LIMIT_MAX, 10),
    },
    sessionSecret: env.SESSION_SECRET,
    passwordSaltRounds: 10,
  },
  validate: function validate() {
    // Validation is already handled by Zod schema
    // This function is kept for backward compatibility
    if (process.env.NODE_ENV === 'production') {
      if (config.security.jwt.secret === 'your-jwt-secret') {
        console.error('FATAL: Using default JWT secret in production is not allowed');
        process.exit(1);
      }

      if (config.security.jwt.refreshSecret === 'your-jwt-refresh-secret') {
        console.error('FATAL: Using default JWT refresh secret in production is not allowed');
        process.exit(1);
      }

      if (config.security.sessionSecret === 'your-session-secret') {
        console.error('FATAL: Using default session secret in production is not allowed');
        process.exit(1);
      }
    }
  },
};

// Validate configuration on startup
config.validate();

export default config;
