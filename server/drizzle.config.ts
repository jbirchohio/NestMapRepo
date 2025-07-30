import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create the database URL
const databaseUrl = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}${process.env.NODE_ENV === 'production' ? '?sslmode=require' : ''}`;

// Define the configuration
export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  // For Drizzle Kit v0.20.0+ with PostgreSQL
  schemaFilter: ['public'],
  // Use the connection string directly in the configuration
  dbCredentials: {
    url: databaseUrl,
  },
  // Specify the dialect
  dialect: 'postgresql',
  // Print all SQL statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
} satisfies Config;
