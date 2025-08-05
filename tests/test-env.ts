/**
 * Test environment setup - must be imported before any database imports
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment variables
process.env.NODE_ENV = 'test';

// Ensure DATABASE_URL is set for tests
if (!process.env.DATABASE_URL) {
  // Use the Neon database for tests (ideally should be a separate test database)
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_heyosY71KqiV@ep-lingering-pine-aez2izws-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
}

// Set test-specific secrets
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing';

// Disable external services for testing
process.env.DUFFEL_API_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.SENDGRID_API_KEY = 'SG.test-key';

export {};