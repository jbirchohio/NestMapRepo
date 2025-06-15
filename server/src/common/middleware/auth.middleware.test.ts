import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
import { 
  requireAuth, 
  requireOrgContext, 
  requireAdmin,
  requireSuperAdmin,
  requireOwnership
} from './auth.middleware';
import { ErrorType } from './error-handler.middleware';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-123',
        organizationId: 42,
        role: 'user'
      }
    };
    mockResponse = {};
    mockNext = jest.fn();
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  describe('requireAuth', () => {
    it('should call next() when user is authenticated', () => {
      const middleware = requireAuth(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireAuth(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.UNAUTHORIZED,
          message: 'Authentication required'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('requireOrgContext', () => {
    it('should call next() when user has organization context', () => {
      const middleware = requireOrgContext(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user has no organization context', () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      const middleware = requireOrgContext(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.BAD_REQUEST,
          message: 'Organization context required'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should call next() when user is admin', () => {
      mockRequest.user = { id: 'admin-123', role: 'admin', organizationId: 42 };
      const middleware = requireAdmin(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when user is superadmin', () => {
      mockRequest.user = { id: 'superadmin-123', role: 'superadmin', organizationId: 42 };
      const middleware = requireAdmin(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user is not admin', () => {
      mockRequest.user = { id: 'user-123', role: 'user', organizationId: 42 };
      const middleware = requireAdmin(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.FORBIDDEN,
          message: 'Admin access required'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should call next() when user is superadmin', () => {
      mockRequest.user = { id: 'superadmin-123', role: 'superadmin', organizationId: 42 };
      const middleware = requireSuperAdmin(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user is not superadmin', () => {
      mockRequest.user = { id: 'admin-123', role: 'admin', organizationId: 42 };
      const middleware = requireSuperAdmin(mockLogger as Logger);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.FORBIDDEN,
          message: 'Superadmin access required'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should call next() when user is the owner', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue('user-123');
      const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when user is admin', async () => {
      mockRequest.user = { id: 'admin-123', role: 'admin', organizationId: 42 };
      const getResourceOwnerId = jest.fn().mockResolvedValue('other-user-456');
      const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(getResourceOwnerId).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user is not the owner', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue('other-user-456');
      const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.FORBIDDEN,
          message: 'You do not have permission to access this resource'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should call next with error when resource owner ID is undefined', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue(undefined);
      const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.NOT_FOUND,
          message: 'Resource not found'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle errors in the getResourceOwnerId function', async () => {
      const error = new Error('Database error');
      const getResourceOwnerId = jest.fn().mockRejectedValue(error);
      const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'An error occurred while validating resource ownership'
        })
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
