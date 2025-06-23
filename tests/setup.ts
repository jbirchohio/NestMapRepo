/**
 * Test setup configuration for Jest
 * Enterprise acquisition readiness - testing infrastructure
 */
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/nestmap_test';
// Global test timeout
jest.setTimeout(30000);
// Setup before all tests
beforeAll(async () => {
    // Initialize test database if needed
    console.log('Setting up test environment...');
});
// Cleanup after all tests
afterAll(async () => {
    // Close database connections and cleanup
    console.log('Cleaning up test environment...');
});
// Setup before each test
beforeEach(async () => {
    // Reset database state or create fresh data for each test
});
// Cleanup after each test
afterEach(async () => {
    // Clean up any test data or state
});
// Mock external services for testing
jest.mock('../server/amadeus', () => ({
    searchFlights: jest.fn(),
    searchHotels: jest.fn(),
    searchActivities: jest.fn(),
}));
jest.mock('../server/openWeatherMap', () => ({
    getWeather: jest.fn(),
}));
// Suppress console logs in tests unless specifically needed
if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}
