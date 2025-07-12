// Local type definitions to avoid external dependencies
interface Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
    [key: string]: any;
  };
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, string | string[]>;
  path?: string;
  ip?: string;
}

interface Response {
  status(code: number): Response;
  json(data: any): Response;
  send(data: any): Response;
}

interface NextFunction {
  (error?: any): void;
}

// Extend the Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
    [key: string]: any;
  };
}

// Simple logger interface
interface Logger {
  warn(message: string): void;
  error(message: string, error?: any): void;
  log(message: string): void;
}

// Simple error creation function
function createApiError(type: string, message: string) {
  const error = new Error(message);
  error.name = type;
  return error;
}

const ErrorType = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

/**
 * Middleware to ensure user is authenticated
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireAuth = (logger: Logger) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authentication required but no user found in request');
      next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
      return;
    }
    next();
  };
};

/**
 * Middleware to ensure user has a valid organization context
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireOrgContext = (logger: Logger) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user?.organizationId) {
      logger.warn('Organization context required but not found in user context');
      next(createApiError(ErrorType.BAD_REQUEST, 'Organization context required'));
      return;
    }
    next();
  };
};

/**
 * Middleware to ensure user has admin role
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireAdmin = (logger: Logger) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authentication required but no user found in request');
      next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
      return;
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      logger.warn(`User ${req.user.id} attempted to access admin-only resource`);
      next(createApiError(ErrorType.FORBIDDEN, 'Admin access required'));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to ensure user has superadmin role
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireSuperAdmin = (logger: Logger) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authentication required but no user found in request');
      next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
      return;
    }
    
    if (req.user.role !== 'superadmin') {
      logger.warn(`User ${req.user.id} attempted to access superadmin-only resource`);
      next(createApiError(ErrorType.FORBIDDEN, 'Superadmin access required'));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate resource ownership
 * @param getResourceOwnerId Function to extract owner ID from request
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireOwnership = (
  getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | undefined>,
  logger: Logger
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        logger.warn('Authentication required but no user found in request');
        next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
        return;
      }
      
      // Skip ownership check for admins and superadmins
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
        return;
      }
      
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        logger.warn('Resource owner ID could not be determined');
        next(createApiError(ErrorType.NOT_FOUND, 'Resource not found'));
        return;
      }
      
      if (ownerId !== req.user.id) {
        logger.warn(`User ${req.user.id} attempted to access resource owned by ${ownerId}`);
        next(createApiError(ErrorType.FORBIDDEN, 'You do not have permission to access this resource'));
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Error in ownership validation middleware', error);
      next(createApiError(ErrorType.INTERNAL_SERVER_ERROR, 'An error occurred while validating resource ownership'));
    }
  };
};
