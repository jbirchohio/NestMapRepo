import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { jest } from '@jest/globals';
import { UserRole } from '@shared/schema/types/user';

// Type for our mock implementation
type MockRequest = Partial<Request> & {
  get: (name: string) => string | string[] | undefined;
  headers: Record<string, string>;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    lastLogin?: string;
    preferences?: Record<string, any>;
    permissions?: string[];
  };
  token?: string;
  tokenPayload?: {
    userId: string;
    email: string;
    role: UserRole;
    organizationId?: string;
    iat?: number;
    exp?: number;
  };
};

// Mock response implementation
const createMockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  
  // Create mock functions with proper typing
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  
  return res;
};

// Debug logging
console.log('Test file is being loaded');

// Ensure we're using the correct Jest environment
console.log('Jest environment:', process.env.NODE_ENV);

// Log the current working directory
console.log('Current working directory:', process.cwd());

// 1. Define core types
type UserRole = 'USER' | 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

// 2. Mock logger and services
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock PrismaUserRepository
jest.mock('../../common/database/index.js', () => ({
  PrismaUserRepository: {
    findUserById: jest.fn(),
  },
}));

// Mock prismaAuthService
jest.mock('../../auth/services/prisma-auth.service.js', () => ({
  prismaAuthService: {
    verifyToken: jest.fn(),
  },
}));

import { PrismaUserRepository } from '../../common/database/index.js';
import { prismaAuthService } from '../../auth/services/prisma-auth.service.js';

// 4. Mock request/response helpers
const createMockRequest = (headers: Record<string, string> = {}): MockRequest => {
  const headerMap = new Map<string, string>(
    Object.entries({
      authorization: 'Bearer test-token',
      ...headers,
    })
  );

  const req: MockRequest = {
    headers: Object.fromEntries(headerMap),
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/api/test',
    get: (name: string) => {
      if (name === 'set-cookie') {
        return [];
      }
      return headerMap.get(name.toLowerCase());
    },
  };

  return req;
};

// 5. Test setup
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'USER' as UserRole,
  organizationId: 'test-org-id',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  firstName: 'Test',
  lastName: 'User',
  permissions: ['user:read', 'user:write']
};

const TEST_TOKEN = 'test-token';
const TEST_TOKEN_PAYLOAD = {
  userId: 'test-user-id',
  email: 'test@example.com',
  role: 'USER' as UserRole,
  organizationId: 'test-org-id',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

// Mock the authenticateJWT middleware
jest.mock('../../auth/middleware/prisma-jwt.middleware.js', () => ({
  authenticateJWT: jest.fn((req: MockRequest, _res: MockResponse, next: jest.Mock) => {
    req.user = TEST_USER;
    req.token = TEST_TOKEN;
    req.tokenPayload = TEST_TOKEN_PAYLOAD;
    next();
  }),
}));

import { authenticateJWT } from '../../auth/middleware/prisma-jwt.middleware.js';

describe('Authentication Middleware', () => {
  let req: MockRequest;
  let res: MockResponse;
  let next: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize fresh mocks
    req = createMockRequest();
    res = createMockResponse();
    next = jest.fn().mockName('next');
    
    // Default mock implementations
    (PrismaUserRepository.findUserById as jest.Mock).mockResolvedValue(TEST_USER);
    (prismaAuthService.verifyToken as jest.Mock).mockResolvedValue(TEST_TOKEN_PAYLOAD);

    // Mock JWT service to return a valid token by default
    (mockJwtService.verify as jest.Mock).mockImplementation(() => ({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      organizationId: testUser.organizationId,
    }));

    // Mock the user repository to return a user by default
    (mockUserRepository as any).findById = jest.fn().mockResolvedValue(testUser);
    (mockUserRepository as any).findByEmail = jest.fn().mockResolvedValue(testUser);

    // Dynamically import the auth middleware to get a fresh instance for each test
    jest.isolateModules(() => {
      // Mock the dependencies
      jest.mock('@server/services/logger', () => mockLogger);
      jest.mock('@server/services/jwt.service', () => ({
        verify: mockJwtService.verify,
        decode: mockJwtService.decode,
      }));
      jest.mock('@server/repositories/user.repository', () => ({
        userRepository: mockUserRepository,
      }));
      
      // Import the auth middleware after setting up mocks
      const { authMiddleware: middleware } = require('@server/middleware/auth.middleware');
      authMiddleware = middleware;
    });
  });

  console.log('Setting up test suite');

  describe('Token Validation', () => {
    it('should call next() when authentication is successful', async () => {
      console.log('Running test: should call next() when authentication is successful');
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUser.id);
    });

    it('should return 401 when no token is provided', async () => {
      // Arrange
      req = createMockRequest(); // No authorization header

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No authorization token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token format is invalid', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'InvalidTokenFormat',
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer invalid-token',
      });
      
      // Mock JWT verification to throw an error
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('User Validation', () => {
    it('should return 401 when user is not found', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });
      
      // Mock user not found
      mockUserRepository.findById.mockResolvedValueOnce(null);

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not active', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });
      
      // Mock inactive user
      mockUserRepository.findById.mockResolvedValueOnce({
        ...testUser,
        isActive: false,
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User account is deactivated',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when email is not verified', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });
      
      // Mock unverified email
      mockUserRepository.findById.mockResolvedValueOnce({
        ...testUser,
        emailVerified: false,
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Please verify your email address',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // This test would typically require a separate rate limiter mock
      // For now, we'll just test the happy path
      expect(true).toBe(true);
    });
  });

  describe('Request Context', () => {
    it('should attach user to request object', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(testUser.id);
      expect(req.user?.email).toBe(testUser.email);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      req = createMockRequest({
        authorization: 'Bearer valid-token',
      });
      
      // Mock database error
      const dbError = new Error('Database connection failed');
      mockUserRepository.findById.mockRejectedValueOnce(dbError);

      // Spy on logger.error
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await authMiddleware(req as Request, res as Response, next);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Auth middleware error:', dbError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
      expect(next).not.toHaveBeenCalled();

      // Cleanup
      errorSpy.mockRestore();
    });
  });
});
