/**
 * Test Application Setup
 * Exports the Express app configured for testing
 */

import setupApp from './src/app';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nestmap_test';

// Create and export the app for use in tests
export async function getTestApp() {
  return await setupApp();
}

// For backwards compatibility - this will be a Promise
export const app = setupApp();