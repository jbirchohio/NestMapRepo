import { Router, Response, NextFunction, Request as ExpressRequest, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthUser } from '../types/auth-user.js';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthService } from './services/jwtAuthService';
import { UserRepositoryImpl } from './repositories/user.repository';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository';
import { NodemailerEmailService } from '../email/services/nodemailer-email.service';
import { ErrorService } from '../common/services/error.service';
import { validateAndSanitizeRequest } from '../../middleware/inputValidation';
import { authenticate } from '../../middleware/secureAuth';
import { 
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto
} from '@shared/types/auth/dto';
// Helper type to make certain properties required
type WithRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
// Import ParsedQs from express-serve-static-core
import { type ParsedQs } from 'qs';
// Use a more flexible type for query parameters that's compatible with Express
type QueryParams = ParsedQs & {
    [key: string]: string | string[] | ParsedQs | ParsedQs[] | undefined;
};
// Type for our request with custom properties
type CustomRequest = ExpressRequest;
// Helper function to ensure request has required properties
const ensureRequestProperties = (req: ExpressRequest): ExpressRequest => {
    // Ensure our custom properties exist with the correct types
    if (!('cookies' in req)) {
        (req as any).cookies = {};
    }
    if (!('signedCookies' in req)) {
        (req as any).signedCookies = {};
    }
    return req;
};
// Type for controller methods that return an array of handlers

// Use the existing type declarations from @types/express
const router = Router();
// Initialize services and controllers
const configService = new ConfigService();
const userRepository = new UserRepositoryImpl();
const refreshTokenRepository = new RefreshTokenRepositoryImpl();
const emailService = new NodemailerEmailService(configService, new ErrorService());
const authService = new JwtAuthService(userRepository, refreshTokenRepository, configService, emailService);
const authController = new AuthController(authService);
// Helper to create route handlers with validation
const createValidatedRoute = (path: string, method: 'get' | 'post' | 'put' | 'delete', handler: RequestHandler | RequestHandler[], validationSchema?: any) => {
    const handlers = Array.isArray(handler) ? handler : [handler];
    const routeHandlers: RequestHandler[] = [];

    // Add validation middleware if schema is provided
    if (validationSchema) {
        routeHandlers.push(validateAndSanitizeRequest(validationSchema));
    }

    // Add the controller handlers
    routeHandlers.push(...handlers);

    // Apply the route with all handlers
    router[method](path, ...routeHandlers);
};
// Public routes
createValidatedRoute('/login', 'post', authController.login, { 
  body: LoginDto
});

createValidatedRoute('/register', 'post', authController.register, {
  body: RegisterDto
});

createValidatedRoute('/refresh-token', 'post', authController.refreshToken, { 
  body: {
    refreshToken: 'string:required'
  }
});

createValidatedRoute('/request-password-reset', 'post', authController.requestPasswordReset, { 
  body: RequestPasswordResetDto
});

createValidatedRoute('/reset-password', 'post', authController.resetPassword, { 
  body: ResetPasswordDto
});
// Protected routes
router.use((req, res, next) => {
    const processedReq = ensureRequestProperties(req);
    return authenticate(processedReq, res, next);
});
// Protected routes that require authentication
createValidatedRoute('/logout', 'post', authController.logout, { 
  body: {
    refreshToken: 'string:required'
  }
});

createValidatedRoute('/change-password', 'post', authController.changePassword, {
  body: ChangePasswordDto
});
// Logout all devices route
const logoutAllDevicesHandlers = Array.isArray(authController.logoutAllDevices)
    ? authController.logoutAllDevices
    : [authController.logoutAllDevices];
// Create logout all route handlers with proper typing
const logoutAllRouteHandlers: RequestHandler[] = [
    ...logoutAllDevicesHandlers.map(handler => createRouteHandler(handler as (req: ExpressRequest, res: Response, next: NextFunction) => Promise<void>))
];
router.post('/logout-all', ...logoutAllRouteHandlers);
// Health check endpoint
router.get('/health', (_req: ExpressRequest, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
export { router as authRouter };
