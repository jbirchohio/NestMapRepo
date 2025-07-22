/**
 * Test Application Setup
 * Exports the Express app configured for testing
 */

import app from './src/app';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nestmap_test';

// Export the app for use in tests
export { app };