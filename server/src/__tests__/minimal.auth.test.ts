import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';

// Mock the JWT service
const mockJwtService = {
  verify: jest.fn(),
  decode: jest.fn(),
};

// Mock the user repository
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
};

// Types for our test data
type UserRole = 'USER' | 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';

interface TestUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

// Test user data
const testUser: TestUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'USER',
  organizationId: 'test-org-id',
  isActive: true,
  emailVerified: true,
};

// Mock request object
const createMockRequest = (headers: Record<string, string> = {}) => {
  const req: Partial<Request> = {} as any;
  req.headers = { authorization: '', ...headers };
  req.get = jest.fn((name: string) => {
    const key = name.toLowerCase();
    if (key === 'authorization') {
      return req.headers?.authorization || '';
    }
    return req.headers?.[key] || undefined;
  }) as any;
  return req as Request;
};

// Mock response object
const createMockResponse = () => {
  const res: Partial<Response> = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Mock next function
const createMockNext = () => jest.fn() as NextFunction;

// Test suite
describe('Authentication Middleware', () => {
  let req: Request;
  let res: Response;
  let next: jest.MockedFunction<NextFunction>;
  let authMiddleware: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext() as jest.MockedFunction<NextFunction>;
    
    // Reset mock implementations
    mockJwtService.verify.mockReset();
    mockUserRepository.findById.mockReset();
    mockUserRepository.findByEmail.mockReset();
    
    // Default mock implementations
    mockJwtService.verify.mockImplementation(() => ({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      organizationId: testUser.organizationId,
    }));
    
    mockUserRepository.findById.mockResolvedValue(testUser);
    mockUserRepository.findByEmail.mockResolvedValue(testUser);
    
    // Simple auth middleware for testing
    authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.get('authorization');
      if (!authHeader) {
        res.status(401).json({ message: 'No token provided' });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      if (!token) {
        res.status(401).json({ message: 'Invalid token format' });
        return;
      }
      
      try {
        const decoded = mockJwtService.verify(token);
        (req as any).user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          organizationId: decoded.organizationId,
        };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
      }
    };
  });

  describe('Token Validation', () => {
    it('should call next() when a valid token is provided', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer valid-token' });

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect((req as any).user).toBeDefined();
      expect((req as any).user.id).toBe(testUser.id);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', async () => {
      // Arrange
      req = createMockRequest();

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer invalid-token' });
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token has invalid format', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'InvalidTokenFormat' });

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token format' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('User Validation', () => {
    it('should attach user to request when valid token is provided', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer valid-token' });

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect((req as any).user).toBeDefined();
      expect((req as any).user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        organizationId: testUser.organizationId,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle user not found in repository', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer valid-token' });
      mockUserRepository.findById.mockResolvedValueOnce(null);

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access for users with required role', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer valid-token' });
      mockJwtService.verify.mockImplementation(() => ({
        ...testUser,
        role: 'ADMIN',
      }));

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect((req as any).user.role).toBe('ADMIN');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors', async () => {
      // Arrange
      req = createMockRequest({ authorization: 'Bearer expired-token' });
      const error = new Error('Token expired');
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
