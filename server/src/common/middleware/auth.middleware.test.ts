import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
import type { Logger } from '@nestjs/common';
// Define the user type
export interface AuthUser {
    id: string;
    organizationId: string | number;
    role: string;
    email: string;
}
// Extend the Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
import { requireAuth, requireOrgContext, requireAdmin, requireSuperAdmin, requireOwnership } from './auth.middleware';
import type { ErrorType } from '../types/error.types.ts';
describe('Auth Middleware', () => {
    // Base user for testing
    const baseUser: AuthUser = {
        id: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'user',
        email: 'test@example.com'
    };
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let mockLogger: Partial<Logger>;
    beforeEach(() => {
        // Mock request with user
        mockRequest = {
            user: { ...baseUser },
            method: 'GET',
            url: '/test',
            headers: {},
            params: {},
            query: {},
            body: {}
        };
        ;
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
        mockNext = jest.fn();
        mockLogger = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };
        // Ensure user property exists and has required fields
        if (mockRequest.user) {
            mockRequest.user = { ...baseUser, ...mockRequest.user };
        }
    });
    describe('requireAuth', () => {
        it('should call next() if user is authenticated', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    id: 'test-user-id',
                    organizationId: 'test-org-id',
                    role: 'user',
                    email: 'test@example.com'
                }
            } as Request;
            const middleware = requireAuth(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should return 401 if user is not authenticated', () => {
            // Create a new request without user
            const testRequest = {
                ...mockRequest,
                user: undefined
            } as Request;
            const middleware = requireAuth(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.UNAUTHORIZED,
                message: 'Authentication required'
            }));
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
    describe('requireOrgContext', () => {
        it('should call next() when user has organization context', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    ...baseUser,
                    id: 'test-user-id',
                    organizationId: 'test-org-id',
                    role: 'user',
                    email: 'test@example.com'
                }
            } as Request;
            const middleware = requireOrgContext(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should return 403 when user does not have organization context', () => {
            // Create a test user with organizationId as undefined to test the error case
            const testRequest = {
                ...mockRequest,
                user: {
                    ...baseUser,
                    organizationId: undefined,
                    email: 'test@example.com'
                }
            } as Request;
            const middleware = requireOrgContext(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.FORBIDDEN,
                message: 'Organization context required'
            }));
        });
        it('should call next with error when user has no organization context', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    ...baseUser,
                    organizationId: undefined
                }
            } as Request;
            const middleware = requireOrgContext(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.BAD_REQUEST,
                message: 'Organization context required'
            }));
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
    describe('requireAdmin', () => {
        it('should call next() when user has admin role', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    ...baseUser,
                    role: 'admin'
                }
            } as Request;
            const middleware = requireAdmin(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should call next() when user has superadmin role', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    ...baseUser,
                    role: 'superadmin'
                }
            } as Request;
            const middleware = requireAdmin(mockLogger as Logger);
            middleware(testRequest, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should call next with error when user does not have admin role', () => {
            const testRequest = {
                ...mockRequest,
                user: {
                    ...mockRequest.user!,
                    role: 'user'
                }
            };
            const middleware = requireAdmin(mockLogger as Logger);
            middleware(testRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.FORBIDDEN,
                message: 'Admin access required'
            }));
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
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.FORBIDDEN,
                message: 'Superadmin access required'
            }));
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
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.FORBIDDEN,
                message: 'You do not have permission to access this resource'
            }));
            expect(mockLogger.warn).toHaveBeenCalled();
        });
        it('should call next with error when resource owner ID is undefined', async () => {
            const getResourceOwnerId = jest.fn().mockResolvedValue(undefined);
            const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.NOT_FOUND,
                message: 'Resource not found'
            }));
            expect(mockLogger.warn).toHaveBeenCalled();
        });
        it('should handle errors in the getResourceOwnerId function', async () => {
            const error = new Error('Database error');
            const getResourceOwnerId = jest.fn().mockRejectedValue(error);
            const middleware = requireOwnership(getResourceOwnerId, mockLogger as Logger);
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                type: ErrorType.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while validating resource ownership'
            }));
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
