import type { Request, Response, NextFunction } from '../../express-augmentations.js';
import type { Logger } from '@nestjs/common';
import type { ErrorType } from './error-handler.middleware';
import { errorHandlerMiddleware, createApiError, asyncHandler } from './error-handler.middleware';
describe('Error Handler Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let mockLogger: Partial<Logger>;
    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            headersSent: false
        };
        mockNext = jest.fn();
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn()
        };
    });
    describe('errorHandlerMiddleware', () => {
        it('should handle ApiError correctly', () => {
            const middleware = errorHandlerMiddleware(mockLogger as Logger);
            const apiError = createApiError(ErrorType.BAD_REQUEST, 'Invalid input');
            middleware(apiError, mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid input',
                details: undefined
            });
            expect(mockLogger.warn).toHaveBeenCalled();
        });
        it('should handle standard Error as internal server error', () => {
            const middleware = errorHandlerMiddleware(mockLogger as Logger);
            const error = new Error('Something went wrong');
            middleware(error, mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Something went wrong'
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
        it('should call next if headers already sent', () => {
            const middleware = errorHandlerMiddleware(mockLogger as Logger);
            const error = new Error('Something went wrong');
            mockResponse.headersSent = true;
            middleware(error, mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });
    describe('createApiError', () => {
        it('should create an ApiError with the correct structure', () => {
            const error = createApiError(ErrorType.NOT_FOUND, 'Resource not found', { id: '123' });
            expect(error).toEqual({
                type: ErrorType.NOT_FOUND,
                message: 'Resource not found',
                details: { id: '123' }
            });
        });
    });
    describe('asyncHandler', () => {
        it('should call the handler function and not call next on success', async () => {
            const handler = jest.fn().mockResolvedValue('success');
            const wrappedHandler = asyncHandler(handler, mockLogger as Logger);
            await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);
            expect(handler).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should catch errors and call next with ApiError', async () => {
            const error = new Error('Something went wrong');
            const handler = jest.fn().mockRejectedValue(error);
            const wrappedHandler = asyncHandler(handler, mockLogger as Logger);
            await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);
            expect(handler).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
            const nextArg = mockNext.mock.calls[0][0];
            expect(nextArg).toHaveProperty('type', ErrorType.INTERNAL_SERVER_ERROR);
            expect(nextArg).toHaveProperty('message', 'Something went wrong');
        });
        it('should pass through existing ApiErrors', async () => {
            const apiError = createApiError(ErrorType.FORBIDDEN, 'Access denied');
            const handler = jest.fn().mockRejectedValue(apiError);
            const wrappedHandler = asyncHandler(handler, mockLogger as Logger);
            await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(apiError);
        });
    });
});
