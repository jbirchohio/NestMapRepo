import { Router, Response, NextFunction, Request as ExpressRequest, RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
import type { AuthUser } from '../types/auth-user.js';
import type { CustomRequest } from '@shared/types/custom-express';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller.js';
import { JwtAuthService } from './services/jwtAuthService.js';
import { UserRepositoryImpl } from './repositories/user.repository.js';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository.js';
import { NodemailerEmailService } from '../email/services/nodemailer-email.service.js';
import { ErrorService } from '../common/services/error.service.js';
import { validateAndSanitizeRequest } from '@shared/middleware/inputValidation';
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, refreshTokenSchema, logoutSchema } from './dtos/auth.dto.js';
import { authenticate } from '@shared/middleware/secureAuth';

// Helper type to make certain properties required
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Import ParsedQs from express-serve-static-core
import { type ParsedQs } from 'qs.js';

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
type ControllerMethod = Array<RequestHandler>;

// Use the existing type declarations from @types/express

const router = Router();

// Initialize services and controllers
const configService = new ConfigService();
const userRepository = new UserRepositoryImpl();
const refreshTokenRepository = new RefreshTokenRepositoryImpl();
const emailService = new NodemailerEmailService(configService, new ErrorService());

const authService = new JwtAuthService(
  userRepository,
  refreshTokenRepository,
  configService,
  emailService
);

const authController = new AuthController(authService);

// Helper function to properly type our route handlers
const createRouteHandler = (
  handler: (req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>
): RequestHandler => {
  return (async (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
      const processedReq = ensureRequestProperties(req);
      await handler(processedReq, res, next);
    } catch (error) {
      next(error);
    }
  });
};

// Type for controller method that can be single or array of handlers
type ControllerMethod = 
  | ((req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>)
  | Array<(req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>>;

// Helper to create route handlers with validation
const createValidatedRoute = (
  path: string,
  method: 'get' | 'post' | 'put' | 'delete',
  controllerMethod: ControllerMethod,
  validationSchema?: any
) => {
  const handlers = Array.isArray(controllerMethod) 
    ? controllerMethod 
    : [controllerMethod];
  
  const routeHandlers: RequestHandler[] = [];
  
  // Add validation middleware if schema is provided
  if (validationSchema) {
    routeHandlers.push((req, res, next) => {
      const processedReq = ensureRequestProperties(req);
      return validateAndSanitizeRequest(validationSchema)(processedReq, res, next);
    });
  }
  
  // Add the controller handlers
  routeHandlers.push(...handlers.map(handler => 
    createRouteHandler(handler)
  ));
  
  // Apply the route with all handlers
  router[method](path, ...routeHandlers);
};

// Public routes
createValidatedRoute('/login', 'post', authController.login, { body: loginSchema });
createValidatedRoute('/refresh-token', 'post', authController.refreshToken, { body: refreshTokenSchema });
createValidatedRoute('/request-password-reset', 'post', authController.requestPasswordReset, { body: requestPasswordResetSchema });
createValidatedRoute('/reset-password', 'post', authController.resetPassword, { body: resetPasswordSchema });

// Protected routes
router.use((req, res, next) => {
  const processedReq = ensureRequestProperties(req);
  return authenticate(processedReq, res, next);
});

// Protected routes that require authentication
createValidatedRoute('/logout', 'post', authController.logout, { body: logoutSchema });

// Logout all devices route
const logoutAllDevicesHandlers = Array.isArray(authController.logoutAllDevices)
  ? authController.logoutAllDevices
  : [authController.logoutAllDevices];

// Create logout all route handlers with proper typing
const logoutAllRouteHandlers: RequestHandler[] = [
  ...logoutAllDevicesHandlers.map(handler => 
    createRouteHandler(handler as (req: ExpressRequest, res: Response, next: NextFunction) => Promise<void>)
  )
];

router.post('/logout-all', ...logoutAllRouteHandlers);

// Health check endpoint
router.get('/health', (_req: ExpressRequest, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as authRouter };
