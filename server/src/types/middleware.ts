import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { User } from './express.d.ts';

// Extend the Express Request type with our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiVersion?: string;
      apiKeyAuth?: {
        organizationId: string; // Changed from number to string for consistency
        permissions: string[];
        rateLimit: number;
      };
      organizationId?: string;
      organizationFilter?: (orgId: string | null) => boolean;
      [key: string]: any; // For any additional properties
    }
  }
}

export interface SecureRequest extends Request {
  user?: User;
  apiVersion?: string;
  apiKeyAuth?: {
    organizationId: string;
    permissions: string[];
    rateLimit: number;
  };
  organizationId?: string;
  organizationFilter?: (orgId: string | null) => boolean;
}

export type SecureRequestHandler = RequestHandler & {
  (req: SecureRequest, res: Response, next: NextFunction): void | Promise<void>;
};

export type Middleware = RequestHandler;
