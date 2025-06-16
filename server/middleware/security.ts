import { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { logger } from '../utils/logger';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organization_id: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * SQL injection prevention middleware
 * Validates and sanitizes database queries
 */
export function preventSQLInjection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Common SQL injection patterns
    const sqlInjectionPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
      /(\%27)|(\')|(\%27)|(\")/g,
      /(\%27|\%3D|\/|\*\/|\;|\+|\-|\*|\/\*|\*\/|\%20|\s)*(and|or|exec|insert|select|delete|update|count|drop|union|create|alter|truncate|declare|if|case|when|then|else|end|waitfor|delay)\b/gi,
      /(\s|\*|\+|\-|\/|\%|\=)+\s*\d+\s*(\s|;|$|--|#|\/\*|\*\/|\))/gi,
    ];

    function checkForInjection(input: unknown): boolean {
      if (!input) return false;
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      return sqlInjectionPatterns.some(pattern => pattern.test(inputStr));
    }

    // Check request body, query, and params for SQL injection patterns
    if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
      logger.warn('Potential SQL injection attempt detected', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString(),
        userAgent: req.get('user-agent'),
      });
      
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Suspicious input detected',
        },
      });
      return;
    }
    next();
  } catch (error) {
    logger.error('Error in SQL injection prevention middleware', { error });
    next(error);
  }
}

/**
 * Organization security middleware
 * Ensures users can only access resources within their own organization
 */
export function enforceOrganizationSecurity(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userOrgId = req.user?.organizationId;
    const requestedOrgId = req.params.organizationId || req.body.organizationId;

    // Skip if no organization ID is being requested
    if (!requestedOrgId) {
      return next();
    }

    // If user has no organization or is trying to access a different organization
    if (!userOrgId || userOrgId !== requestedOrgId) {
      logger.warn('Unauthorized organization access attempt', {
        userId: req.user?.id,
        userOrgId,
        requestedOrgId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
      
      res.status(403).json({ 
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access to this organization is forbidden',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in organization security middleware', { error });
    next(error);
  }
}

/**
 * Configures CORS (Cross-Origin Resource Sharing) for the application.
 * @param app The Express application instance.
 */
export function configureCORS(app: Application): void {
  // Define your CORS options
  // Example: Allow requests from 'http://localhost:3001' and 'https://your-frontend-domain.com'
  const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://app.nestmap.com'], // Add your frontend origins here
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  logger.info('CORS middleware configured.');
}

// Export the middleware functions
export default {
  preventSQLInjection,
  enforceOrganizationSecurity,
  configureCORS,
};