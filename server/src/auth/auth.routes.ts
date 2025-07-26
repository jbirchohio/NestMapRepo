import express from 'express';
import type { Response, NextFunction, Request as ExpressRequest, RequestHandler } from 'express';
import { AuthController } from './controllers/auth.controller';
// Import validation schemas
import { 
  loginSchema, 
  refreshTokenSchema, 
  requestPasswordResetSchema, 
  resetPasswordSchema, 
  logoutSchema 
} from './validation/auth.schemas';
import { validateRequest, type ValidationSchema } from './middleware/validation.middleware';
import { authenticate } from '../middleware/authenticate';
import { JwtAuthService } from './services/jwtAuthService';

// Define handler function type
type HandlerFunction = (req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>;

// Define middleware type
type RouteMiddleware = RequestHandler[] | RequestHandler;

// We use the user property directly from the request object
// The authenticate middleware adds this property

// Helper function to ensure request has required properties
const ensureRequestProperties = (req: ExpressRequest): ExpressRequest => {
  // Ensure our custom properties exist with the correct types
  const reqWithCookies = req as ExpressRequest & {
    cookies: Record<string, string>;
    signedCookies: Record<string, string>;
  };

  if (!reqWithCookies.cookies) {
    reqWithCookies.cookies = {};
  }
  
  if (!reqWithCookies.signedCookies) {
    reqWithCookies.signedCookies = {};
  }
  
  return reqWithCookies;
};

// Create Express Router instance
const router = (express as any).Router();

// Initialize services and controllers
const authService = new JwtAuthService();
const authController = new AuthController(authService);

// Helper function to properly type our route handlers
const createRouteHandler = (
  handler: HandlerFunction
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

// Helper to create route handlers with validation
const createValidatedRoute = (
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  validationSchema: ValidationSchema | null,
  handlers: HandlerFunction | Array<HandlerFunction>,
  middlewares: RouteMiddleware = []
): void => {
  const handlerArray = Array.isArray(handlers) ? handlers : [handlers];
  // Convert all handlers to route handlers
  const routeHandlers: Array<RequestHandler> = Array.isArray(middlewares) ? [...middlewares] : [middlewares]; 
  
  // Add validation middleware if schema is provided
  if (validationSchema) {
    // Create properly typed middleware handler
    const validationMiddleware: RequestHandler = (req, res, next) => {
      const processedReq = ensureRequestProperties(req);
      validateRequest(validationSchema)(processedReq, res, next);
    };
    
    routeHandlers.push(validationMiddleware);
  }
  
  // Add the controller handlers
  handlerArray.forEach(handler => {
    routeHandlers.push(createRouteHandler(handler));
  });
  
  // Apply the route with all handlers
  if (method === 'get') router.get(path, ...routeHandlers);
  else if (method === 'post') router.post(path, ...routeHandlers);
  else if (method === 'put') router.put(path, ...routeHandlers);
  else if (method === 'delete') router.delete(path, ...routeHandlers);
};

// Public routes
createValidatedRoute('post', '/login', loginSchema, authController.login.bind(authController));
createValidatedRoute('post', '/refresh-token', refreshTokenSchema, authController.refreshToken.bind(authController));
createValidatedRoute('post', '/request-password-reset', requestPasswordResetSchema, authController.requestPasswordReset.bind(authController));
createValidatedRoute('post', '/reset-password', resetPasswordSchema, authController.resetPassword.bind(authController));

// Protected routes
router.use((req, res, next) => {
  const processedReq = ensureRequestProperties(req);
  return authenticate(processedReq, res, next);
});

// Protected routes that require authentication
createValidatedRoute('post', '/logout', logoutSchema, authController.logout.bind(authController));

// Bind the logout all devices method and create a route handler
const logoutAllHandler = createRouteHandler(authController.logoutAllDevices.bind(authController));
router.post('/logout-all', logoutAllHandler);

// Health check endpoint
router.get('/health', (_req: ExpressRequest, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as authRouter };

