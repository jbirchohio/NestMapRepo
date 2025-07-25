/**
 * Test setup configuration for Jest
 * Enterprise acquisition readiness - testing infrastructure
 */

import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/nestmap_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

// Global test timeout
jest.setTimeout(30000);

// Mock the logger first
const mockLogger = {
  info: jest.fn().mockImplementation(() => {}),
  error: jest.fn().mockImplementation(() => {}),
  warn: jest.fn().mockImplementation(() => {}),
  debug: jest.fn().mockImplementation(() => {}),
  stream: {
    write: jest.fn().mockImplementation(() => {})
  }
};

jest.mock('../server/src/utils/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
  __esModule: true
}));

// Enable manual mocks
jest.mock('../server/src/db/connection');

// Setup before all tests
beforeAll(async () => {
  // Initialize test database if needed
  console.log('Setting up test environment...');
  
  // Set up process exit handlers to catch Jest teardown
  const originalExit = process.exit;
  process.exit = ((code?: number) => {
    (global as any).__JEST_TEARDOWN_IN_PROGRESS__ = true;
    return originalExit(code);
  }) as any;
  
  // Also listen for other teardown signals
  process.on('beforeExit', () => {
    (global as any).__JEST_TEARDOWN_IN_PROGRESS__ = true;
  });
});

// Cleanup after all tests
afterAll(async () => {
  // Set teardown flag to prevent route loading errors
  (global as any).__JEST_TEARDOWN_IN_PROGRESS__ = true;
  
  // Close database connections and cleanup
  console.log('Cleaning up test environment...');
  
  // Add a timeout to prevent race conditions
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clear any global state
  if (global.__TEST_EMAIL__) {
    global.__TEST_EMAIL__ = undefined;
  }
  if (global.__CURRENT_TEST_REQUEST__) {
    global.__CURRENT_TEST_REQUEST__ = undefined;
  }
});

// Setup before each test
beforeEach(async () => {
  // Reset database state or create fresh data for each test
  global.__TEST_EMAIL__ = undefined;
  global.__CURRENT_TEST_REQUEST__ = undefined;
});

// Cleanup after each test
afterEach(async () => {
  // Clean up any test data or state
  global.__TEST_EMAIL__ = undefined;
  global.__CURRENT_TEST_REQUEST__ = undefined;
  
  // Allow any pending promises to resolve
  await new Promise(resolve => setImmediate(resolve));
});

// Mock external services for testing (only mock services that exist)
// jest.mock('../server/amadeus', () => ({
//   searchFlights: jest.fn(),
//   searchHotels: jest.fn(),
//   searchActivities: jest.fn(),
// }));

// jest.mock('../server/openWeatherMap', () => ({
//   getWeather: jest.fn(),
// }));

// Suppress console logs in tests unless specifically needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}