// Import jest explicitly for ESM compatibility
import { jest } from '@jest/globals';

// Create mock objects
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  on: jest.fn(),
  isOpen: true,
};

const mockJwt = {
  verify: jest.fn((token, secret, callback) => {
    if (token === 'valid-token') {
      callback(null, {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
        organizationId: 'org-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
    } else {
      callback(new Error('Invalid token'), null);
    }
  }),
  sign: jest.fn(() => 'mocked-jwt-token'),
  decode: jest.fn(),
};

// Setup module mocks
const setupMocks = () => {
  // Mock the logger
  jest.unstable_mockModule('../../src/utils/logger.js', () => ({
    default: mockLogger,
  }));

  // Mock Prisma client
  jest.unstable_mockModule('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      sql: jest.fn(),
      join: jest.fn(),
      raw: jest.fn(),
    },
  }));

  // Mock Redis
  jest.unstable_mockModule('redis', () => ({
    createClient: jest.fn(() => mockRedisClient),
  }));

  // Mock JWT
  jest.unstable_mockModule('jsonwebtoken', () => mockJwt);
};

// Initialize mocks before any tests run
setupMocks();

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Setup default mock implementations
  mockLogger.child.mockImplementation(() => mockLogger);
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    organizationId: 'org-123',
  });
  mockRedisClient.get.mockResolvedValue(null);
});

afterEach(() => {
  // Clean up after each test
  jest.resetAllMocks();
});

// Export mocks for use in tests
export {
  mockLogger,
  mockPrismaClient,
  mockRedisClient,
  mockJwt,
};

// Export default for ESM compatibility
export default {
  mockLogger,
  mockPrismaClient,
  mockRedisClient,
  mockJwt,
};
